import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  status: z.enum(["pending", "completed", "failed"]),
  reviewNotes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    const existingSubmission = await prisma.submission.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: "提交记录不存在" }, { status: 404 });
    }

    const submission = await prisma.submission.update({
      where: {
        id: params.id,
      },
      data: {
        status: validatedData.status,
        reviewNotes: validatedData.reviewNotes?.trim() || null,
        reviewedAt: new Date(),
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            deadline: true,
            requiredFields: {
              select: {
                name: true,
                label: true,
              },
            },
          },
        },
        student: {
          select: {
            name: true,
            studentId: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error reviewing submission:", error);
    return NextResponse.json({ error: "更新提交状态失败" }, { status: 500 });
  }
}
