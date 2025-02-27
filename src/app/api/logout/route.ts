import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// POST /api/logout - Logout endpoint
export async function POST() {
  try {
    // Clear session cookie
    await clearSessionCookie();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "登出失败" },
      { status: 500 }
    );
  }
} 