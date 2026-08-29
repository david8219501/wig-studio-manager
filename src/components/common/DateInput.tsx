// src/components/common/DateInput.tsx
// קלט תאריך משותף לכל האתר - מציג/מקבל תמיד dd/mm/yyyy, בלי תלות
// בהגדרות אזוריות של הדפדפן/מחשב. כלפי חוץ (value/onChange) תמיד ISO
// "yyyy-mm-dd", כדי לא לשבור קוד קיים שכבר עובד עם תאריכי ISO.
//
// לוח השנה הגרפי הוא רכיב עצמאי משלנו (לא showPicker() על input
// מובנה) - התברר שבסביבות מסוימות (בעיקר לינוקס/תוך iframe של תצוגה
// מקדימה) בורר תאריך מובנה של הדפדפן מתעלם ממיקום השדה בעמוד ונפתח
// כ"חלון מערכת" נפרד, למשל בראש הדף. כדי לשלוט לגמרי במיקום, הפאנל
// מוצג דרך React portal (createPortal ל-document.body) עם
// position:fixed שמחושב מ-getBoundingClientRect() של השדה עצמו בכל
// פתיחה - לא מסתמך על שום CSS positioning context של הורים, ולכן חסין
// גם לכל transform/filter/overflow שעלול להיות על אב כלשהו.
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft } from "lucide-react";
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

const MONTH_NAMES = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const WEEKDAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // ראשון..שבת

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

function toIso(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// מוסיפה "/" אוטומטית אחרי היום ואחרי החודש תוך כדי הקלדה, כדי שהקלט
// יישאר תמיד dd/mm/yyyy בלי שהמשתמשת תצטרך להקליד את ה"/" בעצמה.
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

interface PickerPosition {
  top: number;
  left: number;
  width: number;
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
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-11

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // מסתנכרן עם value חיצוני (למשל טעינת פגישה קיימת לעריכה)
  useEffect(() => {
    setDisplay(isoToDisplay(value));
    setInvalid(false);
  }, [value]);

  // סגירה בלחיצה מחוץ לשדה/לפאנל, וב-Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    // תופס גם גלילה בתוך אלמנטים מקוננים (capture=true) כדי שהפאנל לא
    // יישאר "תלוי" במקום הישן אחרי גלילה של המודל/העמוד.
    const handleScrollOrResize = () => setIsOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

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

  const openPicker = () => {
    if (disabled || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });

    const base = displayToIso(display);
    const [y, m] = base ? base.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
    setViewYear(y);
    setViewMonth(m - 1);
    setIsOpen(true);
  };

  const pickDay = (day: number) => {
    const iso = toIso(viewYear, viewMonth, day);
    setDisplay(isoToDisplay(iso));
    setInvalid(false);
    onChange(iso);
    setIsOpen(false);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectedIso = displayToIso(display);
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=ראשון
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <span className={`date-input-wrapper ${className ?? ""}`} ref={wrapperRef}>
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

      {isOpen && position &&
        createPortal(
          <div
            ref={panelRef}
            className="date-input-calendar-panel"
            style={{ top: position.top, left: position.left, minWidth: position.width }}
          >
            <div className="date-input-calendar-header">
              <button type="button" onClick={goPrevMonth} aria-label="חודש קודם">
                <ChevronLeft size={16} />
              </button>
              <span className="date-input-calendar-title">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button type="button" onClick={goNextMonth} aria-label="חודש הבא">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="date-input-calendar-weekdays">
              {WEEKDAY_LETTERS.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="date-input-calendar-grid">
              {cells.map((day, idx) => {
                if (day === null) return <span key={idx} className="date-input-calendar-cell-empty" />;
                const iso = toIso(viewYear, viewMonth, day);
                const isSelected = iso === selectedIso;
                return (
                  <button
                    type="button"
                    key={idx}
                    className={`date-input-calendar-cell${isSelected ? " date-input-calendar-cell-selected" : ""}`}
                    onClick={() => pickDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
