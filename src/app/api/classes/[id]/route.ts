import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/classes/[id] - Get a specific class (public view)
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