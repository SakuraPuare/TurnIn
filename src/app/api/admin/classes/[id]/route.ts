import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { removeStoredFiles } from "@/lib/fileStorage";

// Schema for class validation
const classSchema = z.object({
  name: z.string().min(1, "班级名称不能为空"),
  description: z.string().optional(),
});

// GET /api/admin/classes/[id] - Get a specific class (admin view)
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

// DELETE /api/admin/classes/[id] - Delete a class (admin only)
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
