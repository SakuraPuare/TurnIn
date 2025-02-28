"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { post } from '@/lib/api';

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
          const data = await post('/login', { username, password });
          console.log(data);
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