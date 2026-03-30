import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWTToken } from "@/lib/auth";

/**
 * [SEC-01] 服务端后台鉴权入口
 *
 * 设计意图：
 * 1. 后台页面不能依赖客户端 hydrate 后再跳转，否则服务端已经把敏感数据渲染出来。
 * 2. 管理接口和班级/学生写接口要在进入业务逻辑前被统一拦截，避免每个路由重复鉴权代码。
 *
 * 技术实现逻辑：
 * - 优先读取 Authorization Bearer，再回退到 JWT Cookie，兼容服务端跳转与浏览器会话。
 * - /admin 页面走重定向逻辑，/api/admin 和受保护写接口直接返回 401 JSON。
 *
 * 文档映射：
 * - docs/security-and-permission-design.md
 * - docs/software-design-specification.md
 * - docs/module-feature-matrix.md
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const cookieToken = request.cookies.get("JWT")?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : "";
  const token = bearerToken || cookieToken || "";
  const currentUser = token ? verifyJWTToken(token) : null;
  const isAdminPage = path === "/admin" || path.startsWith("/admin/");
  const isLoginPage = path === "/login";
  const isAdminApi = path.startsWith("/api/admin");
  const isProtectedClassMutation =
    (path === "/api/classes" && request.method !== "GET") ||
    (/^\/api\/classes\/[^/]+\/students(?:\/[^/]+)?(?:\/batch)?$/.test(path) &&
      request.method !== "GET");

  // 管理接口和班级/学生写接口共用同一条权限边界，避免后台能力散落在多个路由中。
  if (isAdminApi || isProtectedClassMutation) {
    if (!currentUser) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (isAdminPage && !currentUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录管理员不需要回到登录页，直接送回后台主页，减少会话切换成本。
  if (isLoginPage && currentUser) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/api/admin/:path*",
    "/api/classes",
    "/api/classes/:path*",
  ],
};
