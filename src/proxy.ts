import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWTToken } from "@/lib/auth";

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
