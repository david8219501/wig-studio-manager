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

## סטטוס: התקדמות אמיתית, אבל עדיין לא פרוס - בעיית IAM שונה, לא בגלל הקוד

- ✅ `firebase login` עובד, ✅ שני ה-Secrets מוגדרים, ✅ אישרת שה-default
  service account קיים ומופעל.
- ❌ למרות זאת, `firebase deploy --only functions` **עדיין לא הצליח באמת** -
  הפעם ה-build עצמו נכשל על כל 4 הפונקציות עם שגיאת הרשאות שונה:
  ```
  Access to bucket gcf-sources-395404001906-us-central1 denied. You must
  grant Storage Object Viewer permission to
  395404001906-compute@developer.gserviceaccount.com.
  ```
  **חשוב:** `firebase functions:list` מציג את 4 הפונקציות כאילו הן קיימות,
  אבל בדקתי בפועל עם `curl` על כתובת ה-callback וקיבלתי `404` - שום דבר
  לא באמת רץ. זה עדיין אותה משפחת בעיה מוקדם יותר (service account שהיה
  צריך לשחזר/להפעיל לא "יורש" אוטומטית את כל הרשאות ה-IAM שהיו לו במקור).
  פתרון מדויק (הוספת role ל-service account ב-IAM & Admin → IAM) מפורט
  ב-`progress.md`.

## git

בוצע commit+push לתיעוד המעודכן בלבד (`progress.md`, `summary.md`) -
עדיין אין קוד חדש להוסיף, ועדיין אין דבר "פרוס" באמת לתעד כהצלחה.

## ⚠️ עדיין פתוח מהריצה הקודמת, לא קשור למשימה הזו

ה-working tree חזר בשלב מסוים להיות זהה ל-commit ישן יותר - השינויים
מהשיחות הקודמות (מעבר לאייקוני lucide-react, תיקון התנגשות ה-ID של
hairItems, הסרת לוגי דיבאג) נעלמו מהקוד. עדיין לא טופל - פירוט
ב-`progress.md`.
