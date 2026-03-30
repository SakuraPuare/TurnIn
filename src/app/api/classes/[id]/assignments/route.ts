import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
