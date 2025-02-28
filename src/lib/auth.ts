import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create a JWT token
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

// Verify a JWT token
export function verifyJWTToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (_error) {
    return null;
  }
}

// Get the current user from the request
export function getCurrentUser(request: NextRequest): User | null {
  const token = request.cookies.get('JWT')?.value;
  
  if (!token) {
    return null;
  }
  
  return verifyJWTToken(token);
}