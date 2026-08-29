// src/components/common/DateInput.tsx
// קלט תאריך משותף לכל האתר - מציג/מקבל תמיד dd/mm/yyyy, בלי תלות
// בהגדרות אזוריות של הדפדפן/מחשב (בניגוד ל-input type="date" הרגיל,
// שהפורמט שלו משתנה לפי locale - בדיוק כמו הבעיה שהייתה עם האימוג'ים,
// כל אחת רואה משהו אחר). כלפי חוץ (value/onChange) תמיד ISO
// "yyyy-mm-dd", כדי לא לשבור קוד קיים שכבר עובד עם תאריכי ISO.
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import "./DateInput.css";

interface DateInputProps {
  value: string; // ISO "yyyy-mm-dd", מחרוזת ריקה מותרת
  onChange: (isoDate: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

function isoToDisplay(iso: string): string {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

function displayToIso(display: string): string | null {
  const match = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidCalendarDate(day, month, year)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// מוסיפה "/" אוטומטית אחרי היום ואחרי החודש תוך כדי הקלדה, כדי שהקלט
// יישאר תמיד dd/mm/yyyy בלי שהמשתמשת תצטרך להקליד את ה"/" בעצמה.
// לא מתערבת במחיקה (raw קצר מ-previous) כדי שאפשר יהיה למחוק תווים כרגיל.
function autoSlash(raw: string, previous: string): string {
  if (raw.length < previous.length) return raw;
  const digitsOnly = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digitsOnly.length; i++) {
    out += digitsOnly[i];
    if (i === 1 || i === 3) out += "/";
  }
  return out;
}

export default function DateInput({
  value,
  onChange,
  className,
  id,
  required,
  disabled,
  placeholder = "dd/mm/yyyy",
}: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [invalid, setInvalid] = useState(false);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  // מסתנכרן עם value חיצוני (למשל טעינת פגישה קיימת לעריכה)
  useEffect(() => {
    setDisplay(isoToDisplay(value));
    setInvalid(false);
  }, [value]);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = autoSlash(e.target.value, display);
    setDisplay(next);
    const iso = displayToIso(next);
    if (iso) {
      setInvalid(false);
      onChange(iso);
    } else {
      setInvalid(next.length > 0);
    }
  };

  const handleNativePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (!iso) return;
    setDisplay(isoToDisplay(iso));
    setInvalid(false);
    onChange(iso);
  };

  const openPicker = () => {
    const picker = nativePickerRef.current;
    if (!picker || disabled) return;
    if (typeof picker.showPicker === "function") {
      try {
        picker.showPicker();
        return;
      } catch {
        // חלק מהדפדפנים זורקים אם showPicker נקרא במצב לא מתאים - נופלים ל-focus/click רגיל
      }
    }
    picker.focus();
    picker.click();
  };

  return (
    <span className={`date-input-wrapper ${className ?? ""}`}>
      <input
        type="text"
        inputMode="numeric"
        id={id}
        value={display}
        onChange={handleTextChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        dir="ltr"
        maxLength={10}
        className={`date-input-text${invalid ? " date-input-invalid" : ""}`}
      />
      <button
        type="button"
        className="date-input-picker-btn"
        onClick={openPicker}
        disabled={disabled}
        tabIndex={-1}
        aria-label="פתיחת לוח שנה"
      >
        <CalendarIcon size={16} />
      </button>
      {/* input נסתר - רק כדי להפעיל את בורר התאריך הגרפי המובנה של
          הדפדפן; התצוגה/הקלט הטקסטואלי למעלה הם תמיד dd/mm/yyyy. */}
      <input
        ref={nativePickerRef}
        type="date"
        value={value || ""}
        onChange={handleNativePickerChange}
        className="date-input-native-hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  );
}
