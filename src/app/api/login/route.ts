import { NextRequest, NextResponse } from "next/server";
import { createJWTToken } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
// import bcrypt from "bcryptjs";

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
        password: validatedData.password,
      },
    });
    
    console.log(user);
    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }
    
    // Verify password
    // const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
    
    // if (!passwordMatch) {
    //   return NextResponse.json(
    //     { error: "用户名或密码错误" },
    //     { status: 401 }
    //   );
    // }
    
    // Create session token
    const token = createJWTToken({
      id: user.id,
      username: user.username,
      role: 'admin',
    });
    
    // Set session cookie
    // await setSessionCookie(token);
    
    // Return user info (excluding password)
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: 'admin',
      token: token,
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
