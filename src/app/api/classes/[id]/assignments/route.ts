import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * [STU-01] 学生端作业聚合接口
 *
 * 设计意图：
 * - 学生首页不是简单读取作业表，而是要把“班级范围作业 + 动态字段 + 个人最新提交”一次聚合出来。
 * - 这样前端只需要一个接口就能渲染作业卡片和个人状态，减少多次往返请求。
 *
 * 文档映射：
 * - docs/api-interface-specification.md
 * - docs/software-design-specification.md
 * - docs/module-feature-matrix.md
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const classId = params.id;
    const studentRecordId = request.nextUrl.searchParams.get("studentId");

    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "班级不存在" }, { status: 404 });
    }

    let studentAcademicId: string | null = null;

    // 学生端允许“先选班级再看作业”，只有选择具体学生后才附带个人提交状态。
    if (studentRecordId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentRecordId,
          classId,
        },
        select: {
          studentId: true,
        },
      });

      if (!student) {
        return NextResponse.json({ error: "学生不存在" }, { status: 404 });
      }

      studentAcademicId = student.studentId;
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        classes: {
          some: {
            id: classId,
          },
        },
      },
      include: {
        requiredFields: {
          orderBy: {
            createdAt: "asc",
          },
        },
        submissions: studentAcademicId
          ? {
              where: {
                studentId: studentAcademicId,
              },
              orderBy: {
                updatedAt: "desc",
              },
              take: 1,
            }
          : false,
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    });

    const response = assignments.map((assignment) => {
      // 每个学生对同一作业只有一条当前提交记录，因此只取最新一条即可驱动学生端展示。
      const submission =
        studentAcademicId && Array.isArray(assignment.submissions)
          ? assignment.submissions[0] || null
          : null;

      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline,
        status: assignment.status,
        fileNameFormat: assignment.fileNameFormat,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        requiredFields: assignment.requiredFields,
        submission,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching class assignments:", error);
    return NextResponse.json({ error: "获取作业列表失败" }, { status: 500 });
  }
}
