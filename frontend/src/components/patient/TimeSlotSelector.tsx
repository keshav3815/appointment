import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../api/client";

interface SlotInfo {
  time_slot: string;
  available: boolean;
}

interface SlotsResponse {
  status: string;
  is_available_day: boolean;
  slots: SlotInfo[];
}

interface DayEntry {
  status: "loading" | "ready" | "error";
  isAvailableDay: boolean;
  slots: SlotInfo[];
}

const VISIBLE_DAYS = 4;
const PERIOD_ICON: Record<"Morning" | "Afternoon" | "Evening" | "Night", string> = {
  Morning: "☼",
  Afternoon: "☀",
  Evening: "☾",
  Night: "✦",
};
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateLabel(d: Date, offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function to12Hour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${period}`;
}

/** "09:00 – 10:00" -> "9:00 AM – 10:00 AM" — each button shows the full
 * one-hour window (start AND end), and the stored slot value is unchanged —
 * it's sent to the backend exactly as-is, this is a display-only label. */
function formatSlotLabel(timeSlot: string): string {
  const [start, end] = timeSlot.split("–").map((s) => s.trim());
  if (!end) return to12Hour(start);
  return `${to12Hour(start)} – ${to12Hour(end)}`;
}

function slotHour(timeSlot: string): number {
  const start = timeSlot.split("–")[0]?.trim() ?? timeSlot;
  return parseInt(start.split(":")[0], 10);
}

interface Props {
  doctorId: number;
  consultationMode: "clinic" | "video";
  onContinue: (date: string, timeSlot: string) => void;
}

/** One reusable slot-picker for both consultation modes — Clinic Visit and
 * Video Consult reuse this exact component, only `consultationMode` differs,
 * which is what keeps their availability (and the API calls behind it)
 * completely separate. */
export function TimeSlotSelector({ doctorId, consultationMode, onContinue }: Props) {
  const [windowStart, setWindowStart] = useState(0);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  // Keyed by "mode:offset" — clinic and video must never share cached
  // availability for the same date, otherwise toggling modes on this same
  // component instance (no remount) would show one mode's stale slots under
  // the other.
  const [days, setDays] = useState<Record<string, DayEntry>>({});
  const dayKey = (offset: number) => `${consultationMode}:${offset}`;
  const [continueError, setContinueError] = useState<string | null>(null);
  const [checkingSlot, setCheckingSlot] = useState(false);

  const today = useMemo(() => new Date(), []);
  const accent = consultationMode === "video" ? "var(--success)" : "var(--primary)";
  const accentBg = consultationMode === "video" ? "var(--success-bg)" : "var(--primary-bg)";

  const visibleOffsets = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => windowStart + i),
    [windowStart]
  );

  useEffect(() => {
    visibleOffsets.forEach((offset) => {
      const key = dayKey(offset);
      if (days[key]) return;
      setDays((prev) => ({ ...prev, [key]: { status: "loading", isAvailableDay: false, slots: [] } }));
      const dateStr = toDateStr(addDays(today, offset));
      apiClient
        .get<SlotsResponse>(`/doctors/${doctorId}/slots?date=${dateStr}&mode=${consultationMode}`)
        .then((res) =>
          setDays((prev) => ({
            ...prev,
            [key]: { status: "ready", isAvailableDay: res.is_available_day, slots: res.slots },
          }))
        )
        .catch(() =>
          setDays((prev) => ({ ...prev, [key]: { status: "error", isAvailableDay: false, slots: [] } }))
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleOffsets, doctorId, consultationMode]);

  const selectedDay = days[dayKey(selectedOffset)];

  const groups = useMemo(() => {
    const slots = selectedDay?.slots ?? [];
    return {
      Morning: slots.filter((s) => slotHour(s.time_slot) < 12),
      Afternoon: slots.filter((s) => slotHour(s.time_slot) >= 12 && slotHour(s.time_slot) < 16),
      Evening: slots.filter((s) => slotHour(s.time_slot) >= 16 && slotHour(s.time_slot) < 19),
      Night: slots.filter((s) => slotHour(s.time_slot) >= 19),
    };
  }, [selectedDay]);

  const pickDate = (offset: number) => {
    setSelectedOffset(offset);
    setSelectedSlot(null);
    setContinueError(null);
  };

  const pickSlot = (timeSlot: string) => {
    setSelectedSlot(timeSlot);
    setContinueError(null);
  };

  /** Backend is the only source of truth: re-fetch this exact date+mode right
   * before handing off to booking, so a slot someone else just took (in the
   * seconds since this list loaded) is caught here with a clear message
   * instead of only surfacing as a raw error later at payment time. */
  const handleContinueClick = async () => {
    if (!selectedSlot || checkingSlot) return;
    setCheckingSlot(true);
    setContinueError(null);
    const dateStr = toDateStr(addDays(today, selectedOffset));
    try {
      const res = await apiClient.get<SlotsResponse>(
        `/doctors/${doctorId}/slots?date=${dateStr}&mode=${consultationMode}`
      );
      setDays((prev) => ({
        ...prev,
        [dayKey(selectedOffset)]: { status: "ready", isAvailableDay: res.is_available_day, slots: res.slots },
      }));
      const fresh = res.slots.find((s) => s.time_slot === selectedSlot);
      if (!fresh?.available) {
        setContinueError("This time slot has just been booked by another patient. Please select another slot.");
        setSelectedSlot(null);
        setCheckingSlot(false);
        return;
      }
      setCheckingSlot(false);
      onContinue(dateStr, selectedSlot);
    } catch {
      setCheckingSlot(false);
      setContinueError("Couldn't verify slot availability. Please try again.");
    }
  };

  return (
    <div>
      {/* date strip */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setWindowStart((w) => Math.max(0, w - VISIBLE_DAYS))}
          disabled={windowStart === 0}
          className="shrink-0 w-9 h-9 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center text-[var(--muted)] disabled:opacity-30 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          aria-label="Earlier dates"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>

        <div className="flex-1 grid grid-cols-4 gap-2">
          {visibleOffsets.map((offset) => {
            const d = addDays(today, offset);
            const entry = days[dayKey(offset)];
            const isSelected = offset === selectedOffset;
            const count = entry?.status === "ready" ? entry.slots.filter((s) => s.available).length : null;

            return (
              <button
                key={offset}
                type="button"
                onClick={() => pickDate(offset)}
                className="rounded-xl border-2 px-2 py-2.5 text-center transition-colors"
                style={{
                  borderColor: isSelected ? accent : "#e2e8f0",
                  background: isSelected ? accentBg : "#fff",
                }}
              >
                <div className="text-[0.78rem] font-bold text-[var(--dark)] truncate">{dateLabel(d, offset)}</div>
                <div className="text-[0.7rem] font-semibold mt-0.5" style={{ color: isSelected ? accent : "var(--muted)" }}>
                  {entry?.status === "ready" ? `${count} Slot${count === 1 ? "" : "s"}` : entry?.status === "error" ? "—" : "…"}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setWindowStart((w) => w + VISIBLE_DAYS)}
          className="shrink-0 w-9 h-9 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          aria-label="Later dates"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="h-px bg-[#e2e8f0] my-5" />

      {/* slots for the selected date */}
      {(!selectedDay || selectedDay.status === "loading") && (
        <div className="py-10 text-center text-[var(--muted)] text-sm">Loading slots…</div>
      )}

      {selectedDay?.status === "error" && (
        <div className="py-10 text-center text-[var(--danger)] text-sm">
          Couldn't load slots for this date. Please try another day.
        </div>
      )}

      {selectedDay?.status === "ready" && !selectedDay.isAvailableDay && (
        <div className="py-10 text-center text-[var(--muted)] text-sm">
          The doctor isn't available on this day. Please pick another date.
        </div>
      )}

      {selectedDay?.status === "ready" &&
        selectedDay.isAvailableDay &&
        (["Morning", "Afternoon", "Evening", "Night"] as const).map((period) =>
          groups[period].length > 0 ? (
            <div key={period} className="mb-5 last:mb-0">
              <div className="flex items-center gap-1.5 font-semibold text-[0.85rem] text-[var(--dark)] mb-2.5">
                <span>{PERIOD_ICON[period]}</span>
                {period}
              </div>
              <div className="flex flex-wrap gap-2">
                {groups[period].map((s) => {
                  const isSelected = selectedSlot === s.time_slot;
                  const isBooked = !s.available;
                  return (
                    <button
                      key={s.time_slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => pickSlot(s.time_slot)}
                      className="flex flex-col items-center gap-0.5 rounded-lg border-2 px-3.5 py-2 text-[0.85rem] font-semibold transition-colors disabled:cursor-not-allowed"
                      style={{
                        borderColor: isBooked ? "#e2e8f0" : isSelected ? accent : "var(--success)",
                        background: isBooked ? "#f1f5f9" : isSelected ? accent : "var(--success-bg)",
                        color: isBooked ? "#94a3b8" : isSelected ? "#fff" : "var(--dark)",
                      }}
                    >
                      <span className={isBooked ? "line-through" : ""}>{formatSlotLabel(s.time_slot)}</span>
                      <span
                        className="text-[0.62rem] font-bold uppercase tracking-wide"
                        style={{ color: isBooked ? "#94a3b8" : isSelected ? "#fff" : "var(--success)" }}
                      >
                        {isBooked ? "⚪ Booked" : isSelected ? "✓ Selected" : "🟢 Available"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null
        )}

      {continueError && (
        <div className="mt-4 text-[0.85rem] font-medium text-[var(--danger)] bg-[#fef2f2] border border-[#fecaca] rounded-[var(--radius-sm)] px-4 py-2.5">
          {continueError}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          type="button"
          disabled={!selectedSlot || checkingSlot}
          onClick={handleContinueClick}
          className="text-white font-semibold rounded-[var(--radius-md)] px-8 py-3 min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed transition-transform enabled:hover:-translate-y-0.5"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)`, boxShadow: "var(--shadow-btn)" }}
        >
          {checkingSlot ? "Checking…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
