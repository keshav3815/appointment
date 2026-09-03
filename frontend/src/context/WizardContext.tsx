import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { usePatientAuth } from "./PatientAuthContext";
import { initialWizardFormData, type WizardFormData } from "../types/wizard";

export type AlertType = "danger" | "success" | "warning" | "info";

interface Alert {
  message: string;
  type: AlertType;
}

export interface SelectedDoctor {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
  consultation_fee: number | null;
  clinic_address: string | null;
  available_days: string[];
}

export type AutoSlotStatus = "idle" | "loading" | "ready" | "error";

interface WizardState {
  currentStep: number;
  form: WizardFormData;
  otpVerified: boolean;
  csrfToken: string;
  consultationFee: number;
  currency: string;
  paymentDemoMode: boolean;
  appointmentId: number | null;
  alert: Alert | null;
  selectedDoctor: SelectedDoctor | null;
  autoSlotStatus: AutoSlotStatus;
}

type Action =
  | { type: "SET_FIELD"; field: keyof WizardFormData; value: string }
  | { type: "GOTO_STEP"; step: number }
  | { type: "SET_OTP_VERIFIED"; value: boolean }
  | { type: "SET_CSRF_TOKEN"; value: string }
  | { type: "SET_PUBLIC_CONFIG"; fee: number; currency: string; demoMode: boolean }
  | { type: "SET_APPOINTMENT_ID"; value: number }
  | { type: "SHOW_ALERT"; message: string; alertType: AlertType }
  | { type: "HIDE_ALERT" }
  | { type: "SET_SELECTED_DOCTOR"; doctor: SelectedDoctor; mode: string }
  | { type: "PREFILL_PATIENT"; fields: Partial<WizardFormData> }
  | { type: "SET_AUTO_SLOT_STATUS"; value: AutoSlotStatus }
  | { type: "SET_AUTO_SLOT"; date: string; timeSlot: string }
  | { type: "RESET" };

