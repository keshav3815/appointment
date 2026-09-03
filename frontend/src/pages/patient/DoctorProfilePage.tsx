import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { DoctorAvatar } from "../../components/patient/DoctorAvatar";
import { PatientNav } from "../../components/patient/PatientNav";
import { TimeSlotSelector } from "../../components/patient/TimeSlotSelector";

interface DoctorProfile {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  city: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  gender: string | null;
  supports_clinic: boolean;
  supports_video: boolean;
  photo_url: string | null;
  bio: string | null;
  available_days: string[];
  clinic_photos: string[];
}

const DAY_LABELS: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function DoctorProfilePage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"clinic" | "video" | null>(null);

  useEffect(() => {
    apiClient
      .get<{ status: string; doctor: DoctorProfile }>(`/doctors/${doctorId}`)
      .then((res) => setDoctor(res.doctor))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Doctor not found."));
  }, [doctorId]);

  const bookMode = (mode: "clinic" | "video") => {
    // Toggle inline, on this same page — no route change.
    setActiveMode((cur) => (cur === mode ? null : mode));
  };

  const handleContinue = (date: string, timeSlot: string) => {
    if (!activeMode) return;
    const query = new URLSearchParams({ doctorId: String(doctorId), mode: activeMode, date, slot: timeSlot });
    navigate(`/book?${query.toString()}`);
  };

  if (error) {
    return (
      <div className="bg-white min-h-screen">
        <PatientNav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-[var(--danger)]">{error}</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="bg-white min-h-screen">
        <PatientNav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-[var(--muted)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <PatientNav />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 relative z-10 space-y-5">
        <div className="glass-card p-6 md:p-8 flex flex-col sm:flex-row gap-6">
          <DoctorAvatar photoUrl={doctor.photo_url} name={doctor.full_name} className="w-24 h-24" />
          <div className="flex-1">
            <h1 className="font-extrabold text-[1.5rem] text-[var(--dark)]">{doctor.full_name}</h1>
            <p className="text-[var(--primary)] font-semibold">
              {doctor.specialization || "General"} · {doctor.qualification}
            </p>
            <p className="text-[var(--muted)] text-[0.9rem] mt-1">
              {doctor.experience_years ?? 0}+ years experience
              {doctor.gender ? ` · ${doctor.gender}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-extrabold text-[1.6rem] text-[var(--dark)]">₹{doctor.consultation_fee ?? "—"}</div>
            <div className="text-[0.78rem] text-[var(--muted)]">consultation fee</div>
          </div>
        </div>

        {doctor.bio && (
          <div className="glass-card p-6">
            <h2 className="font-bold text-[1rem] text-[var(--dark)] mb-2">About</h2>
            <p className="text-[0.92rem] text-[var(--muted)] leading-relaxed">{doctor.bio}</p>
          </div>
        )}

        {doctor.clinic_name && (
          <div className="glass-card p-6">
            <h2 className="font-bold text-[1rem] text-[var(--dark)] mb-2">Clinic Details</h2>
            <p className="text-[0.92rem] text-[var(--dark)] font-semibold">{doctor.clinic_name}</p>
            <p className="text-[0.88rem] text-[var(--muted)]">{doctor.clinic_address}</p>
          </div>
        )}

        {doctor.clinic_photos.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-bold text-[1rem] text-[var(--dark)] mb-3">Clinic Photos</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {doctor.clinic_photos.slice(0, 5).map((url, i) => (
                <img key={i} src={url} alt={`Clinic photo ${i + 1}`} className="rounded-[var(--radius-sm)] aspect-square object-cover" />
              ))}
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <h2 className="font-bold text-[1rem] text-[var(--dark)] mb-3">Available Days</h2>
          <div className="flex flex-wrap gap-2">
            {doctor.available_days.map((d) => (
              <span key={d} className="text-[0.8rem] font-semibold px-3 py-1.5 rounded-full bg-[var(--light)] text-[var(--dark)]">
                {DAY_LABELS[d] || d}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {doctor.supports_clinic && (
              <button
                onClick={() => bookMode("clinic")}
                className="flex-1 text-white font-semibold rounded-[var(--radius-md)] px-6 py-3.5 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
                  boxShadow: "var(--shadow-btn)",
                  opacity: activeMode && activeMode !== "clinic" ? 0.55 : 1,
                }}
              >
                {activeMode === "clinic" ? "✓ Clinic Visit" : "Book Clinic Visit"}
              </button>
            )}
            {doctor.supports_video && (
              <button
                onClick={() => bookMode("video")}
                className="flex-1 text-white font-semibold rounded-[var(--radius-md)] px-6 py-3.5 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, var(--success) 0%, #34d399 100%)",
                  opacity: activeMode && activeMode !== "video" ? 0.55 : 1,
                }}
              >
                {activeMode === "video" ? "✓ Video Consult" : "Book Video Consultation"}
              </button>
            )}
            {!doctor.supports_clinic && !doctor.supports_video && (
              <p className="text-[var(--muted)] text-sm">This doctor is not currently accepting bookings.</p>
            )}
          </div>

          {/* Inline expansion — same page, no navigation. */}
          {activeMode && (
            <div className="mt-6 pt-6 border-t border-black/5">
              <TimeSlotSelector doctorId={doctor.doctor_id} consultationMode={activeMode} onContinue={handleContinue} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
