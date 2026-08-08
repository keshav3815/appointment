import { GlobalAlert } from "../../components/wizard/GlobalAlert";
import { StepProgress } from "../../components/wizard/StepProgress";
import { Step1PatientAddress } from "../../components/wizard/Step1PatientAddress";
import { Step2Appointment } from "../../components/wizard/Step2Appointment";
import { Step3Reason } from "../../components/wizard/Step3Reason";
import { Step4ReviewPayment } from "../../components/wizard/Step4ReviewPayment";
import { useWizard } from "../../context/WizardContext";

export function BookingWizardPage() {
  const { state, goToStep } = useWizard();

  return (
    <div className="wizard-bg py-8 md:py-12 px-4">
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

          {state.currentStep === 1 && <Step1PatientAddress onNext={() => goToStep(2)} />}
          {state.currentStep === 2 && (
            <Step2Appointment onNext={() => goToStep(3)} onBack={() => goToStep(1)} />
          )}
          {state.currentStep === 3 && (
            <Step3Reason onNext={() => goToStep(4)} onBack={() => goToStep(2)} />
          )}
          {state.currentStep === 4 && <Step4ReviewPayment onBack={() => goToStep(3)} />}
        </div>
      </div>
    </div>
  );
}
