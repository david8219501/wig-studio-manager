# סיכום: תיקון InfoTooltip - בועית נחתכת/מכוסה באזורים עם גלילה פנימית

## תחקור: האם תיקון createPortal בוצע קודם?

**נבדק בקוד בפועל (לא זיכרון) - לא בוצע מעולם.** ה-InfoTooltip
שהתעדכן בסשן הקודם (הרחבת אזור ה-hover) עדיין הכיל את התגובה
המפורשת "לא תלוי ב-createPortal... זו רק בועית טקסט סטטית שממוקמת
יחסית לאייקון עצמו" בראש הקובץ, וה-JSX רינדר את `.info-tooltip-bubble`
כילד מקונן רגיל בתוך `.info-tooltip` עם `position: absolute` יחסי
להורה - בלי שום `createPortal`/`document.body`. זה בדיוק הבאג
שהמשתמשת דיווחה: הבועית ב-`<th>` "מאזן חודשי" (Reports.tsx) נחתכת
כי היא מקוננת בתוך קונטיינר `overflow-x: auto` של הטבלה.

## הפתרון שמומש עכשיו

**1. `createPortal` ל-`document.body`:** הבועית לא מרונדרת יותר
כילד של `.info-tooltip` - עכשיו `createPortal(<span
className="info-tooltip-bubble".../>, document.body)`, כך שהיא
משוחררת מכל `overflow:hidden/auto` של קונטיינר אבא (הטבלה או כל
מקום אחר).

**2. מיקום חי, לא רק בפתיחה:** `iconRef` (על כפתור האייקון) +
`updatePosition()` שקוראת `getBoundingClientRect()` ומחשבת
`{top: rect.bottom + 8, left: rect.left + rect.width/2}` - נקראת גם
ב-`open()` (מיד כשנפתחת) וגם ב-`useEffect` שרשום כל עוד `isOpen`:
`window.addEventListener("scroll", updatePosition, {passive:true,
capture:true})` + `resize`. **`capture: true` על ה-scroll listener
חשוב במיוחד** - כך שהוא תופס גם גלילה של קונטיינר מקונן (כמו
`overflow-x:auto` של הטבלה), לא רק גלילת הדף/window עצמו - אירועי
scroll לא עולים (bubble) אבל התפיסה ב-capture phase תופסת אותם בכל
מקרה. הליסנרים מוסרים אוטומטית כשה-bubble נסגרת (`isOpen` false)
או ב-unmount.

**3. `position: fixed` בבועית עצמה** (לא `absolute`) - כי היא
מרונדרת כילד ישיר של `body` עכשיו, ו-`getBoundingClientRect()` כבר
מחזיר קואורדינטות יחסיות ל-viewport - אין צורך להוסיף
`scrollX`/`scrollY` בעצמנו. `top`/`left` עוברים כ-inline style
(דינמיים, לא ניתנים ל-CSS class סטטי); `transform: translateX(-50%)`
נשאר ב-CSS - ממרכז את הבועית מתחת לאייקון (ה-`left` המחושב הוא
מרכז האייקון).

**`.info-tooltip` (הספאן הפנימי הצמוד לאייקון) הפשיט את
`position: relative`** - לא נחוץ יותר, הבועית לא ילד יחסי שלו.

## בדיקת 7 המקומות האחרים

**כל 8 מקומות השימוש עוברים דרך אותו רכיב `InfoTooltip` יחיד** -
נבדק ב-`grep -rn "InfoTooltip" src/` שאין שום מימוש נפרד/משוכפל של
בועית הסבר באתר. התיקון ב-`InfoTooltip.tsx` חל אוטומטית על כולם -
לא נדרש תיקון נפרד בכל מקום.

