import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./Login.css";

export interface RegisterData {
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
  pass: string;
}

interface LoginProps {
  onLogin: (email: string, pass: string) => void;
  onRegister: (data: RegisterData) => void;
  isLoading?: boolean;
  errorMessage?: string;     // שגיאה שמגיעה מבחוץ (מ-App.tsx)
  successMessage?: string;   // הצלחה שמגיעה מבחוץ
}

export default function Login({ 
  onLogin, 
  onRegister, 
  isLoading = false,
  errorMessage = "",
  successMessage = "" 
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (isRegistering && password.length < 6) {
      setLocalError("הסיסמה חייבת לכלול לפחות 6 תווים.");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setLocalError("הסיסמאות אינן תואמות");
      return;
    }

    if (isRegistering) {
      onRegister({
        firstName,
        lastName,
        businessName,
        phone,
        email,
        pass: password,
      });
    } else {
      onLogin(email, password);
    }
  };

  // הצגת שגיאה מקומית (כמו אי התאמת סיסמאות) או שגיאה מהשרת
  const activeError = localError || errorMessage;

  return (
    <div className="login-page">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner-box">
            <div className="spinner-large"></div>
            <span>מעבד נתונים ומקים עסק...</span>
          </div>
        </div>
      )}

      <div className="login-card" style={{ maxWidth: isRegistering ? "500px" : "420px" }}>
        <div className="login-header">
          <h1>{isRegistering ? "יצירת חשבון עסק חדש" : "ניהול סלון פאות"}</h1>
          <p>{isRegistering ? "השלימי את פרטי העסק והמנהלת" : "התחברות למערכת הניהול המאובטחת"}</p>
        </div>

        {/* הודעת שגיאה מעוצבת בסגנון האתר */}
        {activeError && (
          <div className="login-error">
            {activeError}
          </div>
        )}

        {/* הודעת הצלחה מעוצבת בסגנון האתר */}
        {successMessage && (
          <div className="login-success">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegistering && (
            <>
              <div style={{ display: "flex", gap: "10px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>שם פרטי</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="שם פרטי"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>שם משפחה</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="שם משפחה"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>שם העסק</label>
                <input 
                  type="text" 
                  required 
                  placeholder="שם הסלון / העסק"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>מספר טלפון</label>
                <input 
                  type="tel" 
                  required 
                  dir="ltr"
                  placeholder="050-0000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>כתובת אימייל</label>
            <input 
              type="email"
              required
              dir="ltr"
              placeholder="כתובת האימייל שלך"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>סיסמה</label>
            <div className="password-field-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                required
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="form-group">
              <label>אימות סיסמה</label>
              <div className="password-field-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  dir="ltr"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary login-btn" disabled={isLoading}>
            {isRegistering ? "הירשמי והקימי עסק" : "התחבר למערכת"}
          </button>
        </form>

        <div className="login-switch-mode" style={{ textAlign: "center", marginTop: "16px" }}>
          <button 
            type="button" 
            onClick={() => { setIsRegistering(!isRegistering); setLocalError(""); }}
            disabled={isLoading}
            style={{ background: "none", border: "none", color: "#9b69ff", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
          >
            {isRegistering ? "כבר יש לך חשבון? התחברי כאן" : "אין לך חשבון עדיין? צרי חשבון עסק חדש"}
          </button>
        </div>

        <div className="login-footer">
          <span className="text-muted">גישה מורשית לעובדות ומנהלות בלבד</span>
        </div>
      </div>
    </div>
  );
}