import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, ApiError } from "../api/client";

interface DoctorInfo {
  doctor_id: number;
  full_name: string;
  username: string;
  email: string | null;
  specialization: string | null;
}

interface DoctorAuthState {
  doctor: DoctorInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DoctorAuthContext = createContext<DoctorAuthState | undefined>(undefined);

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await apiClient.get<{ status: string; doctor: DoctorInfo }>("/doctor/auth/me");
      setDoctor(data.doctor);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setDoctor(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiClient.post<{ status: string; doctor: DoctorInfo }>("/doctor/auth/login", {
      username,
      password,
    });
    setDoctor(data.doctor);
  };

  const logout = async () => {
    await apiClient.post("/doctor/auth/logout");
    setDoctor(null);
  };

  return (
    <DoctorAuthContext.Provider value={{ doctor, loading, login, logout }}>
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth(): DoctorAuthState {
  const ctx = useContext(DoctorAuthContext);
  if (!ctx) throw new Error("useDoctorAuth must be used within DoctorAuthProvider");
  return ctx;
}
