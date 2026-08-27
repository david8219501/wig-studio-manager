# סיכום: תשתית סנכרון Google Calendar

## כתובת ה-OAuth callback (להדביק ב-Google Cloud Console)

```
https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback
```

זו הכתובת המדויקת שצריך להוסיף תחת **Authorized redirect URIs** ב-OAuth
Client ID שלך ב-Google Cloud Console. הכתובת הזו קבועה ונגזרת מ-project
(`esti-wigs-system`) + region (`us-central1`) + שם הפונקציה - היא נכונה
גם לפני שהפונקציה בפועל נפרסת (ולא נפרסה עדיין - ראו למטה).

## סטטוס: 4 מתוך 6 שלבים הושלמו, 2 חסומים

הכל תועד בפירוט ב-`progress.md` (כולל סיבות מדויקות והחלטות שקיבלתי
לבד). בקצרה:

- ✅ תשתית functions (TypeScript), חבילות, קוד ה-OAuth callback, טריגרי
  ה-Firestore על appointments, וכפתור "התחבר ל-Google Calendar" בדף
  ההגדרות - **כולם כתובים, בנויים (`tsc` עובר נקי), ומוכנים**.
- ❌ **הפריסה בפועל (`firebase deploy --only functions`) חסומה** - משתי
  סיבות: (1) `firebase login` לא פעיל בסביבה הזו כרגע, (2) ה-Client
  ID/Secret של Google לא התקבלו בפועל (ההודעה המקורית הכילה placeholder
  מילולי `[תדביק כאן]` ולא ערכים אמיתיים) - לא ניחשתי/זייפתי ערכים.

כל הפעולות הידניות שנשארות לך (login, יצירת secrets, `.env`, מיזוג כלל
Firestore Rules, והרצת הפריסה עצמה) מפורטות בסדר מומלץ ב-`progress.md`.

## git

בוצע commit+push לכל מה שנבנה הלילה (קוד תקין, `tsc` עובר נקי, אין
בו שום סוד אמיתי - `.env`/`functions/.env` נשארים מקומיים ומוחרגים
ב-`.gitignore`). זה לא כולל פריסה בפועל (`firebase deploy`), רק את
הקוד המוכן לפריסה.

## ⚠️ משהו שגיליתי בדרך, לא קשור למשימה הזו

ה-working tree חזר להיות זהה ל-commit האחרון בתחילת ההרצה - כל מה
שתוקן בשיחות הקודמות (מעבר לאייקוני lucide-react, תיקון התנגשות ה-ID
של hairItems בין עסקים, הסרת לוגי הדיבאג) נעלם מהקוד בפועל. לא נגעתי
בזה - פירוט מלא ב-`progress.md` תחת "ממצא נוסף".
