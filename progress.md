# התקדמות: תשתית סנכרון Google Calendar

עדכון אחרון: 2026-08-28

1. ✅ **firebase init functions (TypeScript)** — תשתית `functions/` בנויה
   ידנית (`.firebaserc`, `firebase.json`, `functions/package.json`,
   `functions/tsconfig.json`, `functions/.gitignore`).
2. ✅ **npm install googleapis google-auth-library ב-functions/** —
   הותקנו בהצלחה, יחד עם `firebase-admin`/`firebase-functions`.
   `npm run build` (tsc) ב-functions/ עובר נקי.
3. ✅ **HTTP function ל-OAuth callback** — `functions/src/googleCalendarAuth.ts`
   (`googleCalendarOAuthCallback`), 1st gen בכוונה (כתובת https קבועה
   מראש). כלל ה-Firestore Rules המבוקש לא פורסם אוטומטית - נשאר כטקסט
   מוצע ב-`firestore-rules-google-calendar-addition.txt` למיזוג ידני.
4. ✅ **Firestore Triggers על appointments** — `functions/src/googleCalendarSync.ts`.
5. ✅ **כפתור "התחבר ל-Google Calendar"** — בדף ההגדרות (`Settings.tsx`).
6. ❌ **firebase deploy --only functions - עדיין נכשל, אבל התקדם צעד -
   בעיית IAM חדשה ושונה, לא מבאג בקוד.**

## היסטוריית הניסיונות (3 ניסיונות עד כה)

**ניסיון 1** (לפני login/secrets) - נכשל: login לא בוצע, secrets לא
קיימים.

**ניסיון 2** (אחרי login+secrets) - נכשל על:
```
Failed to create 1st Gen function .../googleCalendarOAuthCallback:
Default service account '395404001906-compute@developer.gserviceaccount.com'
doesn't exist.
```
תוקן ע"י המשתמשת: אימתה שהחשבון הזה כן קיים ומסומן Enabled בקונסולה.

**ניסיון 3** (אחרי אישור שהחשבון קיים) - **התקדם צעד אמיתי** (יצירת
הפונקציה עצמה כבר לא נכשלת על "אין service account"), **אבל נכשל בשלב
הבא - ה-Build עצמו**, על כל 4 הפונקציות, עם שגיאה חדשה:

```
Build failed: Access to bucket gcf-sources-395404001906-us-central1
denied. You must grant Storage Object Viewer permission to
395404001906-compute@developer.gserviceaccount.com.
```

**חשוב להבין:** `firebase functions:list` בפועל **מציג את כל 4 הפונקציות
כאילו הן קיימות** - אבל זה מטעה. בדקתי בפועל עם `curl` על כתובת ה-callback
וקיבלתי `404` - כלומר שום דבר לא באמת רץ/מוגש. ל-Cloud Functions יש נטייה
ליצור "רשומת משאב" גם כשה-build נכשל, אז ההופעה ב-`functions:list` לא
מוכיחה שהפונקציה עובדת.

**האבחנה:** זה בדיוק התסמין הצפוי כשמשחזרים/מפעילים מחדש service account
שנמחק בעבר - שחזור/הפעלה של החשבון עצמו לא משחזר אוטומטית את כל הרשאות
ה-IAM שהיו לו במקור (כמו גישה ל-buckets שנוצרו אוטומטית עבור builds). זו
עדיין **לא** בעיה בקוד.

## מה נדרש ממך כדי להמשיך (הפעם)

**הפתרון הכי פשוט וחסין** (עדיף על תיקון per-bucket אחד-אחד, כי סביר
שיצוצו עוד בעיות IAM דומות בהמשך לאותה סיבה): בקונסולת Google Cloud
(פרויקט `esti-wigs-system`) → **IAM & Admin → IAM** (לא "Service
Accounts" - דף אחר) → למצוא את `395404001906-compute@developer.gserviceaccount.com`
ברשימת ה-principals → Edit (עיפרון) → Add another role → לבחור **Editor**
→ Save. זה בדיוק התפקיד שגוגל נהגה להעניק אוטומטית ל-default compute
service account בפרויקטים חדשים - ומכסה גם את ה-bucket הספציפי הזה וגם
כל הרשאה דומה אחרת (Artifact Registry וכו') שעלולה לצוץ באותה סיבה.

אם מדיניות ארגונית לא מאפשרת Editor רחב כל כך, אפשר גם במדויק, באותו
דף IAM: להוסיף שני roles ל-service account הזה: **Storage Object Viewer**
ו-**Artifact Registry Reader** (עלול להידרש בהמשך הבנייה, כי
ה-functions מוגדרות עם `dockerRegistry: ARTIFACT_REGISTRY`).

אחרי שהתפקיד נוסף - בקשי ממני "תריץ deploy שוב".

## ⚠️ ממצא מהריצה הקודמת, עדיין לא טופל - חשוב

בתחילת ההרצה הקודמת גיליתי שה-working tree חזר להיות זהה ל-commit
שלפני מספר תיקונים (מעבר לאייקוני lucide-react, תיקון התנגשות ה-ID של
hairItems בין עסקים, הסרת לוגי דיבאג זמניים) - כאילו הם נעלמו/הוחזרו.
לא בדקתי את זה מחדש הלילה (מחוץ להיקף המשימה הנוכחית) - עדיין כדאי
לבדוק את זה, ייתכן שבאג ה-permission-denied ב-AddHairModal חזר.