const initialState: WizardState = {
  // /book only ever mounts behind RequirePatientAuth with a doctor already
  // chosen, so both the old Patient & Address step and the old Appointment
  // Details step (date/time/department/type) are skipped entirely — the
  // patient's account covers the first, and the doctor's next open slot
  // (fetched automatically, see the effect below) covers the second. The
  // wizard now opens straight on Reason.
  currentStep: 3,
  form: initialWizardFormData,
  otpVerified: false,
  csrfToken: "",
  consultationFee: 0,
  currency: "INR",
  paymentDemoMode: false,
  appointmentId: null,
  alert: null,
  selectedDoctor: null,
  autoSlotStatus: "idle",
};

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case "GOTO_STEP":
      return { ...state, currentStep: action.step };
    case "SET_OTP_VERIFIED":
      return { ...state, otpVerified: action.value };
    case "SET_CSRF_TOKEN":
      return { ...state, csrfToken: action.value };
    case "SET_PUBLIC_CONFIG":
      return {
        ...state,
        consultationFee: action.fee,
        currency: action.currency,
        paymentDemoMode: action.demoMode,
      };
    case "SET_APPOINTMENT_ID":
      return { ...state, appointmentId: action.value };
    case "SHOW_ALERT":
      return { ...state, alert: { message: action.message, type: action.alertType } };
    case "HIDE_ALERT":
      return { ...state, alert: null };
    case "SET_SELECTED_DOCTOR":
      return {
        ...state,
        selectedDoctor: action.doctor,
        form: {
          ...state.form,
          doctor_id: String(action.doctor.doctor_id),
          doctor: action.doctor.full_name,
          consultation_mode: action.mode,
          department: action.doctor.specialization || state.form.department,
        },
      };
    case "PREFILL_PATIENT":
      return { ...state, form: { ...state.form, ...action.fields }, otpVerified: true };
    case "SET_AUTO_SLOT_STATUS":
      return { ...state, autoSlotStatus: action.value };
    case "SET_AUTO_SLOT":
      return {
        ...state,
        autoSlotStatus: "ready",
        form: {
          ...state.form,
          appointment_date: action.date,
          time_slot: action.timeSlot,
          appointment_type: state.form.appointment_type || "New",
        },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<Action>;
  setField: (field: keyof WizardFormData, value: string) => void;
  goToStep: (step: number) => void;
  showAlert: (message: string, type?: AlertType, duration?: number) => void;
  hideAlert: () => void;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

interface SlotsResponse {
  status: string;
  is_available_day: boolean;
  slots: { time_slot: string; available: boolean }[];
}

function toDateStr(d: Date): string {
  // Local calendar date, not toISOString()'s UTC date — those disagree
  // whenever local time is ahead of UTC (e.g. IST), which would otherwise
  // have this look up "yesterday" first and get a 422 for a past date.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [searchParams] = useSearchParams();
  const { patient } = usePatientAuth();

  useEffect(() => {
    apiClient
      .get<{ csrf_token: string }>("/csrf-token")
      .then((data) => dispatch({ type: "SET_CSRF_TOKEN", value: data.csrf_token }));

    apiClient
      .get<{ consultation_fee: number; currency: string; payment_demo_mode: boolean }>("/config/public")
      .then((data) =>
        dispatch({
          type: "SET_PUBLIC_CONFIG",
          fee: data.consultation_fee,
          currency: data.currency,
          demoMode: data.payment_demo_mode,
        })
      );
  }, []);

  // Arriving from a doctor profile's "Book Clinic Visit / Book Video
  // Consultation" button — lock the doctor + mode onto the existing form
  // instead of leaving the old "Any Available" placeholder select.
  useEffect(() => {
    const doctorId = searchParams.get("doctorId");
    const mode = searchParams.get("mode");
    if (!doctorId) return;

    apiClient
      .get<{ status: string; doctor: SelectedDoctor }>(`/doctors/${doctorId}`)
      .then((res) =>
        dispatch({ type: "SET_SELECTED_DOCTOR", doctor: res.doctor, mode: mode || "clinic" })
      )
      .catch(() => {
        /* invalid doctorId in URL — falls back to the regular "Any Available" flow */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The date + time slot is normally chosen up front on the dedicated
  // slot-selection screen (per consultation mode) and arrives here as
  // ?date=&slot= — this just adopts that choice as-is. Direct/legacy access
  // to /book (no date/slot in the URL) falls back to silently walking
  // forward from today through the doctor's real availability and locking
  // in the first open slot, so the route never breaks even without going
  // through slot selection first.
  useEffect(() => {
    const doctorId = searchParams.get("doctorId");
    if (!doctorId) return;

    const chosenDate = searchParams.get("date");
    const chosenSlot = searchParams.get("slot");
    if (chosenDate && chosenSlot) {
      dispatch({ type: "SET_AUTO_SLOT", date: chosenDate, timeSlot: chosenSlot });
      return;
    }

    const mode = searchParams.get("mode") || "clinic";
    let cancelled = false;
    dispatch({ type: "SET_AUTO_SLOT_STATUS", value: "loading" });

    (async () => {
      const LOOKAHEAD_DAYS = 21;
      const start = new Date();

      for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
        if (cancelled) return;
        const candidate = new Date(start);
        candidate.setDate(candidate.getDate() + i);
        const dateStr = toDateStr(candidate);

        try {
          const res = await apiClient.get<SlotsResponse>(`/doctors/${doctorId}/slots?date=${dateStr}&mode=${mode}`);
          if (!res.is_available_day) continue;
          const firstOpen = res.slots.find((s) => s.available);
          if (firstOpen) {
            if (!cancelled) dispatch({ type: "SET_AUTO_SLOT", date: dateStr, timeSlot: firstOpen.time_slot });
            return;
          }
        } catch {
          // this day's lookup failed — keep trying subsequent days
        }
      }

      if (!cancelled) dispatch({ type: "SET_AUTO_SLOT_STATUS", value: "error" });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // A logged-in patient already has a verified account — reuse their saved
  // profile instead of asking them to fill the form and verify OTP again.
  useEffect(() => {
    if (!patient) return;
    dispatch({
      type: "PREFILL_PATIENT",
      fields: {
        full_name: patient.full_name,
        mobile: patient.mobile,
        email: patient.email,
        gender: patient.gender,
        dob: patient.dob,
        society: patient.society || "",
        city: patient.city || "",
        state: patient.state || "",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  const setField = (field: keyof WizardFormData, value: string) =>
    dispatch({ type: "SET_FIELD", field, value });

  const goToStep = (step: number) => {
    if (step < 1 || step > 4) return;
    dispatch({ type: "GOTO_STEP", step });
  };

  const showAlert = (message: string, type: AlertType = "danger", duration = 5000) => {
    dispatch({ type: "SHOW_ALERT", message, alertType: type });
    if (duration > 0) {
      setTimeout(() => dispatch({ type: "HIDE_ALERT" }), duration);
    }
  };

  const hideAlert = () => dispatch({ type: "HIDE_ALERT" });

  return (
    <WizardContext.Provider value={{ state, dispatch, setField, goToStep, showAlert, hideAlert }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
