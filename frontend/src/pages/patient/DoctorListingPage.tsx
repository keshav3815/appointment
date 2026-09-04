import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import { DoctorAvatar } from "../../components/patient/DoctorAvatar";
import { PatientNav } from "../../components/patient/PatientNav";
import { TimeSlotSelector } from "../../components/patient/TimeSlotSelector";
import { DEPARTMENTS } from "../../types/wizard";

interface DoctorCard {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  city: string | null;
  clinic_name: string | null;
  gender: string | null;
  supports_clinic: boolean;
  supports_video: boolean;
  photo_url: string | null;
}

export function DoctorListingPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<{ doctorId: number; mode: "clinic" | "video" } | null>(null);

  const toggleExpanded = (doctorId: number, mode: "clinic" | "video") => {
    setExpanded((cur) => (cur?.doctorId === doctorId && cur.mode === mode ? null : { doctorId, mode }));
  };

  const handleContinue = (doctorId: number, mode: "clinic" | "video", date: string, timeSlot: string) => {
    const query = new URLSearchParams({ doctorId: String(doctorId), mode, date, slot: timeSlot });
    navigate(`/book?${query.toString()}`);
  };

  const specialization = params.get("specialization") || "";
  const city = params.get("city") || "";
  const gender = params.get("gender") || "";
  const mode = params.get("mode") || "";
  const minExperience = params.get("min_experience") || "";
  const sort = params.get("sort") || "";

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (specialization) query.set("specialization", specialization);
    if (city) query.set("city", city);
    if (gender) query.set("gender", gender);
    if (mode) query.set("mode", mode);
    if (minExperience) query.set("min_experience", minExperience);
    if (sort) query.set("sort", sort);

    apiClient
      .get<{ status: string; doctors: DoctorCard[] }>(`/doctors?${query.toString()}`)
      .then((res) => setDoctors(res.doctors))
      .finally(() => setLoading(false));
  }, [specialization, city, gender, mode, minExperience, sort]);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #F8FBFF 0%, #EEF6FF 45%, #FFFFFF 100%)" }}
    >
      {/* Decorative healthcare backdrop — purely visual, sits behind all content
          and never intercepts clicks or affects layout/scroll. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
        {/* soft abstract circles */}
        <svg className="absolute -top-24 -left-24 w-[420px] h-[420px]" viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="200" fill="none" stroke="#2563AC" strokeWidth="1.5" opacity="0.05" />
        </svg>
        <svg className="absolute bottom-0 -left-16 w-[300px] h-[300px] hidden sm:block" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="#2563AC" opacity="0.035" />
        </svg>

        {/* faint ECG / heartbeat line, spanning the width near the top */}
        <svg
          className="absolute top-20 left-0 w-full h-16 hidden md:block"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          <polyline
            points="0,30 140,30 165,8 190,52 215,30 400,30 425,14 450,46 475,30 700,30 725,4 750,56 775,30 1000,30 1025,14 1050,46 1075,30 1200,30"
            fill="none"
            stroke="#2563AC"
            strokeWidth="1.6"
            opacity="0.06"
          />
        </svg>

        {/* faint medical crosses scattered around */}
        {[
          { top: "14%", left: "8%", size: 18, rotate: -12 },
          { top: "58%", left: "4%", size: 14, rotate: 8 },
          { top: "30%", left: "92%", size: 16, rotate: 15 },
          { top: "78%", left: "88%", size: 20, rotate: -8 },
          { top: "8%", left: "70%", size: 12, rotate: 20 },
        ].map((c, i) => (
          <svg
            key={i}
            className="absolute"
            style={{ top: c.top, left: c.left, width: c.size, height: c.size, transform: `rotate(${c.rotate}deg)` }}
            viewBox="0 0 24 24"
          >
            <rect x="10" y="2" width="4" height="20" rx="1.5" fill="#2563AC" opacity="0.07" />
            <rect x="2" y="10" width="20" height="4" rx="1.5" fill="#2563AC" opacity="0.07" />
          </svg>
        ))}

        {/* subtle stethoscope outline, bottom-right */}
        <svg
          className="absolute bottom-4 right-4 w-40 h-40 md:w-56 md:h-56"
          viewBox="0 0 200 200"
          fill="none"
          stroke="#2563AC"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.06"
        >
          <path d="M55 20v38c0 20 16 34 36 34s36-14 36-34V20" />
          <path d="M51 20a4 4 0 1 0 8 0 4 4 0 1 0-8 0Z" />
          <path d="M87 20a4 4 0 1 0 8 0 4 4 0 1 0-8 0Z" />
          <path d="M91 92v14c0 22 18 32 36 32" />
          <circle cx="150" cy="150" r="20" />
          <circle cx="150" cy="150" r="7" />
        </svg>
      </div>

      <div className="relative z-10">
        <PatientNav />

      <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 py-8 relative z-10">
        <h1 className="font-bold text-[1.4rem] text-[var(--dark)] mb-1">
          {specialization || "All"} Doctors{city ? ` in ${city}` : ""}
        </h1>
        <p className="text-[var(--muted)] text-[0.9rem] mb-6">
          {loading ? "Searching…" : `${doctors.length} doctor${doctors.length === 1 ? "" : "s"} found`}
        </p>

        <div className="flex flex-col md:flex-row gap-6">
          <aside className="glass-card p-5 md:w-64 shrink-0 h-fit space-y-5">
            <div>
              <label className="block font-semibold text-[0.82rem] text-[var(--dark)] mb-1.5">Specialist</label>
              <select
                value={specialization}
                onChange={(e) => updateParam("specialization", e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border-[1.5px] border-[#e2e8f0] bg-white px-3 py-2 text-[0.88rem]"
              >
                <option value="">Any</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[0.82rem] text-[var(--dark)] mb-1.5">Consultation Type</label>
              <div className="space-y-1.5 text-[0.85rem]">
                {[
                  { value: "", label: "Any" },
                  { value: "clinic", label: "Clinic Visit" },
                  { value: "video", label: "Video Consultation" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === opt.value}
                      onChange={() => updateParam("mode", opt.value)}
                      className="accent-[var(--primary)]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[0.82rem] text-[var(--dark)] mb-1.5">Gender</label>
              <div className="space-y-1.5 text-[0.85rem]">
                {[
                  { value: "", label: "Any" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === opt.value}
                      onChange={() => updateParam("gender", opt.value)}
                      className="accent-[var(--primary)]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[0.82rem] text-[var(--dark)] mb-1.5">Min. Experience</label>
              <select
                value={minExperience}
                onChange={(e) => updateParam("min_experience", e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border-[1.5px] border-[#e2e8f0] bg-white px-3 py-2 text-[0.88rem]"
              >
                <option value="">Any</option>
                <option value="5">5+ years</option>
                <option value="10">10+ years</option>
                <option value="15">15+ years</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[0.82rem] text-[var(--dark)] mb-1.5">Sort By</label>
              <select
                value={sort}
                onChange={(e) => updateParam("sort", e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border-[1.5px] border-[#e2e8f0] bg-white px-3 py-2 text-[0.88rem]"
              >
                <option value="">Relevance</option>
                <option value="fee_asc">Fee: Low to High</option>
                <option value="fee_desc">Fee: High to Low</option>
                <option value="experience_desc">Experience</option>
              </select>
            </div>
          </aside>

          <div className="flex-1 space-y-4">
            {!loading && doctors.length === 0 && (
              <div className="glass-card p-8 text-center text-[var(--muted)]">
                No doctors match these filters. Try widening your search.
              </div>
            )}

            {doctors.map((doctor) => (
              <div
                key={doctor.doctor_id}
                className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(37,99,172,0.08)] border border-black/5 p-5"
              >
              <div className="flex flex-col lg:flex-row lg:items-stretch gap-5">
                {/* Left: doctor info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start gap-4">
                    <DoctorAvatar photoUrl={doctor.photo_url} name={doctor.full_name} className="w-16 h-16" />
                    <div className="min-w-0 pt-0.5">
                      <div className="font-bold text-[1.1rem] text-[var(--dark)] leading-tight">{doctor.full_name}</div>
                      <div className="text-[0.88rem] text-[var(--primary)] font-semibold mt-0.5">
                        {doctor.specialization || "General"} · {doctor.qualification}
                      </div>

                      <div className="mt-2.5 space-y-1">
                        {doctor.clinic_name && (
                          <div className="text-[0.85rem] text-[var(--muted)]">{doctor.clinic_name}</div>
                        )}
                        <div className="text-[0.85rem] text-[var(--muted)]">
                          {doctor.experience_years ?? 0}+ years experience
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/doctors/${doctor.doctor_id}`)}
                        className="mt-3 text-white font-semibold rounded-[var(--radius-sm)] px-3.5 py-1.5 text-[0.78rem]"
                        style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)" }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: booking options */}
                <div className="flex flex-col gap-2.5 lg:w-64 shrink-0 lg:justify-center">
                  {doctor.supports_clinic && (
                    <button
                      onClick={() => toggleExpanded(doctor.doctor_id, "clinic")}
                      className="flex items-center gap-2.5 rounded-lg border-2 transition-colors px-3 py-2.5 text-left"
                      style={{
                        borderColor: expanded?.doctorId === doctor.doctor_id && expanded.mode === "clinic" ? "var(--primary)" : "var(--primary-bg)",
                        background: "var(--primary-bg)",
                      }}
                    >
                      <span className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-[var(--primary)] shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 21V8l8-5 8 5v13" />
                          <path d="M9 21v-6h6v6" />
                          <path d="M9 12h.01M15 12h.01M12 8h.01" />
                        </svg>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[0.82rem] text-[var(--dark)]">Clinic Visit</span>
                        <span className="block text-[0.7rem] text-[var(--muted)]">Consultation at clinic</span>
                      </span>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </button>
                  )}

                  {doctor.supports_video && (
                    <button
                      onClick={() => toggleExpanded(doctor.doctor_id, "video")}
                      className="flex items-center gap-2.5 rounded-lg border-2 transition-colors px-3 py-2.5 text-left"
                      style={{
                        borderColor: expanded?.doctorId === doctor.doctor_id && expanded.mode === "video" ? "var(--success)" : "var(--success-bg)",
                        background: "var(--success-bg)",
                      }}
                    >
                      <span className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-[var(--success)] shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3.5l4 3V7.5l-4 3Z" />
                        </svg>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[0.82rem] text-[var(--dark)]">Video Consult</span>
                        <span className="block text-[0.7rem] text-[var(--muted)]">Consultation over video call</span>
                      </span>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--success)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline expansion — same page, no navigation. Clicking
                  Clinic Visit / Video Consult again (or the other mode)
                  swaps this section in place instead of opening a new page. */}
              {expanded?.doctorId === doctor.doctor_id && (
                <div className="mt-5 pt-5 border-t border-black/5">
                  <TimeSlotSelector
                    doctorId={doctor.doctor_id}
                    consultationMode={expanded.mode}
                    onContinue={(date, timeSlot) => handleContinue(doctor.doctor_id, expanded.mode, date, timeSlot)}
                  />
                </div>
              )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
