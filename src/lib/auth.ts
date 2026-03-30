import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * [SEC-02] 后台会话令牌生成
 *
 * 设计意图：
 * - 会话信息只保存后台真正需要的最小字段，避免把无关数据塞进 Cookie。
 * - JWT 仅承担“管理员身份已确认”的职责，业务数据仍以数据库为准。
 *
 * 文档映射：
 * - docs/security-and-permission-design.md
 * - docs/api-interface-specification.md
 */
export function createJWTToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

/**
 * [SEC-03] HTTP Only 会话写入
 *
 * 设计意图：
 * - 管理端会话采用服务端 Cookie，而不是把 token 暴露给前端脚本持久化。
 * - 这样 Proxy 可以在页面渲染前完成权限判断，避免“先渲染后拦截”。
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("JWT", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("JWT");
}

/**
 * [SEC-04] 令牌校验
 *
 * 设计意图：
 * - 所有后台访问统一回到这一个校验入口，避免权限规则在页面和接口中分叉。
 */
export function verifyJWTToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (_error) {
    return null;
  }
}

/**
 * [SEC-05] 基于请求上下文读取当前管理员
 *
 * 设计意图：
 * - 业务层如需在 Route Handler 中进一步读取当前登录用户，可直接复用该函数。
 */
export function getCurrentUser(request: NextRequest): User | null {
  const token = request.cookies.get('JWT')?.value;
  
  if (!token) {
    return null;
  }
  
  return verifyJWTToken(token);
}
