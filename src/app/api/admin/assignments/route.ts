import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const requiredFieldSchema = z
  .object({
    name: z.string().trim().min(1, "字段标识不能为空"),
    label: z.string().trim().min(1, "字段名称不能为空"),
    type: z.enum(["text", "number", "select"]),
    description: z.string().optional(),
    options: z.string().nullable().optional(),
    required: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "select" && !value.options) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "下拉字段至少需要一个选项",
        path: ["options"],
      });
    }
  });

const assignmentSchema = z.object({
  title: z.string().trim().min(1, "作业标题不能为空"),
  description: z.string().optional(),
  deadline: z
    .string()
    .min(1, "截止时间不能为空")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "截止时间格式不正确"),
  status: z.enum(["active", "closed"]),
  fileNameFormat: z.string().trim().min(1, "文件命名格式不能为空"),
  classIds: z.array(z.string()).min(1, "至少选择一个班级"),
  requiredFields: z.array(requiredFieldSchema).default([]),
});

export async function GET() {
  try {
    const assignments = await prisma.assignment.findMany({
      include: {
        classes: {
          select: {
            id: true,
            name: true,
          },
        },
        requiredFields: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            submissions: true,
            requiredFields: true,
          },
        },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "获取作业列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = assignmentSchema.parse(body);
    const classIds = [...new Set(validatedData.classIds)];
    const duplicateFieldName = validatedData.requiredFields.find(
      (field, index, array) => array.findIndex((item) => item.name === field.name) !== index,
    );

    if (duplicateFieldName) {
      return NextResponse.json(
        { error: `字段标识重复：${duplicateFieldName.name}` },
        { status: 400 },
      );
    }

    const requiredFields = validatedData.requiredFields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      description: field.description?.trim() || null,
      options: field.options || null,
      required: field.required,
    }));

    const classCount = await prisma.class.count({
      where: {
        id: {
          in: classIds,
        },
      },
    });

    if (classCount !== classIds.length) {
      return NextResponse.json({ error: "所选班级不存在" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: validatedData.title,
        description: validatedData.description?.trim() || null,
        deadline: new Date(validatedData.deadline),
        status: validatedData.status,
        fileNameFormat: validatedData.fileNameFormat.trim(),
        classes: {
          connect: classIds.map((id) => ({ id })),
        },
        requiredFields: {
          create: requiredFields,
        },
      },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
          },
        },
        requiredFields: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            submissions: true,
            requiredFields: true,
          },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating assignment:", error);
    return NextResponse.json({ error: "创建作业失败" }, { status: 500 });
  }
}
