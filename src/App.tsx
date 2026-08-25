import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { auth, db } from './services/firebase';
import Login, { type RegisterData } from './pages/Login/Login';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Clients from './pages/Clients/Clients';
import Calendar from './pages/Calendar/Calendar';
import Inventory from './pages/Inventory/Inventory';
import Calculators from './pages/Calculators/Calculators';
import Sales from './pages/Sales/Sales';
import Expenses from './pages/Expenses/Expenses';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // isLoggedIn משמש בעיקר להצגת הודעת ההצלחה בכניסה/הרשמה לפני המעבר,
  // אבל מקור האמת האמיתי לחיבור הוא currentUser (מגיע מ-onAuthStateChanged).
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // ניהול הודעות שגיאה והצלחה שיוצגו בעיצוב בתוך כרטיס הלוגין
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // בדיקת תקינות חיבור לפיירבייס בעליית האפליקציה (מופיע ב-F12 Console)
  useEffect(() => {
    const apps = getApps();
    if (apps.length > 0) {
      console.log("🔥 Firebase is successfully initialized and connected!");
    } else {
      console.error("❌ Firebase is NOT connected.");
    }
  }, []);

  // האזנה למצב ההתחברות האמיתי של Firebase, כדי שסשן קיים ישרוד רענון דף (F5)
  // ולא יזרוק את המשתמשת חזרה למסך ההתחברות כל פעם.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoggedIn(!!user);
      setCheckingSession(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePage('dashboard');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // פונקציית התחברות
  const handleLogin = async (email: string, pass: string) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setSuccessMessage("התחברת בהצלחה למערכת!");
      setTimeout(() => {
        setIsLoggedIn(true);
      }, 700); // השהייה קטנה כדי לתת למשתמש לראות את הודעת ההצלחה הירוקה
    } catch (error: any) {
      console.error("Login error:", error);
      // התאמת הודעות שגיאה ברורות וידידותיות למשתמש
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMessage("שגיאה בהתחברות: כתובת האימייל או הסיסמה שגויים.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("כתובת האימייל שהוזנה אינה חוקית.");
      } else {
        setErrorMessage("שגיאה בהתחברות למערכת. נסה שוב.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציית רישום משתמש חדש ושמירת נתוני עסק ב-Firestore
  const handleRegister = async (data: RegisterData) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. יצירת משתמש ב-Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.pass);
      const user = userCredential.user;

      // 2. שמירת פרטי העסק באוסף users בפיירבייס
      await setDoc(doc(db, "users", user.uid), {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        phone: data.phone,
        email: data.email,
        createdAt: new Date().toISOString(),
        role: "admin"
      });

      setSuccessMessage("העסק הוקם בהצלחה! נכנס למערכת...");
      setTimeout(() => {
        setIsLoggedIn(true);
      }, 900); // מעבר חלק לאחר הצגת הודעת ההצלחה
    } catch (error: any) {
      console.error("Registration error:", error);
      // התאמת הודעות שגיאה בעברית למקרי הרשמה שונים
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage("כתובת האימייל הזו כבר רשומה במערכת. נסה להתחבר.");
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage("הסיסמה חלשה מדי. יש להזין לפחות 6 תווים.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("כתובת האימייל שהוזנה אינה תקינה.");
      } else {
        setErrorMessage("שגיאה ביצירת החשבון: " + (error.message || "נסה שוב שנית."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // בזמן שבודקים אם יש סשן פעיל מ-Firebase - מציגים מסך טעינה קצר,
  // כדי לא "להבהב" למסך התחברות רגע לפני שמזהים שהמשתמשת כבר מחוברת.
  if (checkingSession) {
    return (
      <div className="app-session-loading">
        <div className="spinner-large" />
        <span>טוען...</span>
      </div>
    );
  }

  // אם המשתמש לא מחובר - נציג את מסך הלוגין/הרשמה המעוצב עם השגיאות וההצלחות
  if (!isLoggedIn) {
    return (
      <Login 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        isLoading={isLoading} 
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    );
  }

  // ניתוב העמודים במערכת
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'clients': return <Clients />;
      case 'calendar': return <Calendar />;
      case 'inventory': return <Inventory />;
      case 'calculators': return <Calculators />;
      case 'sales': return <Sales />;
      case 'expenses': return <Expenses />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings user={currentUser} onLogout={handleLogout} />;
      default: return <Dashboard />;
    }
  };

  // אם המשתמש מחובר - נציג את המערכת המלאה
  return (
    <div className="app-container">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        <div className="content-area">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;