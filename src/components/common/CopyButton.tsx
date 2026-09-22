// src/components/common/CopyButton.tsx
// כפתור העתקה קטן לשימוש חוזר - navigator.clipboard.writeText + משוב
// הצלחה (✓ ירוק) למשך 1.5 שניות. שני מצבי תצוגה: אייקון-בלבד (id/טלפון/
// אימייל) או עם label טקסטואלי ליד האייקון (כפתורי "העתק לשליחה"/"העתק סיכום").
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import "./CopyButton.css";

interface CopyButtonProps {
  text: string;
  label?: string;
  title?: string;
  className?: string;
}

export default function CopyButton({ text, label, title, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
    }
  };

  return (
    <button
      type="button"
      className={`copy-button ${label ? "copy-button--labeled" : "copy-button--icon"} ${className || ""}`}
      onClick={handleCopy}
      aria-label={title || label || "העתק"}
      title={title || label || "העתק"}
    >
      {copied ? (
        <Check size={label ? 16 : 14} className="copy-button-success" />
      ) : (
        <Copy size={label ? 16 : 14} />
      )}
      {label && <span>{copied ? "הועתק" : label}</span>}
    </button>
  );
}
