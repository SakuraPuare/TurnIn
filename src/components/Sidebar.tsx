"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type SidebarIcon = "dashboard" | "classes" | "assignments" | "submissions" | "home";

export type SidebarProps = {
  menuItems: {
    title: string;
    href: string;
    icon: SidebarIcon;
  }[];
};

const iconMap: Record<SidebarIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  classes: Users,
  assignments: BookMarked,
  submissions: Send,
  home: Home,
};

export default function Sidebar({ menuItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const updateCollapsed = () => {
      setCollapsed(window.innerWidth < 768);
    };

    updateCollapsed();
    window.addEventListener("resize", updateCollapsed);

    return () => {
      window.removeEventListener("resize", updateCollapsed);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await post("/logout");
    } catch (_error) {
      // Ignore logout API errors and clear local auth state regardless.
    } finally {
      logout();
      router.replace("/login");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-white text-black transition-all duration-300 shadow-md",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && <div className="text-xl font-bold">Turn In 管理</div>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-2">
          {menuItems.map((item) => {
            const isRootItem = item.href === "/" || item.href === "/admin";
            const isActive = isRootItem
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = iconMap[item.icon];

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center px-2 py-3 rounded-md transition-colors",
                  isActive
                    ? "bg-blue-700 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-black",
                )}
              >
                  <Icon className="h-6 w-6 ml-1" />
                  {!collapsed && <span className="pl-4">{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start",
            collapsed && "justify-center px-0",
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="pl-4">退出登录</span>}
        </Button>
      </div>
    </div>
  );
}
