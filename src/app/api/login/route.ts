import { NextRequest, NextResponse } from "next/server";
import { createJWTToken, setSessionCookie } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

// POST /api/login - Login endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Find user by username
    const user = await prisma.admin.findUnique({
      where: {
        username: validatedData.username,
      },
    });
    
    const passwordMatches = user
      ? user.password.startsWith("$2")
        ? await bcrypt.compare(validatedData.password, user.password)
        : user.password === validatedData.password
      : false;

    // Check if user exists and password matches
    if (!user || !passwordMatches) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }
    
    // Create session token
    const token = createJWTToken({
      id: user.id,
      username: user.username,
      role: 'admin',
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: 'admin',
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "输入数据验证失败", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    );
  }
}
