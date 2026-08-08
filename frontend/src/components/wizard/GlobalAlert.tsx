import { useWizard } from "../../context/WizardContext";

const TYPE_STYLES: Record<string, string> = {
  danger: "bg-[#fef2f2] text-[#991b1b]",
  success: "bg-[#f0fdf4] text-[#166534]",
  warning: "bg-[#fffbeb] text-[#92400e]",
  info: "bg-[#eff6ff] text-[#1e40af]",
};

export function GlobalAlert() {
  const { state } = useWizard();

  if (!state.alert) return null;

  return (
    <div
      className={`rounded-[var(--radius-sm)] font-medium px-4 py-3 mb-4 ${TYPE_STYLES[state.alert.type]}`}
      role="alert"
    >
      {state.alert.message}
    </div>
  );
}
