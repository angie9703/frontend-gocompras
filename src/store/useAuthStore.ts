"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AUTH_STORAGE_KEY, getAuthToken, setAuthToken } from "@/lib/authToken";
import { getProfile, login as loginRequest, register as registerRequest, updateProfile as updateProfileRequest } from "@/services/auth";
import type { AuthUser, LoginCredentials, RegisterPayload, UpdateProfilePayload } from "@/types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoginDrawerOpen: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  openLoginDrawer: () => void;
  closeLoginDrawer: () => void;
}

function applySession(token: string, user: AuthUser) {
  setAuthToken(token);
  return {
    token,
    user,
    isAuthenticated: true,
    isLoading: false,
  } as const;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isLoginDrawerOpen: false,

      openLoginDrawer: () => set({ isLoginDrawerOpen: true }),
      closeLoginDrawer: () => set({ isLoginDrawerOpen: false }),

      login: async (credentials) => {
        const session = await loginRequest(credentials);
        set(applySession(session.token, session.user));
      },

      register: async (payload) => {
        const session = await registerRequest(payload);
        set(applySession(session.token, session.user));
      },

      updateProfile: async (payload) => {
        const user = await updateProfileRequest(payload);
        set({ user });
      },

      logout: () => {
        setAuthToken(null);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      checkAuth: async () => {
        const token = get().token ?? getAuthToken();
        if (!token) {
          setAuthToken(null);
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        setAuthToken(token);
        set({ isLoading: true, token });

        try {
          const user = await getProfile();
          set({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          setAuthToken(null);
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.token) {
          setAuthToken(state.token);
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
          state.isLoading = false;
        }
      },
    },
  ),
);
