import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildExpectedFileBase,
  normalizeFileNamePart,
  validateSubmissionPayload,
} from "@/lib/submission";
import { removeStoredFile } from "@/lib/fileStorage";
import fs from "fs/promises";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * [SUB-04] 学生提交流水的表单解包器
 *
 * 设计意图：
 * - 前端通过 multipart/form-data 同时传文件和结构化字段，接口层需要先把 JSON 字段还原。
 * - 这里把“解析失败”和“字段为空对象”区分开，便于后续返回更明确的错误。
 */
function safeParseFormData(rawValue: string | null) {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")]),
    );
  } catch (_error) {
    return null;
  }
}

/**
 * [SUB-05] 学生作业提交接口
 *
 * 设计意图：
 * - 该接口是系统最核心的业务入口，负责把“班级归属校验、命名规则校验、动态字段校验、附件写入、提交状态重置”
 *   串成一次原子化业务操作。
 * - 学生每次更新提交后都会把状态打回 pending，确保审核结果总是对应最新内容。
 *
 * 运行流程：
 * 1. 解析 multipart/form-data
 * 2. 并行读取作业定义和学生身份
 * 3. 校验班级覆盖关系、作业状态和动态字段
 * 4. 校验并落盘附件
 * 5. upsert 提交记录并重置审核状态
 *
 * 文档映射：
 * - docs/api-interface-specification.md
 * - docs/software-design-specification.md
 * - docs/test-and-acceptance-specification.md
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const form = await request.formData();
    const studentRecordId = String(form.get("studentId") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const parsedFormData = safeParseFormData(String(form.get("formData") || "{}"));
    const upload = form.get("file");

    if (!studentRecordId) {
      return NextResponse.json({ error: "学生信息缺失" }, { status: 400 });
    }

    if (!parsedFormData) {
      return NextResponse.json({ error: "提交表单格式不正确" }, { status: 400 });
    }

    const [assignment, student] = await Promise.all([
      prisma.assignment.findUnique({
        where: { id: params.id },
        include: {
          classes: {
            select: {
              id: true,
            },
          },
          requiredFields: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),
      prisma.student.findUnique({
        where: { id: studentRecordId },
        select: {
          id: true,
          name: true,
          studentId: true,
          classId: true,
        },
      }),
    ]);

    if (!assignment) {
      return NextResponse.json({ error: "作业不存在" }, { status: 404 });
    }

    if (!student) {
      return NextResponse.json({ error: "学生不存在" }, { status: 404 });
    }

    // 只有作业所覆盖班级内的学生才能提交，防止公开学生入口被跨班级滥用。
    const allowedClass = assignment.classes.some((item) => item.id === student.classId);

    if (!allowedClass) {
      return NextResponse.json({ error: "该学生不在当前作业适用范围内" }, { status: 400 });
    }

    if (assignment.status === "closed") {
      return NextResponse.json({ error: "该作业已关闭提交" }, { status: 400 });
    }

    const validatedFields = validateSubmissionPayload(assignment.requiredFields, parsedFormData);

    if (!validatedFields.ok) {
      return NextResponse.json({ error: validatedFields.error }, { status: 400 });
    }

    const existingSubmission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: student.studentId,
        },
      },
    });

    let fileUrl = existingSubmission?.fileUrl || null;

    // 附件是可选项，但一旦上传，就必须满足大小和命名约束。
    if (upload instanceof File && upload.size > 0) {
      if (upload.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "附件大小不能超过 10MB" }, { status: 400 });
      }

      const expectedBase = buildExpectedFileBase(assignment.fileNameFormat, {
        studentId: student.studentId,
        assignmentTitle: assignment.title,
      });
      const uploadedBase = normalizeFileNamePart(upload.name);

      if (expectedBase && uploadedBase !== expectedBase) {
        return NextResponse.json(
          {
            error: `文件命名不符合要求，应为 ${expectedBase} + 文件扩展名`,
          },
          { status: 400 },
        );
      }

      const extension = path.extname(upload.name);
      const storedFileName = `${student.studentId}-${assignment.id.slice(0, 8)}-${randomUUID()}${extension}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "submissions");
      const filePath = path.join(uploadDir, storedFileName);
      const buffer = Buffer.from(await upload.arrayBuffer());

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, buffer);

      // 学生覆盖提交时，新附件落盘成功后再删除旧文件，避免异常中断导致两边都丢。
      await removeStoredFile(existingSubmission?.fileUrl);

      fileUrl = `/uploads/submissions/${storedFileName}`;
    }

    const hasSubmissionContent =
      Boolean(fileUrl) ||
      Boolean(notes) ||
      Object.values(validatedFields.data).some((value) => value);

    if (!hasSubmissionContent) {
      return NextResponse.json({ error: "请至少填写一项提交内容" }, { status: 400 });
    }

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: student.studentId,
        },
      },
      create: {
        assignmentId: assignment.id,
        studentId: student.studentId,
        fileUrl,
        notes: notes || null,
        formData: JSON.stringify(validatedFields.data),
        status: "pending",
        reviewNotes: null,
        reviewedAt: null,
      },
      update: {
        fileUrl,
        notes: notes || null,
        formData: JSON.stringify(validatedFields.data),
        // 任何更新都意味着上一轮审核结论已经失效，因此统一退回待审核状态。
        status: "pending",
        reviewNotes: null,
        reviewedAt: null,
      },
    });

    return NextResponse.json({
      message: existingSubmission ? "提交已更新" : "提交成功",
      submission,
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    return NextResponse.json({ error: "提交作业失败" }, { status: 500 });
  }
}
