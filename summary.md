# סיכום: בניית דף הגדרות מלא - 6 קבוצות

משימה גדולה, ריצה ברצף עם build+commit+push נפרד אחרי כל קבוצה (לא
לחכות לסוף) - למקרה שמכסת הטוקנים תיגמר באמצע. כל קבוצה מתועדת כאן
בנפרד (append, לא נדרס) ברגע שהיא מסתיימת בהצלחה.

## קבוצה 1: פרופיל עסק ✅ הושלמה

כרטיס "🏢 פרופיל העסק" בראש `Settings.tsx` (במקום כרטיס ה-placeholder
הישן) - שדות עריכה: `businessName`, `phone`, `address`, `email`,
נטענים פעם אחת (`getDoc`) מ-`users/{uid}` ל-state עריכה מקומי (לא
מאזין חי - כמו כל טופס עריכה אחר באתר, כדי לא לדרוס הקלדה באמצע).
כפתור "שמירה" (`updateDoc`) עם הודעת הצלחה/שגיאה.

**"שינוי בשם העסק ישתקף מיד בסיידבר/בכותרת" - דרש שינוי נוסף:**
`App.tsx` טען את `businessName`/`userInitials` פעם אחת בלבד
(`getDoc`, תלוי ב-`[isLoggedIn]`) - שמירה ב-Settings לא הייתה משתקפת
עד רענון/כניסה מחדש. הוחלף ל-`onSnapshot` (מאזין חי) על אותו מסמך
`users/{uid}` - עכשיו כל שמירה בהגדרות משתקפת מיידית בסיידבר ובכותרת
הכרטיסייה, בלי לגעת בזרימת ההתחברות/checkingAuth הקיימת.

**קבצים:** `src/pages/Settings/Settings.tsx`,
`src/pages/Settings/Settings.css`, `src/App.tsx`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות בסה"כ, זהה
למצב לפני התיקון (אותן אזהרות `react-hooks/set-state-in-effect`/
`no-explicit-any` קיימות מראש) - אין אזהרה חדשה מהקוד שהוספתי.

## קבוצה 2: ניהול קטגוריות ✅ הושלמה

`businessSettings/{businessId}` מקבל שני מערכים חדשים -
`expenseCategories`/`appointmentTypes` (`string[]`) - עם ברירות מחדל
משותפות בקובץ חדש `src/utils/businessSettings.ts`
(`DEFAULT_EXPENSE_CATEGORIES`/`DEFAULT_APPOINTMENT_TYPES`), נטענות
(`getDoc`)+מאותחלות (`setDoc(merge:true)` אם עדיין ריקות) באותו דפוס
בדיוק כמו הגדרות התמחור הקיימות ב-`Calculators.tsx`.

**`Calendar.tsx`:** כבר היה `Appointment.type: string` חופשי עם דפוס
"אחר / הוסף חדש" מוכן (`OTHER_APPOINTMENT_TYPE`) - רק הוחלף המקור של
`APPOINTMENT_TYPE_OPTIONS` מקבוע מודול קבוע ל-`useMemo` הנגזר מ-state
שנטען מ-`businessSettings`. שינוי קטן, בלי סיכון.

**`Expenses.tsx` - שינוי גדול יותר, חשוב לדעת:** `Expense.category`
היה **union סגור** (`"inventory" | "rent" | ...`), לא string חופשי כמו
Calendar - לא היה שום דפוס "אחר" קיים שם. הומר ל-`string` חופשי + נוסף
`OTHER_CATEGORY` (אותו דפוס בדיוק). **תאימות לאחור:** קטגוריות חדשות
נשמרות כטקסט עברי ישיר (למשל `"מלאי ושיער"`), לא כמפתח אנגלי כמו
קודם (`"inventory"`) - הוצאות **ישנות** ימשיכו להציג `category:
"inventory"` וכו' בפועל ב-Firestore (לא בוצעה מיגרציה על נתונים
קיימים). כדי שהן ימשיכו להיראות תקין, נוספה מפת תרגום לתצוגה בלבד
(`LEGACY_EXPENSE_CATEGORY_LABELS`) + עדכון הפילטר `inventoryExpenses`
לבדוק גם את המפתח הישן וגם את החדש (`"inventory" || "מלאי ושיער"`),
כדי שכרטיס הסיכום "הוצאות מלאי וספקים" ימשיך לחשב נכון גם הוצאות ישנות
וגם חדשות.

**`Settings.tsx`:** כרטיס חדש "🗂️ ניהול קטגוריות" - שתי עמודות
(קטגוריות הוצאות / מטרות פגישה), כל אחת רשימת "צ'יפים" עם מחיקה (✕)
+ שורת הוספה. כל פעולה נשמרת מיד (`setDoc(merge:true)`) בלי כפתור
שמירה נפרד לכרטיס הזה.

