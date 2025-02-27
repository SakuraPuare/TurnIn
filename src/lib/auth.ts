import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Secret key for JWT signing (in production, use environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// User interface
export interface User {
  id: string;
  username: string;
  role: UserRole;
}

// Create a session token
export function createSessionToken(user: User): string {
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

// Verify a session token
export function verifySessionToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (_error) {
    return null;
  }
}

// Get the current user from the request
export function getCurrentUser(request: NextRequest): User | null {
  const token = request.cookies.get('session')?.value;
  
  if (!token) {
    return null;
  }
  
  return verifySessionToken(token);
}

// Check if the current user is an admin
export function isAdmin(request: NextRequest): boolean {
  const user = getCurrentUser(request);
  return user?.role === UserRole.ADMIN;
}

// Set a session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'session',
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

// Clear the session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * 验证 JWT token 的有效性
 * @param token JWT token 字符串
 * @returns Promise<boolean> 表示 token 是否有效
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // 使用与签发 token 相同的密钥进行验证
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    
    // 如果验证成功，返回 true
    return !!decoded;
  } catch (error) {
    // 如果验证失败（token 无效、过期或格式错误），返回 false
    console.error('Token 验证失败:', error);
    return false;
  }
}

/**
 * 从 token 中解析用户信息
 * @param token JWT token 字符串
 * @returns 解析出的用户信息，如果 token 无效则返回 null
 */
export function getUserFromToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    return decoded as { id: string; username: string };
  } catch (error) {
    return null;
  }
} 