import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { GlobalAlert } from "../../components/wizard/GlobalAlert";
import { StepProgress } from "../../components/wizard/StepProgress";
import { Step1PatientAddress } from "../../components/wizard/Step1PatientAddress";
import { Step2Appointment } from "../../components/wizard/Step2Appointment";
import { Step3Reason } from "../../components/wizard/Step3Reason";
import { Step4ReviewPayment } from "../../components/wizard/Step4ReviewPayment";
import { useWizard } from "../../context/WizardContext";

export function BookingWizardPage() {
  const { state, goToStep } = useWizard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Both Patient & Address and Appointment Details are gone from the UI,
  // and the second one only has values to skip *because* a doctor was
  // chosen first (that's what the auto-slot lookup in WizardContext keys
  // off). Arriving at /book with no doctorId at all has nothing to bypass
  // to, so send that case back to search rather than showing a broken step.
  if (!searchParams.get("doctorId")) {
    return <Navigate to="/doctors" replace />;
  }

  // Step 1 (Patient & Address) is unreachable — a logged-in patient's
  // details are already on file — so "Back" from the first visible step has
  // nowhere in the wizard to return to. Send them to the doctor they were
  // booking instead.
  const backToDoctor = () => {
    if (state.selectedDoctor) navigate(`/doctors/${state.selectedDoctor.doctor_id}`);
    else navigate("/doctors");
  };

  return (
    <div className="bg-white py-8 md:py-12 px-4">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="glass-card p-6 md:p-10">
          <h1 className="text-center font-extrabold text-[1.55rem] mb-1 bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            Book Your Appointment
          </h1>
          <p className="text-center text-[var(--muted)] text-[0.92rem] mb-6">
            Complete the steps below to schedule your visit
          </p>

          <StepProgress currentStep={state.currentStep} />
          <GlobalAlert />

          {/* Unreachable in the current flow — kept only so the existing
              components aren't deleted, per the "don't remove the existing
              form" rule. Nothing links here anymore. */}
          {state.currentStep === 1 && <Step1PatientAddress onNext={() => goToStep(2)} />}
          {state.currentStep === 2 && (
            <Step2Appointment onNext={() => goToStep(3)} onBack={backToDoctor} />
          )}

          {state.currentStep === 3 && (state.autoSlotStatus === "loading" || state.autoSlotStatus === "idle") && (
            <div className="py-16 text-center text-[var(--muted)]">
              <div
                className="w-8 h-8 rounded-full border-[3px] border-[var(--primary-bg)] mx-auto mb-3 animate-spin"
                style={{ borderTopColor: "var(--primary)" }}
              />
              Finding {state.selectedDoctor?.full_name || "the doctor"}'s next available slot…
            </div>
          )}

          {state.currentStep === 3 && state.autoSlotStatus === "error" && (
            <div className="py-16 text-center">
              <p className="text-[var(--danger)] font-medium mb-4">
                {state.selectedDoctor?.full_name || "This doctor"} has no open slots in the next 3 weeks.
              </p>
              <button
                type="button"
                onClick={backToDoctor}
                className="font-semibold rounded-[var(--radius-md)] px-6 py-2.5 border-2 border-[#e2e8f0] text-[var(--muted)] bg-white hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                ← Back to Doctor Profile
              </button>
            </div>
          )}

          {state.currentStep === 3 && state.autoSlotStatus === "ready" && (
            <Step3Reason onNext={() => goToStep(4)} onBack={backToDoctor} />
          )}

          {state.currentStep === 4 && <Step4ReviewPayment onBack={() => goToStep(3)} />}
        </div>
      </div>
    </div>
  );
}
