import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth"; // 假设我们有一个验证token的函数

const adminRoutes = ["/api/admin"];

export async function middleware(request: NextRequest) {
  // 检查请求路径是否在 adminRoutes 中
  if (adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    // 从请求头中获取 Authorization token
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : authHeader;

    // 检查 token 是否有效
    let isAuthenticated = false;

    if (token) {
      try {
        // 验证 token 的有效性
        isAuthenticated = await verifyToken(token);
      } catch {
        // 验证过程出错，视为未认证
        isAuthenticated = false;
      }
    }

    // 如果未认证，根据路径类型返回不同响应
    if (!isAuthenticated) {
      // 对于 API 路由，返回 401 未授权错误
      return NextResponse.json(
        { error: "未授权访问，请先登录" },
        { status: 401 },
      );
    }
  }

  // 如果验证通过或不需要验证，继续处理请求
  return NextResponse.next();
}

// 配置中间件应用的路径
export const config = {
  matcher: "/:path*",
};
