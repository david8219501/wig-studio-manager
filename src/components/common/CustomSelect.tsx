// src/components/common/CustomSelect.tsx
// תחליף ל-<select> המובנה של הדפדפן, לשימוש בכל מקום באתר שנתקל באותה
// בעיה: תפריט <select> מובנה שמתעלם ממיקום השדה בעמוד ונפתח כ"חלון
// מערכת" נפרד (בעיקר בלינוקס / בתוך iframe של תצוגה מקדימה). הרשימה
// כאן היא div רגיל שמוצג דרך React portal (createPortal ל-document.body)
// עם position:fixed שמחושב מ-getBoundingClientRect() של הכפתור בכל
// פתיחה - מיקום נשלט לגמרי בקוד שלנו, לא מסתמך על CSS positioning
// context של הורים (ולכן חסין ל-transform/filter/overflow על אב כלשהו).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./CustomSelect.css";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "בחרי...",
  className,
  id,
  disabled,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
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

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`custom-select-trigger${className ? ` ${className}` : ""}`}
        onClick={toggleOpen}
        disabled={disabled}
      >
        <span className={selectedLabel ? "custom-select-value" : "custom-select-placeholder"}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown size={16} className={`custom-select-chevron${isOpen ? " custom-select-chevron-open" : ""}`} />
      </button>

      {isOpen && position &&
        createPortal(
          <div
            ref={menuRef}
            className="custom-select-menu"
            style={{ top: position.top, left: position.left, minWidth: position.width }}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`custom-select-option${option.value === value ? " custom-select-option-selected" : ""}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
