import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../api/client";
import { TIME_SLOTS } from "../../types/wizard";

interface DoctorAppointment {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  patient_mobile: string;
  patient_email: string;
  department: string;
  consultation_mode: string | null;
  appointment_date: string;
  time_slot: string;
  appointment_type: string;
  reason: string;
  symptoms: string | null;
  status: string;
  payment_status: string;
  doctor_remarks: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-[rgba(245,158,11,0.15)] text-[#fbbf24]",
  Confirmed: "bg-[rgba(16,185,129,0.15)] text-[#34d399]",
  Completed: "bg-[rgba(59,130,246,0.15)] text-[#60a5fa]",
  Cancelled: "bg-[rgba(239,68,68,0.15)] text-[#f87171]",
};

function RescheduleModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: DoctorAppointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [slot, setSlot] = useState(appointment.time_slot);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (remarks.trim().length < 3) {
      setError("Remarks are required when rescheduling.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.patch(`/doctor/appointments/${appointment.appointment_id}/reschedule`, {
        appointment_date: date,
        time_slot: slot,
        remarks: remarks.trim(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reschedule.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--admin-dark-2)] border border-[var(--admin-border)] rounded-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-white mb-4">Reschedule Appointment #{appointment.appointment_id}</h3>

        {error && <div className="text-[#fca5a5] text-sm mb-3">{error}</div>}

        <label className="block text-[0.8rem] text-[var(--admin-text-muted)] mb-1">New Date</label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-[var(--admin-border)] bg-black/20 px-3 py-2 text-white text-sm mb-3"
        />

        <label className="block text-[0.8rem] text-[var(--admin-text-muted)] mb-1">New Time Slot</label>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="w-full rounded-lg border border-[var(--admin-border)] bg-black/20 px-3 py-2 text-white text-sm mb-3"
        >
          {TIME_SLOTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <label className="block text-[0.8rem] text-[var(--admin-text-muted)] mb-1">
          Remarks <span className="text-[#f87171]">(required)</span>
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Reason for rescheduling — shown to the patient"
          className="w-full rounded-lg border border-[var(--admin-border)] bg-black/20 px-3 py-2 text-white text-sm mb-4"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--admin-text-muted)] hover:text-white">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-55"
            style={{ background: "linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark))" }}
          >
            {submitting ? "Saving…" : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: DoctorAppointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (remarks.trim().length < 3) {
      setError("Remarks are required when cancelling.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.patch(`/doctor/appointments/${appointment.appointment_id}/cancel`, {
        remarks: remarks.trim(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--admin-dark-2)] border border-[var(--admin-border)] rounded-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-white mb-4">Cancel Appointment #{appointment.appointment_id}</h3>

        {error && <div className="text-[#fca5a5] text-sm mb-3">{error}</div>}

        <label className="block text-[0.8rem] text-[var(--admin-text-muted)] mb-1">
          Cancellation Reason <span className="text-[#f87171]">(required)</span>
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Reason for cancelling — shown to the patient"
          className="w-full rounded-lg border border-[var(--admin-border)] bg-black/20 px-3 py-2 text-white text-sm mb-4"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--admin-text-muted)] hover:text-white">
            Back
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-[#dc2626] disabled:opacity-55"
          >
            {submitting ? "Cancelling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoctorDashboardPage() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState<DoctorAppointment | null>(null);
  const [cancelling, setCancelling] = useState<DoctorAppointment | null>(null);

  const load = () => {
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}` : "";
    apiClient
      .get<{ status: string; appointments: DoctorAppointment[] }>(`/doctor/appointments${query}`)
      .then((res) => setAppointments(res.appointments))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-[1.3rem] text-white">My Appointments</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--admin-border)] bg-black/20 px-3 py-2 text-white text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading && <p className="text-[var(--admin-text-muted)]">Loading…</p>}
      {!loading && appointments.length === 0 && (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-dark-2)] p-8 text-center text-[var(--admin-text-muted)]">
          No appointments found.
        </div>
      )}

      <div className="space-y-3">
        {appointments.map((a) => (
          <div key={a.appointment_id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-dark-2)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white">
                  {a.patient_name} <span className="font-normal text-[var(--admin-text-muted)] text-[0.85rem]">· {a.department}</span>
                </div>
                <div className="text-[0.85rem] text-[var(--admin-text-muted)] mt-0.5">
                  {a.appointment_date} · {a.time_slot}
                  {a.consultation_mode ? ` · ${a.consultation_mode === "video" ? "Video" : "Clinic"}` : ""}
                </div>
                <div className="text-[0.8rem] text-[var(--admin-text-muted)] mt-1">
                  {a.patient_mobile} · {a.patient_email}
                </div>
                <div className="text-[0.82rem] text-[var(--admin-text)] mt-1.5">Reason: {a.reason}</div>
                {a.doctor_remarks && (
                  <div className="text-[0.8rem] text-[#fbbf24] mt-1">Your remarks: {a.doctor_remarks}</div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex gap-2">
                  <span className={`text-[0.72rem] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status] || ""}`}>
                    {a.status}
                  </span>
                  <span className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-full bg-white/5 text-[var(--admin-text-muted)]">
                    {a.payment_status}
                  </span>
                </div>
                {a.status !== "Cancelled" && a.status !== "Completed" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRescheduling(a)}
                      className="text-[0.78rem] font-semibold px-3 py-1.5 rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-white hover:border-white/30"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setCancelling(a)}
                      className="text-[0.78rem] font-semibold px-3 py-1.5 rounded-lg border border-[#dc2626]/50 text-[#f87171] hover:bg-[#dc2626]/10"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rescheduling && (
        <RescheduleModal
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            load();
          }}
        />
      )}
      {cancelling && (
        <CancelModal
          appointment={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            load();
          }}
        />
      )}
    </div>
  );
}
