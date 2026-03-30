import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { removeStoredFiles } from "@/lib/fileStorage";

// Schema for class validation
const classSchema = z.object({
  name: z.string().min(1, "班级名称不能为空"),
  description: z.string().optional(),
});

/**
 * [CLS-01] 班级详情与作业进度聚合接口
 *
 * 设计意图：
 * - 班级详情页要同时看到学生列表和作业进度，不能要求前端分别再聚合统计。
 * - 该接口直接输出“预计人数、已提交、待审核、审核通过、退回修改、最近提交时间”等教学管理指标。
 *
 * 运行逻辑：
 * 1. 查询班级、学生和已分配作业
 * 2. 批量查询该班级相关提交
 * 3. 按作业维度聚合统计进度指标
 *
 * 文档映射：
 * - docs/software-design-specification.md
 * - docs/database-design-specification.md
 * - docs/module-feature-matrix.md
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const classId = params.id;
    
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          orderBy: {
            studentId: "asc",
          },
        },
        assignments: {
          orderBy: [
            {
              deadline: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
          include: {
            _count: {
              select: {
                requiredFields: true,
              },
            },
          },
        },
        _count: {
          select: { students: true }
        }
      },
    });
    
    if (!classData) {
      return NextResponse.json(
        { error: "班级不存在" },
        { status: 404 }
      );
    }

    const assignmentIds = classData.assignments.map((assignment) => assignment.id);
    const submissions = assignmentIds.length > 0
      ? await prisma.submission.findMany({
          where: {
            assignmentId: {
              in: assignmentIds,
            },
            student: {
              classId,
            },
          },
          select: {
            assignmentId: true,
            studentId: true,
            status: true,
            updatedAt: true,
          },
        })
      : [];

    const assignmentProgress = classData.assignments.map((assignment) => {
      // 这里按作业维度做聚合，而不是把统计留给前端，是为了保证指标口径在后台唯一。
      const assignmentSubmissions = submissions.filter(
        (submission) => submission.assignmentId === assignment.id,
      );

      const latestSubmissionAt = assignmentSubmissions.reduce<Date | null>(
        (latest, submission) =>
          !latest || submission.updatedAt > latest ? submission.updatedAt : latest,
        null,
      );

      return {
        id: assignment.id,
        title: assignment.title,
        deadline: assignment.deadline,
        status: assignment.status,
        fileNameFormat: assignment.fileNameFormat,
        requiredFieldCount: assignment._count.requiredFields,
        submittedCount: assignmentSubmissions.length,
        completedCount: assignmentSubmissions.filter((item) => item.status === "completed").length,
        pendingCount: assignmentSubmissions.filter((item) => item.status === "pending").length,
        failedCount: assignmentSubmissions.filter((item) => item.status === "failed").length,
        expectedCount: classData.students.length,
        latestSubmissionAt,
      };
    });
    
    return NextResponse.json({
      ...classData,
      assignmentProgress,
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json(
      { error: "获取班级信息失败" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/classes/[id] - Update a class (admin only)
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const classId = params.id;
    const body = await request.json();
    
    // Validate input
    const validatedData = classSchema.parse(body);
    
    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!existingClass) {
      return NextResponse.json(
        { error: "班级不存在" },
        { status: 404 }
      );
    }
    
    // Check if name is being changed and if it conflicts with another class
    if (validatedData.name !== existingClass.name) {
      const nameConflict = await prisma.class.findUnique({
        where: { name: validatedData.name },
      });
      
      if (nameConflict) {
        return NextResponse.json(
          { error: "班级名称已存在" },
          { status: 400 }
        );
      }
    }
    
    // Update class
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: validatedData,
    });
    
    return NextResponse.json(updatedClass);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error updating class:", error);
    return NextResponse.json(
      { error: "更新班级失败" },
      { status: 500 }
    );
  }
}

/**
 * [CLS-02] 班级删除的附件清理策略
 *
 * 设计意图：
 * - 班级删除不仅是数据库级联删除，还必须把该班级学生已经上传的附件清掉。
 * - 否则班级业务对象已经不存在，磁盘中仍会保留不可追踪的教学材料副本。
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const classId = params.id;
    
    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!existingClass) {
      return NextResponse.json(
        { error: "班级不存在" },
        { status: 404 }
      );
    }

    const submissions = await prisma.submission.findMany({
      where: {
        student: {
          classId,
        },
      },
      select: {
        fileUrl: true,
      },
    });

    await removeStoredFiles(submissions.map((item) => item.fileUrl));
    
    // Delete class (cascade will delete related students)
    await prisma.class.delete({
      where: { id: classId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "删除班级失败" },
      { status: 500 }
    );
  }
} 
