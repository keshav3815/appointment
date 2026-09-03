import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { useWizard } from "../../context/WizardContext";
import { loadRazorpayScript } from "../../hooks/useRazorpayScript";
import { sectionHeaderClass } from "./formStyles";

interface CreateAppointmentResponse {
  status: string;
  message: string;
  appointment_id: number;
  patient_id: number;
}

interface CreatePaymentOrderResponse {
  status: string;
  order_id: string;
  amount: number;
  currency: string;
  key: string;
  name: string;
  email: string;
  mobile: string;
  demo: boolean;
}

interface VerifyPaymentResponse {
  status: string;
  message: string;
  redirect: string;
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const summaryRow = (label: string, value: string) => (
  <div className="flex justify-between items-center py-2.5 border-b border-black/[0.04] last:border-0 text-[0.93rem]">
    <span className="text-[var(--muted)] font-medium">{label}</span>
    <span className="text-[var(--dark)] font-semibold text-right">{value || "—"}</span>
  </div>
);

export function Step4ReviewPayment({ onBack }: { onBack: () => void }) {
  const { state, showAlert, dispatch } = useWizard();
  const { form, csrfToken, consultationFee, paymentDemoMode, selectedDoctor } = state;
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [appointmentCreated, setAppointmentCreated] = useState(false);
  const [statusText, setStatusText] = useState("");

  const effectiveFee =
    selectedDoctor?.consultation_fee !== null && selectedDoctor?.consultation_fee !== undefined
      ? selectedDoctor.consultation_fee
      : consultationFee;

  const handlePayNow = async () => {
    if (appointmentCreated || processing) return;

    setProcessing(true);
    setStatusText("Processing…");

    let appointmentId: number;
    try {
      const aptData = await apiClient.post<CreateAppointmentResponse>("/appointments", {
        csrf_token: csrfToken,
        full_name: form.full_name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gender: form.gender,
        dob: form.dob,
        society: form.society.trim(),
        city: form.city.trim(),
        state: form.state,
        department: form.department,
        doctor: form.doctor,
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        consultation_mode: form.consultation_mode || undefined,
        appointment_date: form.appointment_date,
        time_slot: form.time_slot,
        appointment_type: form.appointment_type,
        reason: form.reason,
        symptoms: form.symptoms.trim(),
        duration: form.duration,
      });
      appointmentId = aptData.appointment_id;
      setAppointmentCreated(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && /security token/i.test(err.message)) {
        try {
          const fresh = await apiClient.get<{ csrf_token: string }>("/csrf-token");
          dispatch({ type: "SET_CSRF_TOKEN", value: fresh.csrf_token });
          showAlert("Your session expired. We've refreshed it — please press Pay again.", "warning");
        } catch {
          showAlert("Your session expired. Please reload the page and try again.");
        }
      } else {
        const message = err instanceof ApiError ? err.message : "Network error creating appointment.";
        showAlert(message);
      }
      setProcessing(false);
      setStatusText("");
      return;
    }

    let orderData: CreatePaymentOrderResponse;
    try {
      orderData = await apiClient.post<CreatePaymentOrderResponse>("/payments/order", {
        appointment_id: appointmentId,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Network error creating payment order.";
      showAlert(message);
      setProcessing(false);
      setStatusText("");
      return;
    }

    if (orderData.demo) {
      setStatusText("Completing demo payment…");
      try {
        const vData = await apiClient.post<VerifyPaymentResponse>("/payments/demo-complete", {
          appointment_id: appointmentId,
        });
        dispatch({ type: "SET_APPOINTMENT_ID", value: appointmentId });
        navigate(vData.redirect || "/success");
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Demo payment failed. Please try again.";
        showAlert(message);
        setProcessing(false);
        setStatusText("");
      }
      return;
    }

    try {
      await loadRazorpayScript();
    } catch {
      showAlert("Could not load payment gateway. Please try again.");
      setProcessing(false);
      setStatusText("");
      return;
    }

    setStatusText("Complete Payment…");

    const rzp = new window.Razorpay({
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: "Doctor Appointment System",
      description: `Consultation Fee — Appointment #${appointmentId}`,
      prefill: {
        name: orderData.name || "",
        email: orderData.email || "",
        contact: orderData.mobile || "",
      },
      theme: { color: "#4f46e5" },
      handler: async (response: RazorpaySuccessResponse) => {
        setStatusText("Verifying Payment…");
        try {
          const vData = await apiClient.post<VerifyPaymentResponse>("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          dispatch({ type: "SET_APPOINTMENT_ID", value: appointmentId });
          navigate(vData.redirect || "/success");
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Payment verification error. Contact support.";
          showAlert(message);
          setProcessing(false);
          setStatusText("");
        }
      },
      modal: {
        ondismiss: () => {
          showAlert("Payment was not completed. You can retry.", "warning");
          setProcessing(false);
          setStatusText("");
        },
      },
    });

    rzp.open();
  };

  return (
    <div>
      <div className={sectionHeaderClass}>Review & Pay</div>

      <div
        className="rounded-[var(--radius-md)] p-6 mb-4 border border-[rgba(79,70,229,0.08)]"
        style={{ background: "linear-gradient(135deg, var(--primary-bg) 0%, #f0f9ff 100%)" }}
      >
        {summaryRow("Patient", form.full_name)}
        {summaryRow("Email", form.email)}
        {summaryRow("Mobile", form.mobile)}
        {summaryRow("Department", form.department)}
        {summaryRow("Doctor", form.doctor || "Any Available")}
        {form.consultation_mode &&
          summaryRow("Consultation Mode", form.consultation_mode === "video" ? "Video Consultation" : "Clinic Visit")}
        {summaryRow("Date", form.appointment_date)}
        {summaryRow("Slot", form.time_slot)}
        {summaryRow("Type", form.appointment_type)}
        {summaryRow("Reason", form.reason)}
      </div>

      <div className="text-center mb-3">
        <p className="text-[var(--muted)] mb-1 text-[0.9rem]">Consultation Fee</p>
        <div
          className="text-[2.4rem] font-extrabold bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          ₹{effectiveFee.toFixed(2)}
        </div>
      </div>

      {paymentDemoMode ? (
        <div className="flex items-center gap-2 text-[var(--warning)] text-[0.82rem] font-semibold bg-[#fffbeb] px-4 py-2.5 rounded-[var(--radius-sm)] border border-[#fde68a] mb-4">
          <span>Demo mode: no real payment gateway is connected yet. Pressing Pay will simulate a successful payment.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[var(--muted)] text-[0.82rem] font-medium bg-[#f8fafc] px-4 py-2.5 rounded-[var(--radius-sm)] border border-[#e2e8f0] mb-4">
          <span>Payment secured by Razorpay. Your card details are never stored on our servers.</span>
        </div>
      )}

      <div className="flex justify-between items-center mt-7">
        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="font-semibold rounded-[var(--radius-md)] px-8 py-3 border-2 border-[#e2e8f0] text-[var(--muted)] bg-white hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-bg)] disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handlePayNow}
          disabled={processing}
          className="text-white font-semibold rounded-[var(--radius-md)] px-8 py-3 min-w-[200px] disabled:opacity-55"
          style={{
            background: "linear-gradient(135deg, var(--success) 0%, #34d399 100%)",
            boxShadow: "0 4px 14px rgba(16,185,129,0.18)",
          }}
        >
          {processing ? statusText : `Pay ₹${effectiveFee.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
