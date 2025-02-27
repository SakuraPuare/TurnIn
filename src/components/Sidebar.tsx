"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type SidebarProps = {
  menuItems: {
    title: string;
    href: string;
    icon: React.ElementType;
  }[];
};

export default function Sidebar({ menuItems }: SidebarProps) {
  const pathname = usePathname();

  // 移动端适应
  const isMobile = window.innerWidth < 768;
  const [collapsed, setCollapsed] = useState(isMobile);

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
            const isActive = pathname === item.href;
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
                  <item.icon className="h-6 w-6 ml-1" />
                  {!collapsed && <span className="pl-4">{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