**קבצים:** `src/components/common/InfoTooltip.tsx`/`.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

# ביקורת מקיפה: הגנות קלט + שלמות נתונים (בדיקה בלבד, ללא שינויי קוד)

**מטרה:** לקראת ניקוי משתמש בדיקה חדש - מיפוי כולל של פערי הגנות
קלט/מקרי קצה (ממד א') ועקביות מספרים שכבר נשמרים (ממד ב'), לפני
בדיקה ידנית. כל הממצאים למטה מבוססים על קריאת קוד בפועל (grep/Read)
בזמן הבדיקה - לא זיכרון/הנחות. **לא בוצע שום שינוי קוד, build או
commit כחלק מהביקורת הזו** - דיווח בלבד.

## ממד א': הגנות קלט/וולידציה

### הרשמה/התחברות (Login.tsx, App.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 1 | וולידציית פורמט אימייל | ✅ | `type="email"` + `required`, אין `noValidate` על ה-`<form>` - HTML5 native חוסם פורמט לא תקין |
| 2 | הודעה על אימייל כפול | ✅ | `error.code === 'auth/email-already-in-use'` → "כתובת האימייל הזו כבר רשומה במערכת. נסה להתחבר." (App.tsx, `handleRegister`) |
| 3 | וולידציית פורמט טלפון | ❌ | `type="tel"` בלבד, אין regex/פורמט כלל - כל מחרוזת מתקבלת (גם ב-Login וגם ב-AddClientModal) |
| 4 | סיסמה קצרה מ-6 תווים | ✅ | בדיקה מפורשת בקוד (`password.length < 6`) לפני שליחה, וגם Firebase עצמו חוסם (`auth/weak-password`) |
| 5 | לחיצה כפולה על "הרשמה" | ✅ | כפתור `disabled={isLoading}`, `setIsLoading(true)` נקרא כשורה הראשונה ב-`handleRegister` (App.tsx) - לפני קריאת ה-API האסינכרונית |

### לקוחות (Clients.tsx, AddClientModal.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 6 | טלפון ריק (שדה חובה) | ✅ | `!form.phone.trim()` → "טלפון הוא שדה חובה" |
| 7 | טלפון כפול בין לקוחות | ✅ | `query(collection(db,"clients"), where("phone","==",phone))` + `dupErrors.phone`, גם בדיקה נפרדת מול טלפון המנהלת (owner) עצמה |
| 8 | מחיקת לקוחה עם הזמנות פתוחות | ❌ | `performDelete` (Clients.tsx) מוחקת ישירות (`deleteDoc`) בלי לבדוק הזמנות קיימות - `clientId` בהזמנות נשאר "יתום"; כל מאזין חי (`OrderDetailsPanel`/`ClientDrawer`) שמנסה לקרוא את מסמך הלקוח מקבל ריק |

### יומן (Calendar.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 9 | שעת סיום לפני התחלה | ✅ | `if (endTime <= startTime)` חוסם עם הודעה מפורשת: "שעת 'עד' חייבת להיות מאוחרת משעת 'משעה'" |
| 10 | חפיפת פגישות | ⚠️ | אזהרה בלבד + `ConfirmDialog` מפורש (`overlapConfirmOpen`), לא חסימה - **בכוונה** (מתועד בהערה בקוד: "חפיפה - אזהרה בלבד, לא חסימה"), לא באג |

### מלאי (Inventory.tsx, AddHairModal.tsx, AssignHairModal.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 11 | קליטת קוקו במשקל 0 | ✅ | `if (!form.initialWeight \|\| Number(form.initialWeight) <= 0)` חוסם ב-`AddHairModal.tsx` |
| 12 | שיוך גרמים יותר מהמלאי | ✅ | `gramsExceedsStock` חוסם את כפתור השיוך (`disabled`) + `Math.max(0, currentWeight - grams)` כרשת הגנה כפולה ב-`AssignHairModal.tsx` (גם בשיוך חדש וגם בעריכת שיוך קיים) |
| 13 | סגירת קוקו פעמיים | ✅ | `item.wasteReconciledAt` קובע אילו משני הכפתורים (מוציאים זה את זה) מוצג ב-`HairItemDetailsPanel.tsx` - "🔒 סגירת קוקו" / "↩ ביטול סגירה" |
| 14 | מכירת פאת תצוגה שנמכרה | ✅ | הגנה מבנית - פאה שנמכרה מנותבת לפאנל אחר לגמרי (`OrderDetailsPanel` ולא `ShowroomStockDetailsPanel`), שאין בו כפתור מכירה בכלל, לא רק `disabled` |

### מחשבונים/קטלוגים (Calculators.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 15 | קטלוג בלי מבנה/מלאות | ✅ | `canCreate = name.trim() !== "" && structure !== "" && fullness !== ""`, כפתור היצירה `disabled={!canCreate}` |
| 16 | מחיר ידני שלילי | ❌ | שדה מחיר ידני בקטלוג: `type="number"` בלי `min`, `Number(e.target.value) \|\| 0` - מספר שלילי (למשל -50) מתקבל ונשמר כמו שהוא |

### הזמנות (NewOrderWizard.tsx, RepairOrderForm.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 17 | מחיר 0/שלילי | ❌ | שדה "מחיר ללקוחה" ב-`NewOrderWizard.tsx`: `type="number"` בלי `min`, `totalPriceNum = Number(price) \|\| 0` - כפתור הסיום לא בודק את הערך בכלל; הזמנה במחיר 0 או שלילי נשמרת בפועל |
| 18 | הזמנה בלי לקוחה | ✅ | חסום בכל מסלולי היצירה הרגילים: `NewOrderWizard` (כפתור "המשך" `disabled` בלי `selectedClientId`, למקרים שאינם showroom), `RepairOrderForm` (`if (!isOpen \|\| !client) return null` - לא ניתן לרנדר/לשלוח בלי `client`). מוצר קמעונאי/פאת תצוגה נוצרים בכוונה בלי לקוחה בשלב הראשוני - תקין, לא טעות |

### תשלומים/יתרת זכות (OrderDetailsPanel.tsx, NewOrderWizard.tsx, ClientDrawer.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 19 | תשלום גדול מהמחיר הכולל (עודף) | ❌ | `handleAddPayment` בודק רק `payAmount <= 0`; **אין** בדיקה מול היתרה לתשלום בפועל (`totalPrice - paidAmount`) לתשלומי מזומן/אשראי/העברה - ניתן "לשלם" יותר מהחוב. רק `method === "credit_balance"` מוגן (מול `clientCreditBalance` החי) |
| 20 | ניצול יתרת זכות גדולה מהמחיר | ✅ | `creditToApply = Math.min(client.creditBalance ?? 0, totalPriceNum)` - מאושר בקוד החי ב-`NewOrderWizard.tsx` |
| 21 | החזר גדול מהיתרה | ✅ | בדיקת JS מפורשת `amount > liveCreditBalance` ב-`handleConfirmRefund` (`ClientDrawer.tsx`) - לא רק `max` ב-HTML (שקל לעקוף) |

### הוצאות (Expenses.tsx)

| # | בדיקה | סטטוס | פירוט |
|---|-------|-------|-------|
| 22 | סכום שלילי | ❌ | `if (!newSupplier \|\| !newAmount) return;` - `!newAmount` חוסם ריק/0 אבל **לא** שלילי (מספר שלילי הוא truthy ב-JS). גם עריכת סכום קיים (`saveEditAmount`) בלי שום בדיקת סימן |

## ממד ב': שלמות נתונים - עקביות מספרים

| # | שדה | סטטוס | פירוט |
|---|-----|-------|-------|
| 1 | `paidAmount` מול `payments` | ⚠️ | שדה שמור בנפרד (לא נגזר חי בתצוגה) - אבל **מסונכרן ידנית באופן עקבי** בכל 6 נקודות הכתיבה שנבדקו (הוספה/מחיקה/עריכת תשלום ב-`OrderDetailsPanel`, יצירה ב-`NewOrderWizard`/`QuickRetailSaleModal`/`SellShowroomStockModal`, ברירת מחדל ב-`orderCreation.ts`) - כולן מחשבות `payments.reduce((sum,p)=>sum+p.amount,0)` ברגע הכתיבה ובאותו `updateDoc`. אין הגנה מבנית/Cloud Function שמוודאת זאת - drift תיאורטי אפשרי אם קוד עתידי ישכתב `payments` בלי לעדכן גם את `paidAmount` |
| 2 | `currentWeight` מול `gramsUsed` | ✅ | `Math.max(0, currentWeight - grams)` בכל מקום שמפחית (`AssignHairModal.tsx` פעמיים - שיוך חדש ושינוי שיוך קיים); ההפחתה וההשבה סימטריות (הוספת שיוך מפחיתה, הסרתו משיבה בדיוק את אותה כמות בחזרה) |
| 3 | `creditBalance` מול `creditHistory` | ⚠️ | `creditBalance` הוא שדה נפרד המתעדכן דרך `increment()` בכל נקודת כתיבה (לא נגזר מסכימת `creditHistory`) - שני השדות נכתבים תמיד באותו `updateDoc` (אטומי בתוך הקריאה עצמה), אבל **אין שום בדיקת אינטגריטי** שמוודאת שהיתרה בפועל שווה לסכום ה-history - פער תיאורטי אפשרי בעקבות תקלה/עריכה ידנית ב-Firestore |
| 4 | `productionCost`/`profit` מול `usedHairItems`/`usedBulkItems` | ✅ | מאושר: **אין** אף שדה `profit`/`productionCost` נכתב לשום מסמך הזמנה בכל הקוד (`grep -rn "profit:\s*[a-zA-Z]\|productionCost:\s*[a-zA-Z]"` על כל `src/` - אפס תוצאות מחוץ ל-`orderProfit.ts`/עמודי התצוגה) - תמיד מחושב חי דרך `calculateOrderProfit`/`calculateOrderProductionCost`, בלתי אפשרי לסטות |
| 5 | `quantity` ב-`bulkItems` | ✅ | חסום כפול: UI (`qty > item.quantity` חוסם את כפתור המכירה) + `Math.max(0, item.quantity - qty)` כרשת הגנה (`QuickRetailSaleModal.tsx`) |

## סיכום הפערים המשמעותיים ביותר (ממצא בלבד, לא תיקון)

- פורמט טלפון לא מאומת בשום מקום (הרשמה + לקוחות).
- מחיקת לקוחה לא בודקת הזמנות פתוחות קיימות - יוצרת `clientId` יתום.
- מחיר הזמנה (`NewOrderWizard`) ומחיר ידני בקטלוג (`Calculators`) יכולים להיות 0 או שליליים.
- תשלום רגיל (לא `credit_balance`) יכול לעלות על החוב בפועל של ההזמנה - אין בדיקה מול `totalPrice - paidAmount`.
- הוצאה יכולה להיות בסכום שלילי (יצירה ועריכה).
- `paidAmount`/`creditBalance` הם שדות מסונכרנים-ידנית (לא נגזרים מבנית) - עקביים כרגע בכל נקודות הכתיבה שנבדקו, אך לא מוגנים structurally מפני drift עתידי.

---

# תיקון 3 הפערים הראשונים מהביקורת (סעיפים 19/8/17)

## תיקון #19: תשלום רגיל לא יכול לעלות על החוב בפועל ✅ הושלמה

`handleAddPayment` (`OrderDetailsPanel.tsx`) - נוספה בדיקה חדשה אחרי
בדיקת `credit_balance` הקיימת: `if (payMethod !== "credit_balance"
&& Number(payAmount) > debt)` (משתמש ב-`debt` שכבר מחושב למעלה בקומפוננטה,
`totalPrice - paidAmount`) → `setPaymentError` עם "הסכום גבוה מהיתרה
לתשלום (₪X)." **`== debt` בכוונה מותר** - תשלום מראש בדיוק על הסכום
המלא בפעם אחת הוא תרחיש לגיטימי, לא עודף. `credit_balance` נשאר
מוגן כמו קודם (מול `clientCreditBalance`, לא מול `debt`).

**קבצים:** `src/components/orders/OrderDetailsPanel.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## תיקון #8: מחיקת לקוחה עם הזמנות פתוחות ✅ הושלמה

