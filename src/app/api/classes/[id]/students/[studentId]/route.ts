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

// PUT /api/classes/[id]/students/[studentId] - Update a student
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const classId = params.id;
    const studentId = params.studentId;
    const body = await request.json();
    
    // Validate input
    const validatedData = studentSchema.parse(body);
    
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
    
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });
    
    if (!existingStudent) {
      return NextResponse.json(
        { error: "学生不存在" },
        { status: 404 }
      );
    }
    
    // If student ID is changed, check if the new ID already exists
    if (validatedData.studentId !== existingStudent.studentId) {
      const duplicateStudent = await prisma.student.findFirst({
        where: {
          AND: [
            { classId },
            { studentId: validatedData.studentId }
          ]
        },
      });
      
      if (duplicateStudent) {
        return NextResponse.json(
          { error: "该学号在此班级中已存在" },
          { status: 400 }
        );
      }
    }
    
    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: validatedData,
    });
    
    return NextResponse.json(updatedStudent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: "更新学生失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/classes/[id]/students/[studentId] - Delete a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const classId = params.id;
    const studentId = params.studentId;
    
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
    
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });
    
    if (!existingStudent) {
      return NextResponse.json(
        { error: "学生不存在" },
        { status: 404 }
      );
    }
    
    // Delete student
    await prisma.student.delete({
      where: { id: studentId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "删除学生失败" },
      { status: 500 }
    );
  }
} 