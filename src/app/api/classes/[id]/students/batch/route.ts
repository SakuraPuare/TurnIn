import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for student validation
const studentSchema = z.object({
  studentId: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

// Schema for batch student validation
const batchStudentSchema = z.object({
  students: z.array(studentSchema),
});

// POST /api/classes/[id]/students/batch - Batch add students to a class
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id;
    const body = await request.json();
    
    // Validate input
    const validatedData = batchStudentSchema.parse(body);
    
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
    
    // Get existing student IDs in this class
    const existingStudents = await prisma.student.findMany({
      where: { classId },
      select: { studentId: true },
    });
    
    const existingStudentIds = new Set(existingStudents.map(s => s.studentId));
    
    // Filter out duplicates
    const newStudents = validatedData.students.filter(
      student => !existingStudentIds.has(student.studentId)
    );
    
    // Count duplicates
    const duplicateCount = validatedData.students.length - newStudents.length;
    
    // If all students already exist, return early
    if (newStudents.length === 0) {
      return NextResponse.json({
        added: 0,
        duplicates: duplicateCount,
        message: "所有学生已存在于班级中",
      });
    }
    
    // Create new students
    await prisma.student.createMany({
      data: newStudents.map(student => ({
        ...student,
        classId,
      })),
    });
    
    return NextResponse.json({
      added: newStudents.length,
      duplicates: duplicateCount,
      message: `成功添加 ${newStudents.length} 名学生${duplicateCount > 0 ? `，${duplicateCount} 名学生已存在` : ''}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error batch creating students:", error);
    return NextResponse.json(
      { error: "批量添加学生失败" },
      { status: 500 }
    );
  }
} 