`handleDelete` (`Clients.tsx`) הפכה לאסינכרונית - **לפני** הצגת כל
`ConfirmDialog`, בודקת `getDocs(query(collection(db,"orders"),
where("clientId","==",client.id)))` (אותו דפוס שאילתה בדיוק כמו
`clientOrders` ב-`ClientDrawer.tsx`). אם יש הזמנות (`size > 0`) -
מציגה `ConfirmDialog` **שני, נפרד** (`variant="warning"`,
`deleteWarningClient`/`deleteWarningOrderCount`): "ללקוחה זו יש X
הזמנות קיימות - מחיקתה תשאיר אותן בלי קישור ללקוחה. להמשיך במחיקה
בכל זאת?". אם אין הזמנות - ה-`ConfirmDialog` הרגיל הקיים
(`deleteConfirmClient`, `variant="danger"`) נשאר ללא שינוי.

`performDelete` הפכה לקבל `client: Client | null` כפרמטר (במקום
לקרוא רק מ-`deleteConfirmClient`) - כך ששני מסלולי האישור (הרגיל/
האזהרה) קוראים לאותה פונקציית מחיקה יחידה, בלי שכפול לוגיקה.
**אם בדיקת ה-`getDocs` עצמה נכשלת** (שגיאת רשת וכו') - נופלת בחזרה
לאישור הרגיל, לא חוסמת את המחיקה כליל.

**קבצים:** `src/pages/Clients/Clients.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## תיקון #17: מחיר הזמנה לא יכול להיות 0 או שלילי ✅ הושלמה

**שדה "מחיר ללקוחה" (שלב 4, `NewOrderWizard.tsx`)** קיבל `min="0.01"`
(HTML). **בדיקת JS מפורשת** נוספה בתחילת `handleFinish`: `if (!price
|| Number(price) <= 0) { setSaveError("יש להזין מחיר גדול מאפס.");
return; }` - לפני כל יצירה בפועל, לא רק ה-HTML.

**נבדק שזה לא שובר פאת תצוגה/מוצר קמעונאי:** `handleFinish` (וכל
הבדיקה החדשה בתוכו) **לא מגיע לפועל בכלל** להזמנת "פאת תצוגה" -
זו יוצאת מהאשף כבר בשלב 2 (`handleNext`, `effectiveOrderType ===
"showroom"`) אל `SellShowroomStockModal` (`onOpenSellShowroom` +
`onClose`), עם לוגיקת מחיר עצמאית משלה - לא עוברת בכלל בשדה "מחיר
ללקוחה"/`handleFinish` של האשף. "מוצר קמעונאי" נוצר דרך
`QuickRetailSaleModal.tsx` הנפרד לגמרי - גם הוא לא תלוי ב-`NewOrderWizard.tsx`
בכלל. שני הקבצים האלה לא נגעו.

**קבצים:** `src/components/orders/NewOrderWizard.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## סיכום כללי (3 התיקונים)

תשלום רגיל שעולה על החוב בפועל נחסם (`debt`, לא רק `credit_balance`)
→ מחיקת לקוחה עם הזמנות קיימות מציגה אזהרה שנייה מפורשת לפני מחיקה
→ מחיר הזמנה 0/שלילי חסום ב-`NewOrderWizard` (HTML `min` + בדיקת JS),
בלי לפגוע בזרימות showroom/retail הנפרדות. כל תיקון עם build+lint
נפרד, commit+push נפרד.

---

# באג: ברירת המחדל של החודש בדף "ניהול הוצאות" תקועה על אוגוסט

## מה נמצא (לפני תיקון)

**לא באג של `getMonth()`** (אין +1 חסר/שגוי בשום מקום ב-`Expenses.tsx`
בכלל - לא נעשה שם שום חישוב תאריך דינמי). הבאג האמיתי: `const
[selectedMonth, setSelectedMonth] = useState("2026-08");` - **מחרוזת
קבועה מקודדת בקוד**, עם הערה מפורשת שנשארה מבדיקות ישנות: `// ברירת
מחדל: אוגוסט 2026`. אף פעם לא היה שם `new Date()` בכלל - זה לא "כמעט
נכון עם טעות קטנה", זו ברירת מחדל שנשארה קבועה מזמן שנכתבה (ולא
עודכנה כשעבר החודש בפועל).

