import Sidebar from "@/components/Sidebar";

const menuItems = [
  { title: "统计面板", href: "/admin", icon: "dashboard" as const },
  { title: "班级管理", href: "/admin/classes", icon: "classes" as const },
  { title: "作业管理", href: "/admin/assignments", icon: "assignments" as const },
  { title: "提交列表", href: "/admin/submissions", icon: "submissions" as const },
  { title: "回到主页", href: "/", icon: "home" as const },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar menuItems={menuItems} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto mt-4">{children}</div>
      </main>
    </div>
  );
}
