"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { LayoutDashboard, Users, BookMarked, Send, Home } from "lucide-react";

const menuItems = [
  { title: "统计面板", href: "/admin", icon: LayoutDashboard },
  { title: "班级管理", href: "/admin/classes", icon: Users },
  { title: "作业管理", href: "/admin/assignments", icon: BookMarked },
  { title: "提交列表", href: "/admin/submissions", icon: Send },
  { title: "回到主页", href: "/", icon: Home },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar menuItems={menuItems} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto mt-4">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
