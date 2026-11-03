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

## תיקון #3: וולידציית פורמט טלפון ✅ הושלמה

נוצר `src/utils/phoneValidation.ts` - `isValidIsraeliPhone(phone)`
משותף (מקור regex אחד, לא משוכפל): `/^(0\d{8,9}|\+972\d{8,9})$/`
אחרי הסרת רווחים/מקפים (`replace(/[\s-]/g, "")`). 9-10 ספרות, מתחיל
ב-0 (מקומי) או `+972` (בינלאומי).

**`Login.tsx`** (הרשמה): נוספה בדיקה ב-`handleSubmit`, **רק כש-
`isRegistering`** (התחברות רגילה לא דורשת טלפון בכלל): `if
(isRegistering && !isValidIsraeliPhone(phone)) { setLocalError(...);
return; }`.

**`AddClientModal.tsx`** (הוספת/עריכת לקוחה): נוספה בדיקת פורמט
ב-`validate()`, **רק אם** `!isEditMode || form.phone.trim() !==
(editingClient?.phone || "").trim()` - כלומר לקוחה חדשה, או שהטלפון
בפועל שונה מהערך המקורי שנטען. **עריכת לקוחה קיימת בלי לגעת בשדה
הטלפון (פורמט ישן/חריג שכבר נשמר) לא נחסמת** - כמבוקש במפורש.