**קבצים:** `src/utils/businessSettings.ts` (חדש),
`src/pages/Calendar/Calendar.tsx`, `src/pages/Expenses/Expenses.tsx`,
`src/pages/Settings/Settings.tsx`, `src/pages/Settings/Settings.css`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין - אין אזהרה חדשה בשום קובץ שנגעתי בו.

## קבוצה 3: העברת הגדרות תמחור ל-Settings.tsx ✅ הושלמה

טופס עריכת `pricePerKgUsd`/`exchangeRate`/`profitMargin` עבר מ-
`Calculators.tsx` לכרטיס חדש "💰 הגדרות תמחור" ב-`Settings.tsx`. אותו
מסמך `businessSettings/{uid}` בדיוק, אותם שמות שדות - "הנתונים עצמם
לא משתנים במבנה" כפי שהתבקש.

`Calculators.tsx` נשאר **קורא בלבד**: עדיין טוען את ההגדרות (`getDoc`
+ אתחול ברירת מחדל אם חסר) כדי להזין את המחשבונים, אבל בלי שום UI
עריכה - כפתור "⚙️ הגדרות גלובליות" (שהיה פותח/סוגר טופס inline) הוחלף
בכפתור "⚙️ לעריכת הגדרות תמחור - לחצי כאן" שמנווט ל-`Settings.tsx`
(`onNavigateToSettings` prop חדש, מ-`App.tsx` דרך `setActivePage`).

**הוסר גם:** ה-`useEffect` שכתב אוטומטית ל-Firestore בכל שינוי ב-
`settings` state (היה קיים כי העריכה הייתה בעמוד הזה) - הפך למיותר
לגמרי אחרי שהעריכה עברה ל-Settings, והיה גורם לכתיבה מיותרת בכל טעינת
עמוד (שכתוב אותם ערכים בדיוק שזה עתה נטענו).

**לא נדרש מאזין חי:** בשונה מהסיידבר/כותרת (תמיד מורכבים, גם כש-
Settings פתוח), `Calculators.tsx` נטען מחדש בכל מעבר אליו (רק עמוד
אחד מוצג בכל רגע) - `getDoc` חד-פעמי כבר תופס אוטומטית כל שינוי
שנשמר קודם ב-Settings.

**קבצים:** `src/pages/Calculators/Calculators.tsx`,
`src/pages/Settings/Settings.tsx`, `src/App.tsx`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין - אין אזהרה חדשה, `Calculators.tsx` נקי לחלוטין.

## קבוצה 4: שעות פעילות ✅ הושלמה

שדה חדש `businessSettings/{uid}.workingHours` - אובייקט לכל יום בשבוע
(`{ open, close, closed }`, מפתחות אנגליים יציבים - `sunday`..
`saturday`). ברירת מחדל (`DEFAULT_WORKING_HOURS`,
`src/utils/businessSettings.ts`): א'-ה' 09:00-19:00, שישי 09:00-14:00,
שבת סגור - החלטתי לבד (לא צוין בבקשה) התאמה סבירה לסלון פאות ישראלי,
ניתנת לעריכה מלאה.

כרטיס "🕒 שעות פעילות" ב-Settings.tsx: שורה לכל יום - טוגל "סגור ביום
זה" (checkbox), ואם לא סגור - שני `TimeInput` (הרכיב המשותף הקיים)
לשעת פתיחה/סגירה. כפתור "שמירה" (`setDoc(merge:true)`).

