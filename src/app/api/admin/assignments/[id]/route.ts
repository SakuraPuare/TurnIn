import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { removeStoredFiles } from "@/lib/fileStorage";

const requiredFieldSchema = z
  .object({
    name: z.string().trim().min(1, "字段标识不能为空"),
    label: z.string().trim().min(1, "字段名称不能为空"),
    type: z.enum(["text", "number", "select"]),
    description: z.string().optional(),
    options: z.string().nullable().optional(),
    required: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "select" && !value.options) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "下拉字段至少需要一个选项",
        path: ["options"],
      });
    }
  });

const assignmentSchema = z.object({
  title: z.string().trim().min(1, "作业标题不能为空"),
  description: z.string().optional(),
  deadline: z
    .string()
    .min(1, "截止时间不能为空")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "截止时间格式不正确"),
  status: z.enum(["active", "closed"]),
  fileNameFormat: z.string().trim().min(1, "文件命名格式不能为空"),
  classIds: z.array(z.string()).min(1, "至少选择一个班级"),
  requiredFields: z.array(requiredFieldSchema).default([]),
});

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
          },
        },
        requiredFields: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            submissions: true,
            requiredFields: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "作业不存在" }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json({ error: "获取作业信息失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const body = await request.json();
    const validatedData = assignmentSchema.parse(body);
    const classIds = [...new Set(validatedData.classIds)];
    const duplicateFieldName = validatedData.requiredFields.find(
      (field, index, array) => array.findIndex((item) => item.name === field.name) !== index,
    );

    if (duplicateFieldName) {
      return NextResponse.json(
        { error: `字段标识重复：${duplicateFieldName.name}` },
        { status: 400 },
      );
    }

    const requiredFields = validatedData.requiredFields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      description: field.description?.trim() || null,
      options: field.options || null,
      required: field.required,
    }));

    const [existingAssignment, classCount] = await Promise.all([
      prisma.assignment.findUnique({
        where: { id: params.id },
      }),
      prisma.class.count({
        where: {
          id: {
            in: classIds,
          },
        },
      }),
    ]);

    if (!existingAssignment) {
      return NextResponse.json({ error: "作业不存在" }, { status: 404 });
    }

    if (classCount !== classIds.length) {
      return NextResponse.json({ error: "所选班级不存在" }, { status: 400 });
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: params.id },
      data: {
        title: validatedData.title,
        description: validatedData.description?.trim() || null,
        deadline: new Date(validatedData.deadline),
        status: validatedData.status,
        fileNameFormat: validatedData.fileNameFormat.trim(),
        classes: {
          set: classIds.map((id) => ({ id })),
        },
        requiredFields: {
          deleteMany: {},
          create: requiredFields,
        },
      },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
          },
        },
        requiredFields: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            submissions: true,
            requiredFields: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating assignment:", error);
    return NextResponse.json({ error: "更新作业失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: params.id },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: "作业不存在" }, { status: 404 });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId: params.id,
      },
      select: {
        fileUrl: true,
      },
    });

    await removeStoredFiles(submissions.map((item) => item.fileUrl));

    await prisma.assignment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json({ error: "删除作业失败" }, { status: 500 });
  }
}
