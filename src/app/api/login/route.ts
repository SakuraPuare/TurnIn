import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 从数据库中查找用户
    const user = await prisma.admin.findUnique({
      where: {
        username: username,
        password: password,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 创建JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1d" }
    );

    // 返回成功响应
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    console.error("登录错误:", error);
    return NextResponse.json(
      { error: "登录过程中发生错误" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
