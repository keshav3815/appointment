import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, ApiError } from "../api/client";

interface AdminInfo {
  id: number;
  name: string;
  role: "admin" | "superadmin";
}

interface AdminAuthState {
  admin: AdminInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await apiClient.get<{ success: boolean; admin: AdminInfo }>("/admin/auth/me");
      setAdmin(data.admin);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setAdmin(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiClient.post<{ success: boolean; admin: AdminInfo }>("/admin/auth/login", {
      username,
      password,
    });
    setAdmin(data.admin);
  };

  const logout = async () => {
    await apiClient.post("/admin/auth/logout");
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
