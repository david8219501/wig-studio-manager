// src/components/common/InfoTooltip.tsx
// אייקון הסבר קטן (ⓘ) לשימוש חוזר ליד כל מדד פיננסי/מספרי שעלול להיות
// מבולבל - hover (לעכבר) או לחיצה (למסך מגע) מציגים בועית טקסט קטנה.
// לא תלוי ב-createPortal (בשונה מ-DateInput/TimeInput/CustomSelect) -
// אלה נדרשו למיקום פופ-אפ מורכב מול תפריטי דפדפן/OS; זו רק בועית טקסט
// סטטית שממוקמת יחסית לאייקון עצמו, בלי בעיית מיקום דומה.
//
// הרכיב עצמו מרנדר את אלמנט ההורה (span/h2/th, לפי `as`) שעוטף גם את
// `label` (הכותרת/הטקסט הסמוך, למשל "יתרת חובות פתוחים") וגם את האייקון -
// כך שריחוף בכל מקום בתוך האזור המורחב (טקסט או אייקון) פותח את אותה
// בועית אחת, לא רק ריחוף מדויק על האייקון הקטן. `className`/`as` קיימים
// כדי לשמר את העיצוב/הסמנטיקה המקוריים של כל מקום שימוש (stat-label/
// kpi-label/fin-title/th וכו') - עוברים ישירות לאלמנט ההורה הזה.
//
// הבועית עצמה עדיין מקוננת בתוך `.info-tooltip` (position: relative)
// הצמוד לאייקון בלבד - כך שהיא נפתחת ליד האייקון, לא ליד תחילת הטקסט
// (שיכול להיות ארוך).
import { useState, type ReactNode } from "react";
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
  const Wrapper = as;

  return (
    <Wrapper
      className={`info-tooltip-wrapper ${className || ""}`.trim()}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {label}
      <span className="info-tooltip">
        <button
          type="button"
          className="info-tooltip-icon"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label="הסבר"
        >
          <Info size={16} strokeWidth={2} />
        </button>
        {isOpen && <span className="info-tooltip-bubble" role="tooltip">{text}</span>}
      </span>
    </Wrapper>
  );
}
