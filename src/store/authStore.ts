"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (username: string, password: string) => {
        try {
          // 使用 /api/login 端点进行身份验证
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });
          
          if (!response.ok) {
            return false;
          }
          
          const data = await response.json();
          
          if (data.token) {
            set({ 
              user: data.user, 
              token: data.token, 
              isAuthenticated: true 
            });
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      getToken: () => get().token,
    }),
    {
      name: "auth-storage", // localStorage的键名
    }
  )
); 