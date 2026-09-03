import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INDIAN_CITIES } from "../../data/indianCities";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** City text input with an Indian-cities autocomplete dropdown. Matches
 * whose name starts with the typed text are ranked first (so typing "c"
 * surfaces Chennai/Chandigarh/Coimbatore before a city that merely contains
 * a "c" somewhere in the middle), then "contains" matches, then A–Z.
 *
 * The dropdown is portaled to document.body and positioned from the input's
 * bounding rect — several call sites live inside a `.glass-card`, which sets
 * `overflow: hidden` for its top gradient bar, and an absolutely-positioned
 * dropdown nested inside that would get silently clipped. */
export function CityAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const startsWith: string[] = [];
    const contains: string[] = [];
    for (const city of INDIAN_CITIES) {
      const c = city.toLowerCase();
      if (c.startsWith(q)) startsWith.push(city);
      else if (c.includes(q)) contains.push(city);
    }
    startsWith.sort((a, b) => a.localeCompare(b));
    contains.sort((a, b) => a.localeCompare(b));
    return [...startsWith, ...contains].slice(0, 8);
  }, [value]);

  const updateRect = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
  };

  useEffect(() => {
    if (!open) return;
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => value.trim() && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        autoComplete="off"
        className={className}
      />

      {open &&
        suggestions.length > 0 &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            style={{ position: "absolute", top: rect.top, left: rect.left, width: rect.width }}
            className="z-[999] max-h-64 overflow-y-auto rounded-[var(--radius-sm)] border border-[#e2e8f0] bg-white shadow-lg py-1 text-left"
          >
            {suggestions.map((city, i) => (
              <li key={city}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(city)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-3.5 py-2 text-[0.9rem] ${
                    i === highlight ? "bg-[var(--primary-bg)] text-[var(--primary)]" : "text-[var(--dark)]"
                  }`}
                >
                  {city}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}
