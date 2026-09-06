import { useState, useEffect, useRef } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import twemoji from '@twemoji/api';
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // true עד ש-onAuthStateChanged מסיים את הבדיקה הראשונית (יש/אין סשן
  // קיים) - כל עוד true, מוצג מסך טעינה ריק במקום מסך Login, כדי למנוע
  // הבהוב של Login לרגע לפני שקופצים אוטומטית למערכת (ראו למטה).
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // ניהול הודעות שגיאה והצלחה שיוצגו בעיצוב בתוך כרטיס הלוגין
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // מסמן שכניסה/הרשמה בוצעה ידנית בסבב הזה (handleLogin/handleRegister) -
  // ה-onAuthStateChanged למטה לא דורס את מעבר ה-isLoggedIn שלהן (עם השהיית
  // הודעת ההצלחה) ומטפל רק במקרה שמעולם לא קרתה כניסה ידנית (למשל רענון
  // דף עם סשן פיירבייס עדיין תקף - "התחברות חוזרת" אמורה לזהות ולדלג
  // ישר למערכת, לא להציג שוב את מסך ההתחברות/הרשמה).
  const manualAuthRef = useRef(false);

  // זיהוי אוטומטי של סשן מחובר קיים (למשל אחרי רענון דף) - Firebase שומר
  // את הסשן בעצמו גם בלי קוד נוסף, אבל isLoggedIn (state מקומי) התאפס
  // בלי מאזין הזה, מה שגרם למסך ההתחברות להופיע שוב גם למי שכבר מחוברת.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!manualAuthRef.current) {
        setIsLoggedIn(!!user);
      }
      // מסיים את בדיקת הסשן הראשונית בכל מקרה (יש משתמש או אין) - גם
      // כשמדלגים על setIsLoggedIn כי handleLogin/handleRegister כבר
      // מטפלות בזה, כדי שמסך הטעינה לא יישאר תקוע.
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // כותרת כרטיסיית הדפדפן דינמית לפי שם העסק המחובר (users/{uid}.businessName),
  // אותיות פתיחה אמיתיות (שם פרטי+משפחה) לעיגול בסיידבר, ולוגו מותאם-אישית
  // (users/{uid}.logoUrl, מועלה ב-Settings.tsx) - אם קיים, מוצג בסיידבר
  // במקום העיגול עם האותיות, ומחליף גם את ה-favicon הכללי (ראו למטה).
  // לפני התחברות (או בזמן טעינת הנתונים) נשארת כותרת/אות/favicon ברירת
  // מחדל כלליות. מאזין חי (לא getDoc חד-פעמי) כדי שעריכה במסך ההגדרות
  // תשתקף מיד כאן בלי צורך ברענון/התחברות מחדש.
  useEffect(() => {
    const DEFAULT_TITLE = 'מערכת ניהול סלון פאות';
    const DEFAULT_FAVICON = '/favicon.svg';

    const setFavicon = (href: string) => {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = href;
    };

    if (!isLoggedIn) {
      document.title = DEFAULT_TITLE;
      setBusinessName('');
      setUserInitials('');
      setLogoUrl(null);
      setFavicon(DEFAULT_FAVICON);
      return;
    }

    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', businessId),
      (snap) => {
        const data = snap.data() as
          | { businessName?: string; firstName?: string; lastName?: string; logoUrl?: string }
          | undefined;
        const name = data?.businessName || '';
        setBusinessName(name);
        document.title = name || DEFAULT_TITLE;

        const firstInitial = data?.firstName?.trim().charAt(0) || '';
        const lastInitial = data?.lastName?.trim().charAt(0) || '';
        setUserInitials(`${firstInitial}${lastInitial}` || 'אס');

        setLogoUrl(data?.logoUrl || null);
        setFavicon(data?.logoUrl || DEFAULT_FAVICON);
      },
      (err) => console.error('Error loading business/user profile for header:', err)
    );
    return () => unsubscribe();
  }, [isLoggedIn]);

  // בדיקת תקינות חיבור לפיירבייס בעליית האפליקציה (מופיע ב-F12 Console)
  useEffect(() => {
    const apps = getApps();
    if (apps.length > 0) {
      console.log("🔥 Firebase is successfully initialized and connected!");
    } else {
      console.error("❌ Firebase is NOT connected.");
    }
  }, []);

  // הופכת כל תו אימוג'י שמוצג בעמוד לתמונת Twemoji קבועה (SVG), כדי
  // שהמראה יהיה זהה בכל מחשב/דפדפן/מערכת הפעלה - לא תלוי בגופן
  // האימוג'י המקומי (שנראה שונה ב-Windows/Linux/Mac). לא נוגעת בשום
  // קובץ קיים שכבר מציג תו אימוג'י - סורקת ומחליפה אוטומטית בדיעבד.
  //
  // MutationObserver ולא רק קריאה חד-פעמית: App.tsx לא מתרנדר מחדש
  // כשנפתח מודל/נבחרת לשונית בתוך עמוד פנימי (state מקומי שם, לא
  // כאן) - בלי observer, אימוג'ים חדשים שמופיעים ככה לעולם לא היו
  // מומרים. ה-observer מריץ מחדש בכל שינוי DOM בעמוד (עם debounce
  // קל דרך requestAnimationFrame כדי לא להריץ פעמים רבות מיותרות
  // כשקורים כמה שינויים ברצף).
  //
  // הערת אזהרה טכנית: twemoji.parse מחליף Text node בעץ ה-DOM
  // ב-<img> ישירות, מחוץ ל-React - זה עלול, במקרים נדירים, להתנגש
  // עם ה-reconciliation של React אם בדיוק אותו node משתנה/מוסר
  // מ-React באותו רגע (יש דיווחים ידועים על זה בקהילה). לא נתקלתי
  // בזה בבדיקה הידנית, אבל אם יופיעו שגיאות DOM מוזרות בקונסול
  // (למשל removeChild/insertBefore) בעתיד - זה החשוד הראשון, והפתרון
  // היציב יותר (אם יידרש) הוא רכיב <Emoji> ייעודי שמרנדר <img> דרך
  // React עצמו במקום סריקה גלובלית שמחוץ לו.
  useEffect(() => {
    const runTwemoji = () => {
      twemoji.parse(document.body, {
        folder: 'svg',
        ext: '.svg',
        className: 'twemoji-icon',
      });
    };

    runTwemoji();

    let frameId: number | null = null;
    const observer = new MutationObserver(() => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(() => {
        frameId = null;
        runTwemoji();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  // פונקציית התחברות
  const handleLogin = async (email: string, pass: string) => {
    manualAuthRef.current = true;
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
    manualAuthRef.current = true;
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

  // התנתקות - קוראת ל-setIsLoggedIn(false) במפורש ולא מסתמכת רק על
  // onAuthStateChanged: אם התחברות ידנית כבר קרתה בטאב הזה (
  // manualAuthRef.current === true), המאזין ההוא מדלג לצמיתות על
  // setIsLoggedIn כדי לא להתנגש בהשהיית הודעת ההצלחה - כלומר signOut
  // לבד, בלי הקריאה הזו, היה משאיר את המסך תקוע על המערכת המחוברת.
  // מאפסת גם את הדגל עצמו, כדי שזיהוי סשן אוטומטי יעבוד נכון שוב אם
  // מתחברים מחדש באותו טאב.
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      manualAuthRef.current = false;
      setIsLoggedIn(false);
    }
  };

  // עוד לא ידוע אם יש סשן מחובר קיים - מסך טעינה ריק במקום להבהב את
  // Login לרגע ואז לקפוץ מיד למערכת.
  if (checkingAuth) {
    return (
      <div className="auth-checking-screen">
        <div className="spinner-large" />
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
      case 'calculators': return <Calculators onNavigateToSettings={() => setActivePage('settings')} />;
      case 'sales': return <Sales />;
      case 'expenses': return <Expenses />;
      case 'reports': return <Reports />;
      case 'settings':
        return (
          <Settings
            onAccountDeleted={() => {
              manualAuthRef.current = false;
              setIsLoggedIn(false);
            }}
          />
        );
      default: return <Dashboard />;
    }
  };

  // אם המשתמש מחובר - נציג את המערכת המלאה
  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        businessName={businessName}
        userInitials={userInitials}
        logoUrl={logoUrl}
        onLogout={handleLogout}
      />
      <main className="main-content">
        <div className="content-area">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;