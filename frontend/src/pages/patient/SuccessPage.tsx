import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { useWizard } from "../../context/WizardContext";

interface AppointmentSummary {
  appointment_id: number;
  department: string;
  doctor: string;
  consultation_mode: string | null;
  clinic_address: string | null;
  video_link: string | null;
  appointment_date: string;
  time_slot: string;
  appointment_type: string;
  status: string;
  apt_payment_status: string;
  full_name: string;
  email: string;
  mobile: string;
  transaction_id: string;
  amount: string;
}

const detailRow = (label: string, value: string) => (
  <tr className="even:bg-[rgba(79,70,229,0.03)]">
    <td className="py-2.5 px-4 font-semibold text-[var(--muted)] w-[44%] whitespace-nowrap text-[0.93rem]">
      {label}
    </td>
    <td className="py-2.5 px-4 font-semibold text-[var(--dark)] text-[0.93rem]">{value}</td>
  </tr>
);

export function SuccessPage() {
  const { state, dispatch } = useWizard();
  const navigate = useNavigate();
  const [data, setData] = useState<AppointmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.appointmentId) {
      navigate("/", { replace: true });
      return;
    }

    apiClient
      .get<{ status: string; appointment: AppointmentSummary }>(
        `/appointments/${state.appointmentId}/summary`
      )
      .then((res) => setData(res.appointment))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          navigate("/", { replace: true });
        } else {
          setError("Appointment details not found.");
        }
      });
  }, [state.appointmentId, navigate]);

  const bookAnother = () => {
    dispatch({ type: "RESET" });
    navigate("/");
  };

  if (error) {
    return (
      <div className="bg-white flex items-center justify-center p-8">
        <p className="text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white flex items-center justify-center p-8">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 md:py-12 px-4">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="glass-card p-6 md:p-10">
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-white text-[40px] mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, var(--success), #34d399)",
              boxShadow: "0 8px 28px rgba(16,185,129,0.25)",
            }}
          >
            ✓
          </div>

          <h1 className="text-center font-bold text-[1.4rem] mb-1" style={{ color: "var(--success)" }}>
            Appointment Confirmed!
          </h1>
          <p className="text-center text-[var(--muted)] text-[0.9rem] mb-6">
            Your appointment has been booked and payment received successfully.
          </p>

          <div
            className="rounded-[var(--radius-md)] p-4 text-center mb-5 border-[1.5px] border-[rgba(79,70,229,0.12)]"
            style={{ background: "linear-gradient(135deg, var(--primary-bg), #f0f9ff)" }}
          >
            <div className="text-[0.82rem] font-semibold text-[var(--muted)]">Appointment ID</div>
            <div className="text-[1.5rem] font-extrabold tracking-wide" style={{ color: "var(--primary)" }}>
              #{data.appointment_id}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {detailRow("Patient", data.full_name)}
                {detailRow("Email", data.email)}
                {detailRow("Mobile", data.mobile)}
                {detailRow("Department", data.department)}
                {detailRow("Doctor", data.doctor || "Any Available")}
                {data.consultation_mode &&
                  detailRow("Consultation Mode", data.consultation_mode === "video" ? "Video Consultation" : "Clinic Visit")}
                {data.clinic_address && detailRow("Clinic Address", data.clinic_address)}
                {data.video_link && detailRow("Video Link", data.video_link)}
                {detailRow("Date", data.appointment_date)}
                {detailRow("Time Slot", data.time_slot)}
                {detailRow("Type", data.appointment_type)}
                {detailRow("Amount", `₹${Number(data.amount).toFixed(2)}`)}
                {detailRow("Transaction ID", data.transaction_id || "—")}
                {detailRow(
                  "Payment",
                  data.apt_payment_status === "Paid" ? "Paid" : data.apt_payment_status
                )}
                {detailRow("Status", data.status)}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="font-semibold rounded-[var(--radius-sm)] px-5 py-2.5 border-2 border-[#e2e8f0] text-[var(--muted)] bg-white hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Print
            </button>
            <button
              type="button"
              onClick={bookAnother}
              className="text-white font-semibold rounded-[var(--radius-sm)] px-6 py-2.5"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              Book Another
            </button>
          </div>

          <div className="text-center mt-3">
            <small className="text-[var(--muted)]">
              Confirmation email sent to <strong>{data.email}</strong>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
