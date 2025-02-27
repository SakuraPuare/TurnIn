"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const menuItems = [
  { name: "仪表盘", href: "/dashboard", icon: LayoutDashboard },
  { name: "用户管理", href: "/dashboard/users", icon: Users },
  { name: "内容管理", href: "/dashboard/content", icon: FileText },
  { name: "数据统计", href: "/dashboard/analytics", icon: BarChart2 },
  { name: "系统设置", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <div className={cn(
      "flex flex-col h-screen bg-gray-900 text-white transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <div className="text-xl font-bold">管理系统</div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-gray-800"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-2 py-3 rounded-md transition-colors",
                  isActive 
                    ? "bg-blue-700 text-white" 
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-800">
        {!collapsed && (
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-400">
              {user?.username} ({user?.role})
            </div>
            <button 
              onClick={logout}
              className="w-full text-left text-sm text-red-400 hover:text-red-300"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 