import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    
    return NextResponse.json(classData);
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