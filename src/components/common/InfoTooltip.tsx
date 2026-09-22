// src/components/common/InfoTooltip.tsx
// אייקון הסבר קטן (ⓘ) לשימוש חוזר ליד כל מדד פיננסי/מספרי שעלול להיות
// מבולבל - hover (לעכבר) או לחיצה (למסך מגע) מציגים בועית טקסט קטנה.
//
// הרכיב עצמו מרנדר את אלמנט ההורה (span/h2/th, לפי `as`) שעוטף גם את
// `label` (הכותרת/הטקסט הסמוך, למשל "יתרת חובות פתוחים") וגם את האייקון -
// כך שריחוף בכל מקום בתוך האזור המורחב (טקסט או אייקון) פותח את אותה
// בועית אחת, לא רק ריחוף מדויק על האייקון הקטן. `className`/`as` קיימים
// כדי לשמר את העיצוב/הסמנטיקה המקוריים של כל מקום שימוש (stat-label/
// kpi-label/fin-title/th וכו') - עוברים ישירות לאלמנט ההורה הזה.
//
// הבועית מרונדרת ב-createPortal ישירות ל-document.body (לא כילד מקונן
// בתוך הטבלה/th) - חלק מהמקומות (Reports.tsx, "מאזן חודשי") נמצאים
// בתוך קונטיינר עם overflow-x:auto משלו, ובועית מקוננת בתוכו נחתכת שם.
// המיקום מחושב מ-getBoundingClientRect() של האייקון (position: fixed,
// יחסי ל-viewport - לא צריך להוסיף scrollX/scrollY בעצמנו) ומתעדכן חי
// כל עוד הבועית פתוחה, על scroll (כל קונטיינר גלילה, לא רק הדף - ראו
// capture: true) ו-resize - לא רק פעם אחת בפתיחה.
import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import "./InfoTooltip.css";

interface InfoTooltipProps {
  text: string;
  label: ReactNode;
  className?: string;
  as?: "span" | "h2" | "th";
}

export default function InfoTooltip({ text, label, className, as = "span" }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const Wrapper = as;

  const updatePosition = () => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBubblePos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  };

  const open = () => {
    updatePosition();
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePosition, { passive: true, capture: true });
    window.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", updatePosition, { capture: true });
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  return (
    <Wrapper
      className={`info-tooltip-wrapper ${className || ""}`.trim()}
      onMouseEnter={open}
      onMouseLeave={close}
    >
      {label}
      <span className="info-tooltip">
        <button
          ref={iconRef}
          type="button"
          className="info-tooltip-icon"
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) close();
            else open();
          }}
          aria-label="הסבר"
        >
          <Info size={16} strokeWidth={2} />
        </button>
      </span>
      {isOpen && bubblePos &&
        createPortal(
          <span
            className="info-tooltip-bubble"
            role="tooltip"
            style={{ top: bubblePos.top, left: bubblePos.left }}
          >
            {text}
          </span>,
          document.body
        )}
    </Wrapper>
  );
}
