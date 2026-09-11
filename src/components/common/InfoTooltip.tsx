// src/components/common/InfoTooltip.tsx
// אייקון הסבר קטן (ⓘ) לשימוש חוזר ליד כל מדד פיננסי/מספרי שעלול להיות
// מבולבל - hover (לעכבר) או לחיצה (למסך מגע) מציגים בועית טקסט קטנה.
// לא תלוי ב-createPortal (בשונה מ-DateInput/TimeInput/CustomSelect) -
// אלה נדרשו למיקום פופ-אפ מורכב מול תפריטי דפדפן/OS; זו רק בועית טקסט
// סטטית שממוקמת יחסית לאייקון עצמו, בלי בעיית מיקום דומה.
import { useState } from "react";
import "./InfoTooltip.css";

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span
      className="info-tooltip"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="info-tooltip-icon"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="הסבר"
      >
        ⓘ
      </button>
      {isOpen && <span className="info-tooltip-bubble" role="tooltip">{text}</span>}
    </span>
  );
}
