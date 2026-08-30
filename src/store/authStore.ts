/**
 * 认证状态管理
 *
 * 管理用户登录、注册、退出及会话恢复，通过 Zustand persist 中间件
 * 保持初始化状态，但不持久化用户敏感信息（由 Supabase/LocalStorage 管理会话）。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppUser } from '@/types';
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  getCurrentUser,
} from '@/api/auth';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AppUser | null) => void;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user }),

      login: async (email, password, remember) => {
        set({ isLoading: true });
        try {
          const user = await loginApi(email, password, remember);
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, displayName) => {
        set({ isLoading: true });
        try {
          const user = await registerApi(email, password, displayName);
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        await logoutApi();
        set({ user: null });
      },

      init: async () => {
        try {
          const user = await getCurrentUser();
          set({ user, isInitialized: true });
        } catch {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: () => ({}), // 不持久化敏感用户信息，由 Supabase/Local 管理会话
    }
  )
);