## התיקון

הוחלף ב-`useState(() => { const now = new Date(); return
\`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,
"0")}\`; })` - **אותה שיטת חישוב בדיוק** כמו `thisMonth` ב-
`Dashboard.tsx` (`getFullYear()`/`getMonth()+1`, לא `toISOString()`
- נשאר בזמן מקומי, לא UTC, כדי לא להחליק יום/חודש קרוב לחצות
בטעות). Lazy initializer (`useState(() => ...)`) - מחושב פעם אחת
ב-mount, לא בכל render.

**קבצים:** `src/pages/Expenses/Expenses.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

# תיקון 3 הפערים הנותרים מהביקורת (סעיפים 22/16/3)

## תיקון #16: מחיר ידני שלילי בקטלוג ✅ הושלמה

שדה המחיר הידני היחיד באתר (`Calculators.tsx`, טבלת התצוגה המקדימה
במצב "ידני" ביצירת קטלוג - `catalog-price-input`) קיבל `min="0"`
(HTML). ב-`onChange`: `if (newValue < 0) return;` **לפני**
`setManualPrices` - ערך שלילי לא נשמר בכלל, הערך הקודם (התקין)
נשאר. **0 נשאר מותר בכוונה** (למשל שורה "בחינם") - רק שלילי חסום,
כמבוקש. זה השדה היחיד שנמצא - אין שדה מחיר ידני נוסף בעריכת קטלוג
קיים (מבנה/מלאות בלבד ניתנים לעריכה שם, `cost`/`price` מוצגים
read-only בטבלת התצוגה של קטלוג שנוצר).

**קבצים:** `src/pages/Calculators/Calculators.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## תיקון #22: הוצאה לא יכולה להיות בסכום שלילי ✅ הושלמה

**יצירת הוצאה חדשה** (`handleAddExpense`): נוספה בדיקה מפורשת אחרי
הבדיקה הקיימת `!newAmount`: `if (Number(newAmount) <= 0) {
setSaveError("יש להזין סכום גדול מאפס."); return; }` - חוסמת גם
שלילי, לא רק ריק/0. **עריכת סכום קיים** (`saveEditAmount`): נוספה
בדיקה מקבילה `if (value <= 0) { alert(...); return; }` **לפני**
`setEditingAmountId(null)` - כך שאם הבדיקה נכשלת, מצב העריכה נשאר
פתוח (לא נסגר בטעות עם ערך לא-תקין). שני שדות ה-`<input
type="number">` הרלוונטיים קיבלו `min="0.01"` כהגנה כפולה (HTML),
אותו דפוס בדיוק כמו מחיר ההזמנה ב-`NewOrderWizard.tsx`.

**קבצים:** `src/pages/Expenses/Expenses.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
