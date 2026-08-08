import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { apiClient } from "../api/client";
import { initialWizardFormData, type WizardFormData } from "../types/wizard";

export type AlertType = "danger" | "success" | "warning" | "info";

interface Alert {
  message: string;
  type: AlertType;
}

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
  | { type: "RESET" };

const initialState: WizardState = {
  currentStep: 1,
  form: initialWizardFormData,
  otpVerified: false,
  csrfToken: "",
  consultationFee: 0,
  currency: "INR",
  paymentDemoMode: false,
  appointmentId: null,
  alert: null,
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

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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
