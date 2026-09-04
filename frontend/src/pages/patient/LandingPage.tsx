import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { CityAutocomplete } from "../../components/patient/CityAutocomplete";
import { DoctorAvatar } from "../../components/patient/DoctorAvatar";
import { PatientNav } from "../../components/patient/PatientNav";
import { SpecialtyIcon } from "../../components/patient/SpecialtyIcon";
import { usePatientAuth } from "../../context/PatientAuthContext";
import { DEPARTMENTS } from "../../types/wizard";

const SPECIALTY_BLURB: Record<string, string> = {
  "General Medicine": "Routine checkups & care",
  Orthopaedics: "Bone & joint specialists",
  Cardiology: "Heart & vascular care",
  Dermatology: "Skin & hair experts",
  ENT: "Ear, nose & throat care",
  Gynaecology: "Women's health experts",
  Neurology: "Brain & nerve specialists",
  Paediatrics: "Child health experts",
  Ophthalmology: "Eye care specialists",
  Psychiatry: "Mental health support",
};

interface DoctorCard {
  doctor_id: number;
  full_name: string;
  specialization: string | null;
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  city: string | null;
  gender: string | null;
  supports_clinic: boolean;
  supports_video: boolean;
  photo_url: string | null;
}

function DoctorPreviewCard({ doctor }: { doctor: DoctorCard }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/doctors/${doctor.doctor_id}`)}
      className="text-left glass-card p-5 hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-center gap-3 mb-3">
        <DoctorAvatar photoUrl={doctor.photo_url} name={doctor.full_name} className="w-12 h-12" />
        <div className="min-w-0">
          <div className="font-bold text-[var(--dark)] truncate">{doctor.full_name}</div>
          <div className="text-[0.82rem] text-[var(--primary)] font-semibold truncate">
            {doctor.specialization || "General"}
          </div>
        </div>
      </div>
      <div className="text-[0.82rem] text-[var(--muted)] flex justify-between">
        <span>{doctor.experience_years ?? 0}+ yrs exp.</span>
        <span>{doctor.city || "—"}</span>
      </div>
      <div className="text-[0.82rem] font-bold text-[var(--dark)] mt-2">
        ₹{doctor.consultation_fee ?? "—"} consultation
      </div>
    </button>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { loading } = usePatientAuth();
  const [specialization, setSpecialization] = useState("");
  const [location, setLocation] = useState("");
  const [featured, setFeatured] = useState<DoctorCard[]>([]);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ status: string; doctors: DoctorCard[] }>("/doctors")
      .then((res) => setFeatured(res.doctors.slice(0, 6)))
      .catch(() => setFeatured([]));
  }, []);

  const runSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = new URLSearchParams();
    if (specialization) query.set("specialization", specialization);
    if (location.trim()) query.set("city", location.trim());
    const target = `/doctors${query.toString() ? `?${query.toString()}` : ""}`;

    if (loading) return; // auth state still resolving — avoid a flash redirect
    // Auth gate: booking requires an account, but the check only fires here,
    // never on the landing page itself.
    apiClient
      .get("/patient/me")
      .then(() => navigate(target))
      .catch(() => navigate(`/login?returnTo=${encodeURIComponent(target)}`));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location isn't supported on this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const address = data.address || {};
          const city: string | undefined =
            address.city || address.town || address.village || address.municipality || address.county || address.state;
          if (city) {
            setLocation(city);
          } else {
            setLocationError("Couldn't work out your city — please type it.");
          }
        } catch {
          setLocationError("Couldn't detect your location — please type it.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied — please type your city."
            : "Couldn't detect your location — please type it."
        );
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="bg-white min-h-screen">
      <PatientNav />

      <section className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 pt-16 pb-12 text-center relative z-10">
        <h1 className="font-extrabold text-[2rem] md:text-[2.6rem] leading-tight text-[var(--dark)] mb-3">
          Find the right doctor,
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            book in minutes
          </span>
        </h1>
        <p className="text-[var(--muted)] text-[1rem] max-w-xl mx-auto mb-8">
          Search verified specialists near you, compare fees and availability, and book a clinic
          visit or video consultation instantly.
        </p>

        <form
          onSubmit={runSearch}
          className="bg-white/95 backdrop-blur-sm border border-black/5 rounded-2xl md:rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.12)] max-w-3xl mx-auto flex flex-col md:flex-row md:items-center p-2 gap-1 md:gap-0"
        >
          <div className="flex items-center gap-2.5 flex-1 px-4 py-2 md:py-1.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--primary)] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v6a3 3 0 0 0 6 0V3" />
              <path d="M9 12v3a5 5 0 0 0 10 0v-2" />
              <circle cx="19" cy="10.5" r="2" />
            </svg>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full bg-transparent text-[0.92rem] text-[var(--dark)] focus:outline-none appearance-none"
            >
              <option value="">Any Specialist / Doctor Type</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:block w-px h-7 bg-black/10 shrink-0" />
          <div className="md:hidden h-px bg-black/10" />

          <div className="flex items-center gap-2.5 flex-1 px-4 py-2 md:py-1.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--primary)] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="2.8" />
            </svg>
            <CityAutocomplete
              value={location}
              onChange={setLocation}
              placeholder="City, e.g. Delhi"
              className="w-full bg-transparent text-[0.92rem] text-[var(--dark)] placeholder:text-[var(--muted)] focus:outline-none"
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              title="Use my current location"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border-2 border-[#cbd5e1] text-[var(--dark)] hover:border-[var(--dark)] disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {locating ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="currentColor">
                  <path d="M12 2a1 1 0 0 1 1 1v1.06A8.01 8.01 0 0 1 19.94 11H21a1 1 0 1 1 0 2h-1.06A8.01 8.01 0 0 1 13 19.94V21a1 1 0 1 1-2 0v-1.06A8.01 8.01 0 0 1 4.06 13H3a1 1 0 1 1 0-2h1.06A8.01 8.01 0 0 1 11 4.06V3a1 1 0 0 1 1-1Zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 3.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-white text-[var(--dark)] font-semibold rounded-full px-6 py-3 md:py-2.5 whitespace-nowrap shrink-0 border-2 border-[#cbd5e1] hover:border-[var(--dark)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search
          </button>
        </form>
        {locationError && (
          <p className="text-[0.8rem] text-[var(--warning)] mt-2.5">{locationError}</p>
        )}
      </section>

      <section className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 pb-12 relative z-10">
        <h2 className="font-bold text-[1.15rem] text-[var(--dark)] mb-4">Browse by Specialty</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              onClick={() => navigate(`/doctors?specialization=${encodeURIComponent(d)}`)}
              className="glass-card overflow-hidden text-left hover:-translate-y-0.5 transition-transform"
            >
              <div className="aspect-square w-full">
                <SpecialtyIcon name={d} />
              </div>
              <div className="px-4 py-3.5">
                <div className="font-bold text-[0.95rem] text-[var(--dark)] leading-snug">{d}</div>
                <div className="text-[0.78rem] text-[var(--muted)] mt-0.5">{SPECIALTY_BLURB[d]}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 pb-16 relative z-10">
          <h2 className="font-bold text-[1.15rem] text-[var(--dark)] mb-4">Featured Providers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {featured.map((d) => (
              <DoctorPreviewCard key={d.doctor_id} doctor={d} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-black/[0.06] bg-white/60 relative z-10">
        <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 py-8 flex flex-col md:flex-row justify-between gap-4 text-[0.85rem] text-[var(--muted)]">
          <div>© {new Date().getFullYear()} MedConnect. All rights reserved.</div>
          <div className="flex gap-5">
            <span className="flex items-center gap-1.5">📞 1800-XXX-XXXX</span>
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 32 32" className="w-4 h-4 shrink-0" fill="#25D366">
                <path d="M16.02 2.67C8.65 2.67 2.67 8.65 2.67 16.02c0 2.5.68 4.94 1.98 7.08L2.67 29.33l6.4-1.94a13.3 13.3 0 0 0 6.95 1.96h.01c7.37 0 13.35-5.98 13.35-13.35 0-3.57-1.39-6.92-3.91-9.44a13.28 13.28 0 0 0-9.45-3.9Zm0 24.42h-.01a11.1 11.1 0 0 1-5.66-1.55l-.4-.24-4.2 1.27 1.29-4.09-.26-.42a11.06 11.06 0 0 1-1.7-5.94c0-6.13 4.99-11.12 11.13-11.12 2.97 0 5.76 1.16 7.86 3.26a11.05 11.05 0 0 1 3.26 7.87c0 6.13-4.99 11.12-11.12 11.12Zm6.1-8.33c-.33-.17-1.97-.97-2.28-1.08-.31-.11-.53-.17-.75.17-.22.33-.86 1.08-1.06 1.31-.2.22-.39.25-.72.08-.33-.17-1.4-.52-2.66-1.65-.98-.88-1.65-1.96-1.84-2.29-.19-.33-.02-.51.15-.68.15-.15.33-.39.5-.58.17-.2.22-.33.33-.55.11-.22.06-.42-.03-.58-.08-.17-.75-1.81-1.03-2.48-.27-.65-.54-.56-.75-.57-.19-.01-.42-.01-.64-.01-.22 0-.58.08-.89.42-.31.33-1.17 1.14-1.17 2.79 0 1.64 1.2 3.22 1.37 3.45.17.22 2.36 3.6 5.71 5.05.8.34 1.42.55 1.9.7.8.25 1.53.22 2.11.13.64-.1 1.97-.8 2.25-1.58.28-.77.28-1.44.19-1.58-.08-.14-.3-.22-.63-.39Z" />
              </svg>
              WhatsApp Us
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
