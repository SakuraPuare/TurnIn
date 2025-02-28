"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    console.log("user", token);
    console.log("hello");

    if (token === null) {
      return;
    }

    if (!token) {
      router.push("/login");
    }
    return;
  }, [token, router]);

  // 如果未认证，不渲染子组件
  if (!token) {
    router.push("/login");
    return null;
  }

  return <>{children}</>;
}
