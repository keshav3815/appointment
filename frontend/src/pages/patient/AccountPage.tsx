import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { PatientNav } from "../../components/patient/PatientNav";
import { usePatientAuth } from "../../context/PatientAuthContext";

interface AppointmentRow {
  appointment_id: number;
  department: string;
  doctor: string | null;
  doctor_name: string | null;
  consultation_mode: string | null;
  appointment_date: string;
  time_slot: string;
  appointment_type: string;
  status: string;
  payment_status: string;
  doctor_remarks: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-[#fffbeb] text-[#92400e]",
  Confirmed: "bg-[var(--success-bg)] text-[var(--success)]",
  Completed: "bg-[var(--primary-bg)] text-[var(--primary)]",
  Cancelled: "bg-[#fef2f2] text-[#991b1b]",
};

export function AccountPage() {
  const { patient } = usePatientAuth();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ status: string; appointments: AppointmentRow[] }>("/patient/appointments")
      .then((res) => setAppointments(res.appointments))
      .finally(() => setLoading(false));
  }, []);

  if (!patient) return null;

  return (
    <div className="bg-white min-h-screen">
      <PatientNav />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 relative z-10 space-y-6">
        <div className="glass-card p-6 flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-[1.5rem] shrink-0"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="font-bold text-[1.2rem] text-[var(--dark)]">{patient.full_name}</h1>
            <p className="text-[0.85rem] text-[var(--muted)]">
              {patient.email} · {patient.mobile}
            </p>
            <p className="text-[0.8rem] text-[var(--muted)]">
              {patient.gender}, {patient.age} years {patient.city ? `· ${patient.city}` : ""}
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-[1.05rem] text-[var(--dark)] mb-3">My Appointments</h2>

          {loading && <p className="text-[var(--muted)] text-sm">Loading…</p>}
          {!loading && appointments.length === 0 && (
            <div className="glass-card p-8 text-center text-[var(--muted)]">
              You haven't booked any appointments yet.
            </div>
          )}

          <div className="space-y-3">
            {appointments.map((a) => (
              <div key={a.appointment_id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[var(--dark)]">
                    {a.doctor_name || a.doctor || "Any Available"}{" "}
                    <span className="font-normal text-[var(--muted)] text-[0.85rem]">· {a.department}</span>
                  </div>
                  <div className="text-[0.85rem] text-[var(--muted)] mt-0.5">
                    {a.appointment_date} · {a.time_slot}
                    {a.consultation_mode ? ` · ${a.consultation_mode === "video" ? "Video" : "Clinic"}` : ""}
                  </div>
                  {a.doctor_remarks && (
                    <div className="text-[0.8rem] text-[var(--warning)] mt-1">Note: {a.doctor_remarks}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className={`text-[0.75rem] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status] || "bg-[var(--light)]"}`}>
                    {a.status}
                  </span>
                  <span className="text-[0.75rem] font-semibold px-2.5 py-1 rounded-full bg-[var(--light)] text-[var(--dark)]">
                    {a.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
