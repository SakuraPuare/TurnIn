"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center space-x-4 flex-1">
        <h1 className="text-xl font-bold text-gray-800">Turn In 作业递交</h1>

        <div className="grow"></div>
        <Button variant="outline">
          <Link
            href="/admin"
          >
            后台管理
          </Link>
        </Button>
      </div>
    </header>
  );
}