**רק שמירת נתונים בשלב הזה** - כפי שהתבקש: שום מקום אחר באתר (יומן,
זמינות תורים וכו') לא קורא/אוכף את זה עדיין - זו תשתית בלבד לפיצ'ר
עתידי.

**קבצים:** `src/utils/businessSettings.ts`,
`src/pages/Settings/Settings.tsx`, `src/pages/Settings/Settings.css`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין - אין אזהרה חדשה.

## קבוצה 5: יצוא/גיבוי נתונים ✅ הושלמה

כרטיס "💾 יצוא וגיבוי נתונים" עם כפתור "הורד גיבוי מלא" - שולף
(`getDocs`, מסונן `businessId`) את כל 6 ה-collections של העסק
(`clients`/`orders`/`appointments`/`hairItems`/`bulkItems`/`expenses`)
+ מסמכי `users/{uid}` ו-`businessSettings/{uid}` עצמם (לפי id, לא
query), מאגד הכל לאובייקט JSON אחד (עם `exportedAt`), ומפעיל הורדה
בדפדפן (`Blob` + `<a download>` זמני). שם קובץ: `גיבוי-YYYY-MM-DD.json`.

**קובץ:** `src/pages/Settings/Settings.tsx`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין - אין אזהרה חדשה. לא נבדק בפועל בדפדפן (הורדת קובץ) - מומלץ
לבדוק ידנית שהקובץ באמת יורד ומכיל את כל הנתונים הצפויים.

## קבוצה 6: העלאת לוגו + favicon דינמי - ⚠️ קוד מוכן, **חסום** בפריסה בפועל

### הבדיקה שבוצעה - נמצא בדיוק הבלוק שהוזהר עליו

בדקתי אם ה-bucket של Firebase Storage כבר קיים בפרויקט:
```
gsutil ls gs://esti-wigs-system.firebasestorage.app
→ BucketNotFoundException: 404 bucket does not exist
```
ניסיתי לפרוס Storage Rules בפועל (`firebase deploy --only storage`,
עם `storage.rules`+`firebase.json` שהוכנו) כדי לבדוק אם זה מקים את
ה-bucket אוטומטית:
```
Error: Firebase Storage has not been set up on project 'esti-wigs-system'.
Go to https://console.firebase.google.com/project/esti-wigs-system/storage
and click 'Get Started' to set up Firebase Storage.
```

**זו פעולה חד-פעמית שחייבת קליק ידני בקונסולה** - אין דרך להקים
Storage bucket ראשוני דרך ה-CLI/SDK (בניגוד לפריסת Cloud Functions,
ששתיהן כבר עשינו הצלחה בעבר). `gcloud`/`gsutil` בסביבה הזו גם לא
מאומתים (`gcloud auth list` → "No credentialed accounts") אז גם דרך
עוקפת לא זמינה.

### מה כן בוצע (מוכן, ממתין להקמת Storage)

- **`storage.rules`** (חדש, בשורש) - כלל: `logos/{businessId}/*` -
  קריאה פתוחה (לוגו מוצג גם למי שלא מחוברת, בסיידבר/favicon), כתיבה
  רק ל-uid התואם; כל השאר חסום כברירת מחדל.
- **`firebase.json`** - נוסף `"storage": { "rules": "storage.rules" }`.
  **אחרי** שתלחצי "Get Started" בקונסולה (הקישור למעלה), `firebase
  deploy --only storage` יפרוס את הכלל הזה ישירות - **לא** צריך את
  תהליך ה"הדבקה ידנית" שהיה נדרש עם Firestore private rules; זה
  ההבדל בין Storage ל-Firestore rules מבחינת ה-CLI.
- **`src/services/firebase.ts`** - `export const storage = getStorage(app)`.
- **`Settings.tsx`** (כרטיס "פרופיל העסק"): אזור העלאת תמונה - תצוגה
  מקדימה (עיגול) + כפתור "העלאת לוגו"/"החלפת לוגו". מעלה ל-Storage
  תחת `logos/{businessId}/logo.{ext}`, שומר את ה-URL בשדה `logoUrl`
  על `users/{uid}`. שגיאת העלאה (כולל אם Storage עדיין לא מוקם) מוצגת
  בבירור למשתמשת, לא נכשלת בשקט.
- **`Sidebar.tsx`**: אם קיים `logoUrl` - מציג אותו במקום העיגול עם
  האותיות (`fallback` לאותיות אם אין לוגו, בדיוק כמו שהתבקש).
- **`App.tsx`**: אותו מאזין חי שכבר טוען `businessName`/`userInitials`
  (`onSnapshot` על `users/{uid}`) מורחב לטעון גם `logoUrl` - **וגם
  לעדכן דינמית את ה-favicon** (`<link rel="icon">` ב-`<head>`, דרך
  JS) לאותה תמונה, כשקיים. אם אין `logoUrl` - נשאר ה-favicon הכללי
  (`/favicon.svg` שכבר נוצר בסבב קודם).

### מה עדיין לא ניתן לבדוק

כל הקוד למעלה **קומפל בהצלחה** (`npm run build`+`npm run lint` נקיים),
אבל **לא ניתן לבדוק בפועל** (העלאת קובץ אמיתית) עד שה-Storage bucket
יוקם. ברגע שתלחצי "Get Started" בקישור למעלה - תגידי לי, ואוכל להריץ
`firebase deploy --only storage` ולוודא שההעלאה עובדת בפועל.

**קבצים:** `firebase.json`, `storage.rules` (חדש),
`src/services/firebase.ts`, `src/pages/Settings/Settings.tsx`,
`src/pages/Settings/Settings.css`, `src/components/Sidebar/Sidebar.tsx`,
`src/components/Sidebar/Sidebar.css`, `src/App.tsx`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין - אין אזהרה חדשה בשום קובץ.

---

## עדכון - Storage הוקם, storage.rules נפרס בהצלחה ✅

לאחר שה-Storage bucket הוקם ידנית בקונסולה (Get Started + Production
mode), הרצתי `firebase deploy --only storage`:
```
✔  firebase.storage: rules file storage.rules compiled successfully
✔  storage: released rules storage.rules to firebase.storage
✔  Deploy complete!
```
הכלל שהוכן מראש (`logos/{businessId}/*` - קריאה פתוחה, כתיבה רק
ל-uid התואם) פעיל עכשיו בפועל בפרודקשן.

**אימות שבוצע (בלי גישת admin/browser אמיתית):**
- `gsutil ls gs://esti-wigs-system.firebasestorage.app` - עבר מ-`404
  bucket does not exist` (לפני ההקמה) ל-`401 Anonymous caller does
  not have storage.objects.list access` (עכשיו) - שינוי משמעותי: ה-
  bucket **קיים** עכשיו בפועל (401 = "קיים אבל אין הרשאה לרשימה
  אנונימית", לא "לא קיים"). ה-401 עצמו דווקא **תקין ומצופה** - זה
  Production mode, גישה אנונימית ל-listing אמורה להיחסם; `gsutil`/
  `gcloud` בסביבה הזו לא מאומתים כלל (`gcloud auth list` → "No
  credentialed accounts", אין גם Application Default Credentials) -
  אין לי דרך CLI/API עם הרשאות אמיתיות לבדוק העלאה אמיתית מכאן.
- **התאמת path בין הקוד לחוקים - נבדקה ואומתה ידנית, תואמת בדיוק:**
  `Settings.tsx` מעלה ל-`logos/${businessId}/logo.${ext}` (כש-
  `businessId = auth.currentUser.uid`), והחוק שנפרס מתיר כתיבה בדיוק
  ל-`logos/{businessId}/{fileName}` כש-`request.auth.uid == businessId` -
  זהה תואם.
- `npm run build`/`npm run lint` הורצו שוב - נקיים (24 בעיות, זהה
  לבייסליין הקבוע, שום שגיאת קומפילציה/קונפיגורציה).

**מה עדיין לא אומת (ולמה לא):** העלאה אמיתית מקצה לקצה (משתמשת
מחוברת בפועל לוחצת "העלאת לוגו" בדפדפן) - זה דורש סשן דפדפן מאומת
אמיתי או service account key ל-Admin SDK, ששניהם לא זמינים לי בסביבה
הזו. **המלצה:** תתחברי בפועל למערכת, תיכנסי להגדרות ותנסי להעלות
תמונת לוגו אמיתית - אם זה נכשל, השגיאה תוצג בבירור במסך (כבר מטופלת
ב-`logoError`) ותוכלי להעתיק לי אותה לאבחון נוסף.

## סיכום כולל - 6/6 קבוצות טופלו

קבוצות 1-5: הושלמו ונפרסו במלואן, נבדקות (build+lint) בכל שלב.
קבוצה 6: **כל הקוד מוכן, נבדק (build+lint), ו-storage.rules נפרס
בהצלחה** לפרודקשן. אימות path-matching בין הקוד לחוקים בוצע ידנית
ותואם. בדיקת קצה-לקצה אמיתית (העלאת קובץ בפועל) עדיין ממתינה לבדיקה
ידנית שלך בדפדפן - אין לי גישת admin/API מאומתת לבצע אותה מכאן.

---

# תוספת: 2 באגי "שגיאה בשמירה" בהגדרות - אבחון + תיקון

## מה בדקתי לפני שתיקנתי (חשוב - שני החשדות המקוריים לא אושרו במלואם)

**אין לי גישה לקונסולת הדפדפן/browser session אמיתי** - לא יכולתי
להריץ את האפליקציה בפועל ולראות את הודעת השגיאה המדויקת. הניתוח הבא
מבוסס קריאת קוד קפדנית בלבד.

### באג 1 - שמירת שעות פעילות

**החשד המקורי (TimeInput מחזיר undefined לימים סגורים) - לא אושר:**
כשיום מסומן `closed:true`, ה-`TimeInput` לא מוצג בכלל בתנאי
`{!day.closed && (...)}` - כלומר ה-`onChange` שלו פשוט לא נקרא, וה-
`open`/`close` הקיימים ב-state (ערכי מחרוזת תקינים) פשוט לא משתנים.
גם `TimeInput.tsx` עצמו (`onChange={handleChange}`) קורא ל-`onChange`
**רק** עם `parsed` (מחרוזת "HH:mm" תקינה) - אף פעם לא עם `undefined`.
ל-`DEFAULT_WORKING_HOURS` יש ערכים מלאים ותקינים לכל 7 הימים. כלומר,
בשמירה ראשונה מ-state טרי, אין שום דרך ברורה שהאובייקט הנשלח
ל-Firestore יכיל `undefined`.

**אבל נמצא באג אמיתי ומדויק, בכיוון קרוב:** מיזוג הטעינה
(`{...DEFAULT_WORKING_HOURS, ...data.workingHours}`) הוא **שטחי ברמת
המפתח העליון בלבד** (לפי יום), לא per-field בתוך כל יום. אם המסמך
ב-Firestore אי-פעם מכיל יום **חלקי** (חסר `open`/`close`/`closed`) -
מכל סיבה שהיא - המיזוג הזה **לא** ממלא את החוסר מברירת המחדל, ומעביר
את השדה החסר כ-`undefined` הלאה ל-state, ומשם לשמירה הבאה. זו בדיוק
משפחת הבאג שכבר נתקלנו בה עם הערת תשלום.

**התיקון:**
1. מיזוג **עמוק לכל יום בנפרד** בטעינה - כל יום ממולא מברירת המחדל
   שדה-שדה, לא רק אם המפתח כולו חסר.
2. **סניטציה הגנתית ממש לפני השמירה** - בונה אובייקט חדש שמבטיח
   `open`/`close` כמחרוזת (fallback לברירת מחדל אם ריק/undefined)
   ו-`closed` כבוליאני מפורש (`!!`) לכל 7 הימים, בלי קשר למה שהיה
   ב-state - חוסם את משפחת הבאג הזו לגמרי, מכל כיוון אפשרי, גם אם
   הסיבה המדויקת שדווחה שונה ממה שזיהיתי.
3. **הודעת השגיאה בפועל מוצגת עכשיו על המסך** (לא רק ב-console) -
   אם זה עדיין נכשל, את תראי את הטקסט המדויק מ-Firebase ותוכלי
   להעתיק לי אותו לאבחון סופי.

### באג 2 - הורדת גיבוי

**החשדות המקוריים - נבדקו, לא נמצא תימוכין חזק:**
- שאילתות ה-`getDocs` על 6 ה-collections משתמשות **באותו דפוס filter
  מדויק** (`where("businessId","==",uid)`) שכבר עובד בהצלחה בכל
  האתר (Sales.tsx/Inventory.tsx/Expenses.tsx/Calendar.tsx, כולם עם
  `onSnapshot` על שאילתה זהה) - תיאוריית הרשאות גורפת לא מתאימה, כי
  אז גם המאזינים החיים הרגילים היו נכשלים.
- `JSON.stringify` על שדה מסוג Firestore `Timestamp` **לא זורק שגיאה**
  (יש לו `toJSON()` מובנה ב-SDK) - זה היה רק גורם לפורמט תצוגה שונה
  בקובץ, לא לכישלון. לא נמצאו שדות מסוג `DocumentReference`/מעגליות
  בשום collection בקוד הזה (כל הקשרים הם string IDs פשוטים).

**מה בכל זאת שופר (כי לא הצלחתי לשלול לגמרי כשל ב-collection בודד):**
1. שינוי מ-`for` loop רציף ל-`Promise.allSettled` **מקבילי** - אם
   collection ספציפי נכשל (למשל בעיית הרשאות/אינדקס ייחודית רק לו),
   שאר הגיבוי **עדיין יורד** עם אזהרה מפורשת שאומרת **בדיוק** איזה
   collection נכשל - זה בעצמו כלי אבחון: אם תריצי את זה ותקבלי אזהרה
   כזו, נדע מיד את מקור הבעיה המדויק.
2. אותו טיפול ל-`getDoc` על `users`/`businessSettings`.
3. הודעת השגיאה הסופית (אם הכל נכשל) מציגה גם היא את הטקסט המדויק
   מ-Firebase על המסך, לא רק הודעה גנרית.

## מה עדיין פתוח

אם שני התיקונים לא פותרים את זה לגמרי - **הטקסט המדויק שיוצג עכשיו על
המסך** (באדום, בכרטיס הרלוונטי) הוא הצעד הבא לאבחון סופי. תריצי שוב,
ותעתיקי לי בדיוק מה כתוב שם.

**קובץ:** `src/pages/Settings/Settings.tsx`

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע לאורך כל המשימה - אין אזהרה חדשה.
