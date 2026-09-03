import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, ApiError } from "../api/client";

export interface PatientInfo {
  patient_id: number;
  full_name: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  age: number;
  society: string | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
}

interface PatientAuthState {
  patient: PatientInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setPatient: (patient: PatientInfo) => void;
}

const PatientAuthContext = createContext<PatientAuthState | undefined>(undefined);

export function PatientAuthProvider({ children }: { children: ReactNode }) {
  const [patient, setPatientState] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await apiClient.get<{ status: string; patient: PatientInfo }>("/patient/me");
      setPatientState(data.patient);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setPatientState(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiClient.post<{ status: string; patient: PatientInfo }>("/patient/login", {
      email,
      password,
    });
    setPatientState(data.patient);
  };

  const logout = async () => {
    await apiClient.post("/patient/logout");
    setPatientState(null);
  };

  return (
    <PatientAuthContext.Provider
      value={{ patient, loading, login, logout, refresh, setPatient: setPatientState }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth(): PatientAuthState {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error("usePatientAuth must be used within PatientAuthProvider");
  return ctx;
}
