import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdmin } from './lib/auth';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Check if the path is for admin API
  if (path.startsWith('/api/admin')) {
    // Check if the user is an admin
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }
    
    // Allow the request to continue
    return NextResponse.next();
  }

  // For non-admin routes, allow the request to continue
  return NextResponse.next();
}

// Configure the middleware to run only for admin API routes
export const config = {
  matcher: '/api/admin/:path*',
};
