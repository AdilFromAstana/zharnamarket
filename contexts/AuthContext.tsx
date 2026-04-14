"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getStoredUser,
  saveUser,
  clearUserCache,
  isAuthenticated,
  api,
} from "@/lib/api-client";

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  avatarColor?: string | null;
  role: "user" | "admin";
  emailVerified?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  /** Вызывается после login/register — сервер уже установил cookies */
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── Контекст ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Провайдер ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Инициализация: проверяем auth cookie и загружаем user
  useEffect(() => {
    const init = async () => {
      try {
        if (!isAuthenticated()) {
          setIsLoading(false);
          return;
        }

        // Сначала загружаем из кэша для быстрого отображения
        const cached = getStoredUser<AuthUser>();
        if (cached) {
          setUser(cached);
        }

        // Затем обновляем с сервера (cookies отправятся автоматически)
        try {
          const freshUser = await api.get<AuthUser>("/api/users/me");
          setUser(freshUser);
          saveUser(freshUser);
        } catch {
          // Если 401 — api-client попробует refresh или разлогинит
          // Если другая ошибка — используем кэшированные данные
          if (!cached) {
            clearUserCache();
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = useCallback((userData: AuthUser) => {
    // Cookies уже установлены сервером в Set-Cookie headers
    // Клиент просто сохраняет user data в state и localStorage кэш
    saveUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Вызываем API — сервер очистит httpOnly cookies в ответе
      await api.post("/api/auth/logout").catch(() => {});
    } finally {
      clearUserCache();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await api.get<AuthUser>("/api/users/me");
      setUser(freshUser);
      saveUser(freshUser);
    } catch {
      // ignore — если 401, api-client разберётся
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user && isAuthenticated(),
        isLoading,
        isAdmin: user?.role === "admin",
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
