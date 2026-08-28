# סיכום: תשתית סנכרון Google Calendar

## כתובת ה-OAuth callback (להדביק ב-Google Cloud Console)

```
https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback
```

זו הכתובת המדויקת שצריך להוסיף תחת **Authorized redirect URIs** ב-OAuth
Client ID שלך ב-Google Cloud Console. הכתובת הזו קבועה ונגזרת מ-project
(`esti-wigs-system`) + region (`us-central1`) + שם הפונקציה - נכונה
גם עכשיו, אף שהפריסה בפועל עוד לא הצליחה (ראו למטה) - היא לא תשתנה
כשהיא כן תצליח.

## סטטוס: login + secrets הוגדרו בהצלחה, אבל הפריסה עצמה נכשלה - לא בגלל הקוד

- ✅ `firebase login` עובד.
- ✅ `GOOGLE_CLIENT_ID` ו-`GOOGLE_CLIENT_SECRET` נקבעו בהצלחה כ-Secrets.
- ❌ `firebase deploy --only functions` **נכשל על כל 4 הפונקציות** -
  שום פונקציה לא נוצרה בפועל. הסיבה **אינה** קשורה לקוד/לסודות/ל-login:
  Google Cloud מחזירה שגיאה כי חשבון השירות המובנה של Compute Engine
  (`395404001906-compute@developer.gserviceaccount.com`), שפריסת Cloud
  Functions Gen 1 דורשת כברירת מחדל, **לא קיים** בפרויקט `esti-wigs-system`.
  זו בעיית IAM/תשתית ברמת הפרויקט ב-Google Cloud Console - לא משהו
  שניתן לתקן בקוד. פירוט מלא + שתי אפשרויות לפתרון (שחזור החשבון החסר,
  או service account ייעודי חדש) ב-`progress.md`.

## git

בוצע commit+push לתיעוד המעודכן (`progress.md`, `summary.md`). הקוד
עצמו (מהריצה הקודמת) כבר ב-git; לא היה שינוי קוד הלילה - רק ניסיון
פריסה שנכשל, ותיעוד המצב.

## ⚠️ עדיין פתוח מהריצה הקודמת, לא קשור למשימה הזו

ה-working tree חזר בשלב מסוים להיות זהה ל-commit ישן יותר - השינויים
מהשיחות הקודמות (מעבר לאייקוני lucide-react, תיקון התנגשות ה-ID של
hairItems, הסרת לוגי דיבאג) נעלמו מהקוד. עדיין לא טופל - פירוט
ב-`progress.md`.
