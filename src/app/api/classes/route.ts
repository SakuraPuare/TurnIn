import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for class validation
const classSchema = z.object({
  name: z.string().min(1, "班级名称不能为空"),
  description: z.string().optional(),
});

// GET /api/classes - Get all classes
export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "获取班级列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/classes - Create a new class
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = classSchema.parse(body);
    
    // Check if class with the same name already exists
    const existingClass = await prisma.class.findUnique({
      where: { name: validatedData.name },
    });
    
    if (existingClass) {
      return NextResponse.json(
        { error: "班级名称已存在" },
        { status: 400 }
      );
    }
    
    // Create new class
    const newClass = await prisma.class.create({
      data: validatedData,
    });
    
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "创建班级失败" },
      { status: 500 }
    );
  }
} 