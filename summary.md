# סיכום: תשתית סנכרון Google Calendar

## כתובת ה-OAuth callback - פרוסה בפועל ומאומתת! ✅

```
https://us-central1-esti-wigs-system.cloudfunctions.net/googleCalendarOAuthCallback
```

זו הכתובת שצריך להוסיף תחת **Authorized redirect URIs** ב-OAuth Client
ID שלך ב-Google Cloud Console. **הפעם זה אמיתי** - אימתתי בעצמי עם
`curl`: בלי פרמטרים מחזירה `400` עם הודעת השגיאה העברית מהקוד; עם
code/state מזויפים מחזירה `302` redirect ל-`.../?googleCalendar=error&reason=exchange_failed`
- בדיוק ההתנהגות שהקוד אמור לתת. זו לא רק רשומה ב-`functions:list`,
זו התנהגות אמיתית של הפונקציה.

## סטטוס: החלק החשוב ביותר עובד, שלושת טריגרי הסנכרון עדיין לא

- ✅ **`googleCalendarOAuthCallback` פרוסה, ציבורית, ועובדת.** תקלה
  קטנה בדרך (גרסה ראשונה בסבב הזה יצאה `403` כי זו הייתה "עדכון" של
  רשומה שבורה ולא "יצירה" אמיתית) - פתרתי בעצמי (מחיקה ופריסה מחדש
  כ-CREATE אמיתי), ווידאתי שוב עם curl.
- ⏳ **`onAppointmentCreated`/`Updated`/`Deleted` עדיין לא פרוסות.**
  התגלתה בעיה אמיתית ושונה: מסד ה-Firestore של הפרויקט הוא multi-region
  (`nam5`), ו-Cloud Functions מדור 1 (1st gen) לא תומכות בטריגר Firestore
  על קונפיגורציה כזו. **תיקנתי את הקוד** - העברתי את שלוש הפונקציות האלה
  ל-2nd gen (שכן תומך ב-nam5), בקובץ `functions/src/googleCalendarSync.ts`.
  אבל הפריסה שלהן עדיין נכשלת - הפעם על **בעיית IAM שלישית ושונה**
  (Eventarc Service Agent חסר הרשאה), מפורטת עם פתרון מדויק ב-`progress.md`.
- **חשוב:** מחקתי את 3 הפונקציות הישנות (1st gen, שהיו שבורות ולא עבדו
  בכל מקרה) כדי לפנות מקום לגרסה המתוקנת - כרגע הן **לא קיימות בפרויקט
  בכלל**. זה בטוח (שום דבר אמיתי עוד לא תלוי בהן), אבל חשוב שתדעי.

## git

בוצע commit+push: קוד (מיגרציה ל-2nd gen לטריגרי הסנכרון) + תיעוד
מעודכן (`progress.md`, `summary.md`).

## ⚠️ עדיין פתוח, לא קשור למשימה הזו

ה-working tree חזר בשלב מסוים להיות זהה ל-commit ישן יותר - השינויים
מהשיחות הקודמות (אייקוני lucide-react, תיקון ID של hairItems, הסרת
לוגי דיבאג) נעלמו מהקוד. גם `progress.md`/`summary.md` עצמם התרוקנו
לבד כמה פעמים הלילה בלי שנגעתי בהם - דפוס חוזר שכדאי לחקור. פירוט
ב-`progress.md`.
