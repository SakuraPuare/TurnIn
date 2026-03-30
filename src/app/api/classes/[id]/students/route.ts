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

// POST /api/classes/[id]/students - Add a student to a class
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const classId = params.id;
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
    
    // studentId is globally unique in the schema
    const existingStudent = await prisma.student.findUnique({
      where: {
        studentId: validatedData.studentId,
      },
    });
    
    if (existingStudent) {
      return NextResponse.json(
        { error: "该学号已存在，不能重复添加" },
        { status: 400 }
      );
    }
    
    // Create new student
    const newStudent = await prisma.student.create({
      data: {
        ...validatedData,
        classId,
      },
    });
    
    return NextResponse.json(newStudent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "添加学生失败" },
      { status: 500 }
    );
  }
} 
