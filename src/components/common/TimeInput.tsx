// src/components/common/TimeInput.tsx
// קלט שעה משותף לכל האתר - מציג/מקבל תמיד HH:mm בפורמט 24 שעות, בלי
// תלות בהגדרות אזוריות של הדפדפן/מחשב (בניגוד ל-input type="time"
// הרגיל, שעלול להציג AM/PM אצל חלק מהמשתמשות). כלפי חוץ (value/onChange)
// תמיד מחרוזת "HH:mm".
import { useEffect, useState, type ChangeEvent } from "react";
import "./TimeInput.css";

interface TimeInputProps {
  value: string; // "HH:mm", 24 שעות
  onChange: (time: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

function isValidTime(hh: number, mm: number): boolean {
  return Number.isInteger(hh) && Number.isInteger(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function parseTime(raw: string): string | null {
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!isValidTime(hh, mm)) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// מוסיפה ":" אוטומטית אחרי שתי ספרות השעה תוך כדי הקלדה, כדי שהקלט
// יישאר תמיד HH:mm בלי שהמשתמשת תצטרך להקליד את ה":" בעצמה.
function autoColon(raw: string, previous: string): string {
  if (raw.length < previous.length) return raw;
  const digitsOnly = raw.replace(/\D/g, "").slice(0, 4);
  let out = "";
  for (let i = 0; i < digitsOnly.length; i++) {
    out += digitsOnly[i];
    if (i === 1) out += ":";
  }
  return out;
}

export default function TimeInput({
  value,
  onChange,
  className,
  id,
  required,
  disabled,
  placeholder = "HH:mm",
}: TimeInputProps) {
  const [display, setDisplay] = useState(value || "");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDisplay(value || "");
    setInvalid(false);
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = autoColon(e.target.value, display);
    setDisplay(next);
    const parsed = parseTime(next);
    if (parsed) {
      setInvalid(false);
      onChange(parsed);
    } else {
      setInvalid(next.length > 0);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      dir="ltr"
      maxLength={5}
      className={`time-input-text${invalid ? " time-input-invalid" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}
