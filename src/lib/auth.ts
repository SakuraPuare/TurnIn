import jwt from 'jsonwebtoken';

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