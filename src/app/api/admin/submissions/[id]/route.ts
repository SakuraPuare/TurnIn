import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  status: z.enum(["pending", "completed", "failed"]),
  reviewNotes: z.string().optional(),
});

/**
 * [REV-01] 提交审核写回接口
 *
 * 设计意图：
 * - 审核动作不是简单改一个状态，而是要把审核状态、审核备注、审核时间作为一组结果回写。
 * - 接口直接返回学生、作业和字段信息，保证前端审核台可以就地刷新，而不用重新整页拉取。
 *
 * 文档映射：
 * - docs/api-interface-specification.md
 * - docs/use-case-specification.md
 * - docs/security-and-permission-design.md
 */
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
        // reviewedAt 记录的是“本次审核动作”的时间，而不是学生提交时间。
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