**קבצים:** `src/utils/phoneValidation.ts` (חדש),
`src/pages/Login/Login.tsx`, `src/components/modals/AddClientModal.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## סיכום כללי (3 התיקונים)

הוצאה בסכום שלילי חסומה (יצירה+עריכה, HTML `min` + בדיקת JS) →
מחיר ידני שלילי בקטלוג חסום (0 מותר, שלילי לא נשמר) → וולידציית
פורמט טלפון ישראלי משותפת (`isValidIsraeliPhone`) בהרשמה ובלקוחות,
בלי לחסום עריכת לקוחות קיימות עם פורמט ישן. כל תיקון עם build+lint
נפרד, commit+push נפרד.

---

# ביקורת מקיפה ומעמיקה: ערכים קבועים/תאריכים מקודדים/שאריות קוד
# (בדיקה בלבד, ללא שינויי קוד)

**מטרה:** חיפוש שיטתי, קובץ-קובץ, על כל 11 הקטגוריות שהוגדרו -
בהמשך ישיר לגילוי `useState("2026-08")` הקבוע ב-Expenses.tsx
(שכבר תוקן). **לא בוצע שום שינוי קוד, build או commit כחלק
מהביקורת הזו** - דיווח בלבד. כל הממצאים מ-grep/Read בפועל על הקוד
החי בזמן הביקורת.

## טבלת ממצאים

| קובץ | שורה | מה נמצא | קטגוריה | הערכה |
|------|------|---------|---------|-------|
| `src/pages/Sales/Sales.tsx` | 119 | `const today = new Date("2026-08-16");` - "היום" בפילטרי הזמן ("היום"/"השבוע"/"החודש") קבוע לתאריך מקודד, לא `new Date()` דינמי | 1 | **שארית בדיקה אמיתית** - מקביל בדיוק לבאג שכבר תוקן ב-`Expenses.tsx` (`useState("2026-08")`). כל שאר קבצי הפרויקט (Dashboard/Reports/Calendar/OrderDetailsPanel/QuickRetailSaleModal/SellShowroomStockModal) משתמשים ב-`new Date()` נכון |
| `src/pages/Settings/Settings.tsx` | 201-203 | `useState(4700)`/`useState(3.0)`/`useState(100)` - ברירות מחדל לפני טעינת Firestore, זהות ל-`DEFAULT_SETTINGS` | 8 | **קבוע כפול לא-מאוחד** - אותם 3 מספרים בדיוק מוגדרים בנפרד גם ב-`Calculators.tsx`/`RepairOrderForm.tsx` |
| `src/pages/Calculators/Calculators.tsx` | 9-13 | `const DEFAULT_SETTINGS = { pricePerKgUsd: 4700, exchangeRate: 3.0, profitMargin: 100 }` | 8 | **קבוע כפול לא-מאוחד** |
| `src/components/orders/RepairOrderForm.tsx` | 16 | `const DEFAULT_SETTINGS: RepairSettings = { pricePerKgUsd: 4700, exchangeRate: 3.0, profitMargin: 100 }` | 8 | **קבוע כפול לא-מאוחד** - זהה מילה-במילה לזה שב-`Calculators.tsx` |
| `src/components/orders/NewOrderWizard.tsx` | 18 | `const DEFAULT_HAIR_COST_SETTINGS: HairCostSettings = { pricePerKgUsd: 4700, exchangeRate: 3.0 }` | 8 | **קבוע כפול לא-מאוחד** - זהה מילה-במילה לזה שב-`ShowroomStockFormModal.tsx` |
| `src/pages/Inventory/ShowroomStockFormModal.tsx` | 15 | `const DEFAULT_HAIR_COST_SETTINGS: HairCostSettings = { pricePerKgUsd: 4700, exchangeRate: 3.0 }` | 8 | **קבוע כפול לא-מאוחד** - **סה"כ 5 עותקים נפרדים** של אותם ערכים בדיוק (4700/3.0/100) בפרויקט, בלי מקור משותף אחד |
| `src/components/clients/ClientDrawer.tsx` | 19-24 | `const ORDER_STATUS_LABELS: Record<Order["status"], string> = {...}` (5 שורות, זהה) | 8 | **קבוע כפול לא-מאוחד** - אותה מפה בדיוק מוגדרת גם ב-`OrderDetailsPanel.tsx` וגם ב-`Dashboard.tsx` |
| `src/components/orders/OrderDetailsPanel.tsx` | 15-20 | `const ORDER_STATUS_LABELS: Record<Order["status"], string> = {...}` - זהה ל-2 האחרים | 8 | **קבוע כפול לא-מאוחד** |
| `src/pages/Dashboard/Dashboard.tsx` | 33-38 | `const ORDER_STATUS_LABELS: Record<string, string> = {...}` - זהה ל-2 האחרים (רק הטיפוס שונה) | 8 | **קבוע כפול לא-מאוחד** - 3 עותקים זהים, אין אף אחד שמייבא מהאחר |
| `src/components/orders/OrderDetailsPanel.tsx` | 755-758, 818-821 | `<option value="cash">💵 מזומן</option>` וכו' - מוקלד ידנית 3 פעמים **באותו קובץ**, במקום להיגזר מ-`PAYMENT_METHOD_LABELS` המוגדר בשורה 39-46 של אותו קובץ עצמו | 8 | **קבוע כפול לא-מאוחד, בתוך קובץ יחיד** - 4 התוויות (מזומן/אשראי/העברה/צ'ק) מוקלדות פדנית 3 פעמים נוספות, על אף שיש מקור אחד קיים ומוכן ממש למעלה בקובץ |
| `src/pages/Expenses/Expenses.tsx` | 377-380, 450-453 | תוויות שיטת תשלום (💵 מזומן/💳 אשראי/🏦 העברה/📜 צ'ק) מוקלדות ישירות, דומות (לא זהות טכנית - שדה `paymentMethod` על הוצאה, לא `OrderPayment.method`) ל-`PAYMENT_METHOD_LABELS` | 8 | **לא ברור, דורש בירור** - דומיין נתונים שונה מהותית (הוצאה מול תשלום הזמנה), אז אולי לא צריך לאחד בכלל - לא בהכרח באג |

## כל שאר הקטגוריות - נבדקו במלואן, ללא ממצאים

- **קטגוריה 2 (`useState` עם ברירות מחדל חשודות) / 5 (ברירות מחדל
  בטפסים):** כל הטפסים המבוקשים נבדקו (NewOrderWizard,
  RepairOrderForm, AddClientModal, QuickRetailSaleModal,
  AddBulkItemModal, ShowroomStockFormModal, AddHairModal,
  CreateRemnantBoxModal, MergeRemnantModal, Settings.tsx, Login.tsx).
  כל הערכים שנמצאו (`size="M"`, `texture="גלי"`, `quantity=1`,
  `activePage='dashboard'`, `startTime="10:00"` וכו') הן בחירות UX
  סבירות ומוצדקות (ברירת מחדל הגיונית לשדה בחירה), לא שאריות נתון
  אמיתי מבדיקה.
- **קטגוריה 3 (הערות שאריות בדיקה):** אין אף הערת
  TODO/FIXME/XXX/HACK/"זמני"/"בדיקה" בקוד בכלל.
- **קטגוריה 4 (console.log/debug/info שיוריים):** אין אף
  `console.log`/`console.debug`/`console.info` בכל הפרויקט - רק
  `console.error` בתוך `catch`, כמו שצריך.
- **קטגוריה 6 (UID/businessId מקודד):** לא נמצא אף מופע.
- **קטגוריה 7 (URL-ים מקודדים):** לא נמצא אף URL חשוד - `wa.me`,
  Google OAuth (`accounts.google.com`), וה-Cloud Function האמיתי
  (`esti-wigs-system.cloudfunctions.net`) - כולם לגיטימיים.
- **קטגוריה 9 (קוד מבוטל/מוער):** אין אף בלוק קוד מבוטל בפרויקט.
- **קטגוריה 10 (`as any`):** אין אף מופע בכל הפרויקט.
- **קטגוריה 11 (exports לא בשימוש):** כל 17 ה-exports ב-
  `src/utils/*.ts` נבדקו ואומתו בשימוש בפועל. `WigOrder`/`Payment`/
  `ClientDocument` (שתועדו כ"מתים" ב-CLAUDE.md) **כבר לא קיימים
  בכלל** ב-`types/index.ts` - הוסרו במלואם בעבר, לא נותרו כקוד מת.

**סיכום:** 10 ממצאים אמיתיים (סה"כ 1 שארית בדיקה מוצקה + 9 מופעי
קבועים כפולים), 1 ממצא "לא ברור/דורש בירור", ו-9 קטגוריות נקיות
לגמרי. לא בוצע שום שינוי קוד, build או commit כחלק מהביקורת הזו.

---

# תיקון דחוף: תאריך מקודד ב-Sales.tsx ✅ הושלמה

`const today = new Date("2026-08-16");` (שורה 119) הוחלף ב-`const
today = new Date();` - אותו דפוס בדיוק כמו כל שאר הקבצים בפרויקט
(`Dashboard.tsx`, `Reports.tsx`, `Calendar.tsx`, `OrderDetailsPanel.tsx`,
`QuickRetailSaleModal.tsx`, `SellShowroomStockModal.tsx`) - עקביות
עם מה שכבר נכון בכל מקום אחר, לא נוסחה חדשה. משפיע על פילטרי הזמן
"היום"/"השבוע"/"החודש" בדף מכירות (Sales.tsx), שהיו מחושבים יחסית
ל-16.8.2026 קבוע במקום התאריך הנוכחי בפועל.

**קבצים:** `src/pages/Sales/Sales.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

# משימה 1: קטלוגי מחירים - עלות נוספת + עריכה אחרי יצירה + הדפסה/שיתוף

## חלק 1א': עלות נוספת בקטלוג ✅ הושלמה

`PriceCatalog` קיבל `extraCost: number` (ברירת מחדל 0, נגזר תמיד
בטעינה: `(data.extraCost as number) ?? 0`, כדי שקטלוגים ישנים בלי
השדה יטענו בדיוק כמו קודם) ו-`extraCostLabel?: string` (אופציונלי
בפועל).

`computeAutoRows`/`recomputeRows` קיבלו פרמטר `extraCost` חדש:
`cost = Math.round(hairCost + extraCost)`, `price = Math.round(cost
* (1 + profitMargin/100))` - העלות הנוספת נכנסת ל-cost הכולל, ואז
הרווח/המחיר האוטומטי מחושבים עליו כמו קודם. כל הקריאות הקיימות
(`previewRows`, `handleRefreshCatalog`, `handleSaveEdit`) עודכנו
להעביר את ה-extraCost הרלוונטי.

**טופס היצירה** קיבל שורה חדשה: "עלות נוספת ₪ (אופציונלי)"
(`MiniNum` עם `min={0}` חדש - הורחב כדי לתמוך בהגנה הזו, לא רק
HTML - ערך מתחת ל-min לא נשמר, אותו דפוס כמו שדה המחיר הידני
בטבלת הקטלוג) ו-"תיאור העלות הנוספת (אופציונלי)" (`MiniText`). אין
וולידציית חובה - ריק = 0.

**שמירה ל-Firestore:** `extraCost: Number(extraCost) || 0` נכתב
תמיד (מספר, לעולם לא `undefined`). `extraCostLabel` נכתב **רק אם
לא ריק** (`...(trimmed ? { extraCostLabel: trimmed } : {})`) - לא
`extraCostLabel: undefined`, ש-Firestore דוחה.

**בכרטיס הקטלוג** נוספה שורת תיאור: "כולל עלות נוספת: ₪X (label)"
- מוצגת רק כש-`extraCost > 0`, התיאור בסוגריים רק אם קיים.
`buildCatalogCopyText` **לא שונה** - כמבוקש במפורש.

**קבצים:** `src/pages/Calculators/Calculators.tsx`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

## חלק 1ב': עריכה אחרי יצירה ✅ הושלמה

**נעילת מחיר per-row** (`CatalogRow.priceManual?: boolean`) מחליפה
את ההחלטה שהיתה קודם ברמת הקטלוג כולו (`mode`): `recomputeRows`
(משמש גם ב"עדכן לפי הגדרות נוכחיות" וגם בשמירת עריכה) מחשבת מחדש
`cost`+`price` לכל שורה, **חוץ** משורות עם `priceManual: true` -
אלו שומרות את המחיר המדויק שלהן, גם אם ה-cost שלהן השתנה. קטלוג
שנוצר במצב "ידני" מקבל `priceManual: true` על **כל** שורותיו
(לא רק אלו שנערכו בפועל) - עקבי עם ההתנהגות הקודמת (מחיר ידני לא
מתעדכן אוטומטית).

**טופס העריכה** (כפתור ✏️) התרחב: בנוסף לשם/מבנה/מלאות - שדות
"עלות נוספת"/"תיאור" (אותם `MiniNum`/`MiniText` כמו ביצירה).
שמירה (`handleSaveEdit`) כותבת `extraCost` מעודכן וקוראת ל-
`recomputeRows` עם הערך החדש. אם תיאור העלות הנוספת נוקה (היה
ולא עוד) - נכתב `deleteField()`, לא `extraCostLabel: undefined`.

**עריכת מחיר inline בטבלת קטלוג שמור** - `CatalogPriceCell` (רכיב
חדש): `<input type="number" min="0">` בכל תא מחיר, state מקומי
(לא state של ההורה, כדי לא "לקפוץ" תוך כדי הקלדה מול ה-`onSnapshot`
החי) - `key={row.price}` על המופע (לא `useEffect`+`setState`,
שהיה מפעיל את `react-hooks/set-state-in-effect` שכבר הוכר כבעיה
חוזרת בסשן) מאפס את ה-state המקומי כש-price משתנה מבחוץ. שלילי לא
נשמר (כמו בטבלת התצוגה המקדימה), 0 מותר. שמירה (`onBlur`, רק אם
הערך השתנה) → `handleRowPriceChange` → `updateDoc` עם המערך המלא
של `rows` (Firestore לא תומך בעדכון איבר בודד במערך), נועלת **רק**
את השורה הזו (`priceManual: true`).

**נעילה/שחרור:** שורה נעולה מציגה אייקון `Lock` (lucide-react,
13px) עם `title="מחיר ידני - לא יתעדכן אוטומטית. לחצי לשחרור
הנעילה"`; לחיצה עליו (`handleUnlockRowPrice`) מחזירה את השורה
הספציפית למחיר אוטומטי לפי ההגדרות הנוכחיות (`unlockRowPrice` -
לא "מקפיאה" את המחיר הידני האחרון כאילו הוא אוטומטי, מחשבת מחדש
מהתחלה).

**קבצים:** `src/pages/Calculators/Calculators.tsx`,
`src/pages/Calculators/Calculators.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע (באג `react-hooks/set-state-in-effect` חדש נתפס
ותוקן לפני ה-build הסופי - ראו למעלה).

## חלק 1ג': הדפסה ושיתוף של הקטלוג ✅ הושלמה

**עיקרון מחייב שנאומת בקוד (לא רק בכוונה):** `buildCatalogShareText`
החדשה **לא מקבלת `showProfit` כפרמטר בכלל** (לא רק לא משתמשת בו) -
רק `row.length`/`row.price`. אזור ההדפסה (`.print-area` JSX) מרנדר
רק `printingCatalog.name`/`structure`/`fullness`/`businessName`/
`logoUrl` + `row.length`/`row.price` לכל שורה - `grep` אימת שאין
אזכור `cost`/`profit` בשתיים. `buildCatalogCopyText` הקיים (העתק
לשליחה, כן מכבד `showProfit`) **לא שונה**.

**שם עסק/לוגו:** `CalculatorsPage` טוען `users/{uid}` (getDoc
חד-פעמי, אותו דפוס כמו App.tsx) - `businessName`/`logoUrl` עוברים
כ-props ל-`PriceCatalogsTab`, מוצגים בראש מסמך ההדפסה.

**הדפסה (🖨):** `handlePrintCatalog` שומר את הקטלוג הנבחר
(`printingCatalog`), מוסיף מחלקה `is-printing-catalog` ל-`body`,
וקורא ל-`window.print()` בתוך `requestAnimationFrame` (נותן ל-React
לרנדר את אזור ההדפסה לפני ההדפסה בפועל - קריאה סינכרונית מוקדמת
יותר היתה מדפיסה דף ריק). `afterprint` (listener גלובלי) מנקה את
המחלקה ואת ה-state בחזרה.

**CSS הדפסה (`Calculators.css`):** `.print-area { display: none }`
קבוע במסך; ב-`@media print` - הכלל "הסתר הכל/הצג רק את האזור הזה"
חל **רק** כש-`body.is-printing-catalog` קיים (לא כלל גלובלי סמוך -
כך שהדפסה מדף אחר באתר לא נפגעת, אף שכל ה-CSS מתאחד לקובץ בודל
אחד). `@page { size: A4; margin: 15mm }`, `page-break-inside: avoid`
על שורות הטבלה, תאריך הפקה דרך `formatDateIL` המשותף (dd/mm/yyyy).

**שיתוף (↗):** `handleShareCatalog` - אם `navigator.share` קיים,
פותח את חלון השיתוף של המכשיר עם הטקסט הנקי; ביטול מפורש
(`AbortError`) **לא** מוצג כשגיאה. אם לא קיים - תפריט נפילה קטן
(`shareMenuCatalogId`) עם "שליחה בוואטסאפ" (`wa.me/?text=...`,
`encodeURIComponent`) ו-"העתקה" (`CopyButton` הקיים, עם משוב ✓
מובנה) - נסגר בלחיצה מחוץ לו (אותו דפוס click-outside כמו
`CustomSelect`).

**הגנה על קטלוג ריק:** כפתורי הדפסה/שיתוף `disabled` כש-
`catalog.rows.length === 0`.

**קבצים:** `src/pages/Calculators/Calculators.tsx`,
`src/pages/Calculators/Calculators.css`.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע. `grep` אימת שאין `cost`/`profit` באזור ההדפסה
או בטקסט השיתוף - ראו מעלה.

---

## סיכום משימה 1

עלות נוספת per-catalog → נעילת מחיר per-row + עריכה מלאה אחרי
יצירה → הדפסה/שיתוף נקיים ללקוחה (לעולם לא cost/profit/extraCost,
נאומת בקוד לא רק בכוונה). כל חלק עם build+lint נפרד, commit+push
נפרד. משימה 1 הושלמה במלואה לפני התחלת משימה 2.

---

## משימה 2 - חלק 2א': בדיקה לפני שינוי (אורך חופשי) - ללא שינוי קוד

**שלב בדיקה בלבד, כמבוקש - לא נגעתי בקוד.**

### איך משקל-לפי-אורך מחושב בפועל (`src/utils/hairCost.ts`)

**טבלת חיפוש קבועה, לא נוסחה רציפה.** `BASE_WEIGHTS` מחזיקה
משקל (גרם) לכל אחד מ-15 האורכים הקבועים (5,10,15...75):

```ts
const BASE_WEIGHTS: Record<number, number> = {
  5: 110, 10: 140, 15: 170, 20: 200, 25: 230, 30: 260, 35: 290,
  40: 320, 45: 350, 50: 380, 55: 410, 60: 440, 65: 470, 70: 500, 75: 530,
};
```

`lookupBaseWeight(length)` מחזירה את **המפתח הגדול ביותר ≤ האורך
שהוזן** ("floor"), בלי אינטרפולציה. כלומר היום, אורך 23 מחזיר
בדיוק את אותה תוצאה כמו אורך 20 (200 גרם) - זו בדיוק התקלה שמשימה
2 נועדה לתקן. `calculateHairCost` קוראת ל-`lookupBaseWeight`,
מוסיפה מכפילי מבנה/מלאות (`STRUCTURE_MOD`/`FULLNESS_MOD`), ומעבירה
ל-`calculateHairCostFromGrams` לחישוב עלות השיער בש"ח.

### כל המקומות שמשתמשים ב-HAIR_LENGTH_OPTIONS / בוחרים אורך

| קובץ | שדה | מה הוא עושה עם האורך |
|---|---|---|
| `Calculators.tsx` → `PriceCalculator` ("מחשבון הצעת מחיר לפאה") | `length` - `MiniSelect` עם `HAIR_LENGTH_OPTIONS` | `calculateHairCost({length,...})` → עלות שיער → מחיר מוצע. **זה השדה שתואם בדיוק לבקשה בחלק 2ג' - select שתלוי בטבלה.** |
| `Calculators.tsx` → `LengthPlanner` ("מחשבון אורכים לבניית פאה") | `nape`/`ear` | **כבר `MiniNum` - שדה מספר חופשי, לא select בכלל.** לא קוראת ל-`calculateHairCost`/`BASE_WEIGHTS` בכלל - מחשבת רצף שלבי תספורת שלמים מנקודת פתיחה (`MAX_CAPS`/`NAPE_STAGES`/`EAR_STAGES`), חישוב נפרד לגמרי מעלות שיער. |
| `Calculators.tsx` → `computeAutoRows`/קטלוגים | לופ על כל `HAIR_LENGTH_OPTIONS` | רשימת מחירים קבועה לכל 15 האורכים - **לא נוגעים, כמבוקש** (זו רשימת מחירים, לא מחשבון). |
| `NewOrderWizard.tsx` | `hairLength` - `<select>` רגיל עם `HAIR_LENGTH_OPTIONS` | `calculateHairCost` → `hairCostEstimated`. **תלוי בטבלה - לא משנים בסבב הזה, רק מדווחים.** |
| `ShowroomStockFormModal.tsx` | `length` - `CustomSelect` עם `LENGTH_SELECT_OPTIONS` (נגזר מ-`HAIR_LENGTH_OPTIONS`) | `calculateHairCost` → `hairCost`. **תלוי בטבלה - לא משנים בסבב הזה, רק מדווחים.** |
| `RepairOrderForm.tsx` | - | **אין תלות כלל.** מקבלת `grams` ישירות מהמשתמשת, קוראת ל-`calculateHairCostFromGrams` במישרין - לא עוברת דרך אורך/טבלה בכלל. |

### פער שנמצא מול הבקשה (דיווח, לא תיקון)

**חלק 2ב' מניח ש"אורך עורף" ב"מחשבון אורכים לבניית פאה"
(`LengthPlanner`) הוא `CustomSelect`** - אבל הוא כבר שדה מספר חופשי
(`MiniNum`) היום, ואינו תלוי בטבלת המשקלים כלל (חישוב שלבי
תספורת, לא עלות שיער). אין "המרה מ-select" לביצוע שם. מה שבאמת
חסר לפי תיאור הדרישה: **וולידציית טווח (5-75, הודעת שגיאה)** -
זו לא קיימת היום באותו שדה.

**חלק 2ג' ("אותו דבר ב'מחשבון הצעת מחיר לפאה'")** - זה בדיוק
`PriceCalculator`, שם השדה **הוא** `MiniSelect` עם
`HAIR_LENGTH_OPTIONS`, ושם באמת נדרשת ההמרה לשדה חופשי +
אינטרפולציה לינארית בין שני המפתחות הסמוכים בטבלה (למשל 23 בין
20 ל-25), ב-`hairCost.ts` במקום אחד משותף (לא כפול בכל מחשבון),
עם שמירה שאורך מדויק בטבלה (20, 25...) מחזיר תוצאה זהה להיום.

**אישור התקבל**: להתקדם כפי שהוצע - 2ג' (PriceCalculator) ואז 2ב'
(LengthPlanner).

---

## משימה 2 - חלק 2ג': אורך חופשי ב"מחשבון הצעת מחיר לפאה"

**`src/utils/hairCost.ts` - `lookupBaseWeight`**: הוחלף מ"floor
לנקודת הטבלה הקרובה מתחת" לאינטרפולציה לינארית בין שני המפתחות
הסמוכים (`lower`/`upper`), עם הצמדה לקצה הטווח (5 או 75) מחוץ
לתחום. פונקציה משותפת אחת - לא כפול בכל מחשבון, לפי הבקשה. אורך
בדיוק על מפתח (5,10...75) מחזיר `lower === upper` ולכן את הערך
המדויק מהטבלה בלי שינוי. ה-diff בין כל שני מפתחות סמוכים בטבלה
הוא קבוע (30 גרם), כך שה-netGrams המתקבל לכל אורך שלם תמיד שלם
בעצמו (לא נדרש עיגול).

אומת ידנית (סקריפט חד-פעמי, לא נשאר בריפו): `20→200`, `25→230`
(זהה למה שהיה), `23→218` (בין השניים), `3→110`, `80→530` (הצמדה
לקצה, לא קריסה/NaN).

**`src/pages/Calculators/Calculators.tsx`**:
- `MiniNum` קיבל `max`/`integer` אופציונליים (בנוסף ל-`min` הקיים),
  עם אותה הגנה כמו `min`: ערך מעבר לטווח לא נשמר כלל ברמת ה-state
  (לא רק HTML-level) - `integer` חוסך את החלק העשרוני לפני הבדיקה.
- `PriceCalculator` ("מחשבון הצעת מחיר לפאה"): שדה "אורך עורף"
  הוחלף מ-`MiniSelect` (עם `HAIR_LENGTH_OPTIONS`) ל-`MiniNum` חופשי
  (`min={5} max={75} integer`). `length` עצמו הפך ל-`number | ""`.
  `missing` כולל `length === ""` (כמו קודם, רק ללא ה-select).
  ריק/מחוץ לטווח → השדה פשוט לא מקבל את הערך (כמו שדה "עלות נוספת"
  הקיים בקטלוגים) → "יש למלא את כל הפרטים" מוצג, בלי קריסה.
- `computeAutoRows`/קטלוגי המחירים, `NewOrderWizard.tsx`,
  `ShowroomStockFormModal.tsx` - לא נגעתי, כמבוקש; הם ממשיכים
  להעביר רק אורכי-5 מדויקים, כך שההתנהגות שלהם לא השתנתה (אינטרפולציה
  בין מפתח לעצמו = הערך המדויק הקיים).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## משימה 2 - חלק 2ב': וולידציית טווח ב"מחשבון אורכים לבניית פאה"

כפי שדווח בחלק 2א' - שדה "אורך עורף" (`nape`) ב-`LengthPlanner`
היה **כבר** `MiniNum` חופשי (לא select), ולא תלוי בטבלת המשקלים
של `hairCost.ts` בכלל (חישוב שלבי תספורת נפרד). לכן לא הייתה כאן
המרה לביצוע - רק הפער שזוהה: לא הייתה וולידציית טווח.

**`src/pages/Calculators/Calculators.tsx`**: לשדה "אורך עורף"
ב-`LengthPlanner` נוספו `min={5} max={75} integer` (אותה הגנה
שנוספה ל-`MiniNum` בחלק 2ג') + placeholder "חובה (5-75)". ערך
ריק/מחוץ לטווח לא מגיע ל-state בכלל (אי-חישוב, בלי קריסה) - אותו
עיקרון מדויק שכבר קיים לשדה "עלות נוספת" בקטלוגים ול"אורך עורף"
בחלק 2ג'. שדה "אורך אוזניים" (`ear`) לא שונה - לא נכלל בבקשה.

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.

---

## סיכום משימה 2

`hairCost.ts`: טבלת לוקאפ, לא נוסחה רציפה - הוחלפה לאינטרפולציה
לינארית משותפת אחת (`lookupBaseWeight`), עם שמירה מלאה על ערכי
המפתח (5,10...75) ועיגול טבעי (diff קבוע של 30 גרם בין מפתחות).
`PriceCalculator` הומר לשדה חופשי עם הטווח הזה. `LengthPlanner`
התגלה כבר חופשי - רק וולידציית טווח נוספה לו. קטלוגי מחירים,
`NewOrderWizard`, `ShowroomStockFormModal`, `RepairOrderForm` לא
שונו - לא תלויים בשינוי או לא נכללו בבקשה, כמפורט בחלק 2א'.

---

## תיקון: באג הקלדה בשדה אורך (min/max חסם הקלדה לפני שהמספר הושלם)

### שלב 1 - אישור הבאג

**אושר, זו אכן הסיבה.** ב-`MiniNum` (לפני התיקון), `type="number"`
עם בדיקת `newValue < min`/`newValue > max` בכל `onChange` - כל
תו שהוקלד מומר למספר ונבדק מול הטווח המלא **באותו רגע**, לא רק
בסיום ההקלדה. בשדה "אורך עורף" (`min=5`), הספרה הראשונה של מספר
דו-ספרתי קטן מ-5 (23→"2", 15→"1", 30→"3", 40→"4") נזרקת ברגע
ההקלדה הראשון, ומכיוון שה-state לא מתעדכן - React מחזיר את השדה
ל-value הקודם (ריק), כך שלא ניתן היה להקליד את הספרה הראשונה
בכלל ולכן את המספר כולו. זה פגע בכל מספר דו-ספרתי שהספרה הראשונה
שלו קטנה מ-min (23, 15, 30, 40 כולם נפגעו; 56, 60, 75 למשל לא,
כי "5"/"6"/"7" הראשוני לא קטן מ-5).

### שלב 2 - התיקון

**`src/pages/Calculators/Calculators.tsx` - `MiniNum`**: שדה
`integer` עובר מ-`type="number"` ל-`type="text"` + `inputMode="numeric"`.
בזמן ההקלדה מסננים רק תווים שאינם ספרות (`replace(/\D/g, "")`) -
**בלי שום בדיקת טווח** על הערך החלקי. בדיקת 5-75 עברה לרכיב הקורא
(`PriceCalculator`/`LengthPlanner`) על הערך המלא, לא על כל תו.
שדות לא-`integer` (מחיר/עלות, `min=0` בלבד) לא שונו - ה-type
נשאר `number` וההגנה המקורית מפני שלילי (שחוסמת רק את סימן המינוס,
לא ספרה ראשונה של מספר חיובי) לא נפגעה מהבאג הזה מלכתחילה.

**`PriceCalculator`**: `lengthOutOfRange` מחושב על הערך המלא;
`missing` כולל אותו; הודעת "יש להזין אורך בין 5 ל-75" מוצגת
במקום ההודעה הכללית כשרלוונטי, בלי חישוב ובלי קריסה. שדה האורך
מקבל `error={lengthOutOfRange}` (מסגרת אדומה, אותו class קיים).

**`LengthPlanner`**: אותו דבר - `napeOutOfRange`, חסימת `napeRows`,
הודעת שגיאה זהה, `error` על השדה.

**`.calc-hint-error`** נוסף ל-`Calculators.css` (וריאציה אדומה
של `.calc-hint` הקיים, עם `--color-danger`/`--color-danger-bg`
הקיימים באתר).

**מעבר על כל שימושי `MiniNum` (11 מקומות) - שום דבר לא נשבר:**
`length`/`nape` (integer, min/max) - מתוקנים; `skinTop`/`net`/`extra`
(בשני המחשבונים), `ear`, `grams`/`color` - בלי min/max/integer,
`type="number"` נשאר כמו שהיה, לא נגעתי; `extraCost`/`editExtraCost`
(`min=0`, לא integer) - נשארו `type="number"`, ללא שינוי התנהגות.

### שלב 3 - אימות (סקריפט Node חד-פעמי, לא נשאר בריפו - מריץ את
אותה לוגיקת `lookupBaseWeight`/`calculateHairCost` בדיוק)

- **5, 15, 23, 40, 75 מחשבים בלי שגיאה**: ✅ כל חמשתם החזירו
  `netGrams`/`hairCost` תקינים (למשל 23→`netGrams=218`,
  `hairCost≈4391.14`), בלי `null`/שגיאה.
- **4 ו-76 מציגים הודעה ולא מחשבים**: ✅ שניהם החזירו `null`
  בסימולציית לוגיקת ה-UI (`length<5 || length>75`) - ה-UI מציג
  "יש להזין אורך בין 5 ל-75" ולא מחשב.
- **23 נותן מחיר בין 20 ל-25**: ✅ `hairCost(20)=4028.57`,
  `hairCost(23)=4391.14`, `hairCost(25)=4632.86` - 23 בדיוק באמצע.
- **20 ו-25 נותנים בדיוק את אותו מחיר כמו קודם התיקון**: ✅
  `netGrams(20)===200` ו-`netGrams(25)===230` - זהים לערכי הטבלה
  המקוריים (`BASE_WEIGHTS[20]`/`BASE_WEIGHTS[25]`), בלי שינוי.

### שלב 4

`npm run build` נקי. `npm run lint` - 24 בעיות, זהה לבייסליין
הקבוע. Commit: **`15dcf38`** - "תיקון: באג הקלדה בשדה אורך
(min/max חסם ספרה ראשונה לפני שהמספר הושלם)". נדחף ל-`main`.

### שלב 5 - פריסה

`npm run build` רץ בהצלחה, `dist/` מוכן ועדכני. **`firebase
deploy --only hosting` נחסם על ידי מערכת ההרשאות של Claude Code
עצמה** (לא כשל התחברות/firebase) - סיווג אוטומטי שחוסם פקודות
פריסה לפרודקשן בלי אישור ידני נפרד בזמן הריצה, גם כשיש אישור
מפורש בהודעה. **לא ניסיתי לעקוף** את זה. לביצוע הפריסה בעצמך:

```bash
cd /home/user/estiwigsportal
firebase deploy --only hosting
```

(אפשר גם מהצ'אט: `! firebase deploy --only hosting`). לאחר
ההרצה, `https://esti-wigs-system.web.app` אמור להיות מעודכן.

### מה לא ניתן לאמת בלי דפדפן (בכנות)

- התנהגות ההקלדה בפועל בדפדפן (IME, הדבקה, backspace באמצע
  מספר) - נבדקה לוגית (filter על תווים, אין בדיקת טווח תוך הקלדה)
  אבל לא הורצה בדפדפן אמיתי.
- התצוגה החזותית של הודעת השגיאה האדומה (`.calc-hint-error`)
  ושל מסגרת ה-input האדומה - לא צולם/נבדק ויזואלית.
- שום דבר לא נבדק אחרי הפריסה בפועל (כי היא לא בוצעה על ידי) -
  לא ניתן לאשר שהאתר החי משקף את הקוד החדש עד שהפריסה תרוץ.
