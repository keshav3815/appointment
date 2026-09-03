import { useParams } from "react-router-dom";
import { PatientNav } from "../../components/patient/PatientNav";

/** Placeholder video-consultation room. The Appointment Letter links here for
 * video bookings; no video-calling infrastructure (WebRTC/Jitsi/etc.) is
 * wired up yet — this just confirms the room exists instead of 404ing. */
export function VideoRoomPage() {
  const { appointmentId } = useParams();

  return (
    <div className="bg-white min-h-screen">
      <PatientNav />
      <div className="max-w-lg mx-auto px-4 py-20 text-center relative z-10">
        <div className="glass-card p-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            🎥
          </div>
          <h1 className="font-bold text-[1.2rem] text-[var(--dark)] mb-2">
            Video Room — Appointment #{appointmentId}
          </h1>
          <p className="text-[var(--muted)] text-[0.9rem]">
            Live video consultation isn't wired up yet. This is a placeholder for the room your
            appointment letter links to — check back closer to your appointment time.
          </p>
        </div>
      </div>
    </div>
  );
}
