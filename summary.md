# סיכום: 5 שינויים ל-NewOrderWizard.tsx / RepairOrderForm.tsx

## 1. הסרת שריד מודל "פאת תצוגה" הישן מ-NewOrderWizard - אושר מראש

נבדק והוסבר למשתמשת לפני נגיעה: שלב 3 של האשף (`orderType==="inventory"`)
עדיין הציג "בחירת פאת תצוגה למכירה" - רשימת `hairItems` עם
`status==='showroom'`. מאז עיצוב מחדש של פאת תצוגה כמסמך `orders`
נפרד (`isShowroomStock`), שום דבר במערכת כבר לא מגדיר `HairItem.status`
כ-`'showroom'` - הרשימה תמיד ריקה בפועל, ואם בכל זאת נבחר פריט ישן
כזה, הסיום היה יוצר הזמנה מקבילה ולא-תואמת (בלי `isShowroomStock`/
`retailPrice`/`showroomCode`), עוקפת לגמרי את `SellShowroomStockModal.tsx`
הייעודי. אושר כשריד קוד מת - הוסר לגמרי (לא הופנה לטאב אחר, כי אין
יותר פעולה תקפה שהאשף הזה יכול לבצע עבור פאת תצוגה):
- הוסרה כרטיסיית "פאת תצוגה" משלב 1 (נשארו רק "פאה חדשה"/"תיקון-שירות").
- `orderType` צומצם ל-`"new" | "repair" | "other"`.
- הוסר בלוק שלב 3 הייעודי + כל ה-state הנלווה (`showroomItems`,
  `showroomSearch`, `selectedShowroomItemId`, `filteredShowroomItems`,
  `selectedShowroomItem`) והטעינה שלהם (`getDocs` על `hairItems`).
- `handleFinish` פושט: הוסרו כל ענפי ה-`isShowroomSale`, כולל עדכון
  `hairItems/{id}` ל-`status:"sold"` שהיה ייחודי לזרימה הזו.
- `ORDER_TYPE_LABELS.inventory` הוסר; `HairItem` הוסר מה-imports (כבר
  לא בשימוש בקובץ).

## 2. דילוג על שלב בחירת לקוחה כשהיא כבר ידועה

כשהאשף נפתח עם `preselectedClient` (תמיד המקרה בפועל - הוא נפתח רק
מתוך `ClientDrawer.tsx`) - שלב 2 (בחירת לקוחה) מדולג לגמרי בשני
הכיוונים: `handleNext` בשלב 1 קופץ ישר לשלב 3 (`setStep(preselectedClient
? 3 : 2)`), ופונקציה חדשה `handleBack` (מחליפה `onClick={() => setStep(step-1)}`
הישיר) קופצת משלב 3 ישר חזרה לשלב 1. "תיקון/שירות" (שיוצא מהאשף
לגמרי ל-`RepairOrderForm`) מטופל עכשיו גם ביציאה משלב 1 (לא רק שלב
2 כמו קודם), כדי שהיציאה עדיין תקרה נכון גם כששלב 2 מדולג.

## 3. פריטי מלאי (usedBulkItems) ב-RepairOrderForm

נוספה בדיוק אותה יכולת שכבר קיימת ב-`NewOrderWizard.tsx`: state
(`bulkItemsCatalog`/`usedBulkItems`/`bulkItemPickerId`/`bulkItemPickerQty`/
`bulkItemQtyError`), טעינת קטלוג `bulkItems` בפתיחה, `handleAddUsedBulkItem`/
`handleRemoveUsedBulkItem` עם אותה וולידציית מלאי מצטברת, ובדיקת הגנה
נוספת (defense in depth) לפני היצירה + הורדת מלאי מקובצת אחרי היצירה -
אותו דפוס בדיוק כמו `NewOrderWizard.handleFinish`. עלות הפריטים
(`usedBulkItemsCost`) נכנסת ל-`mfgCost` (`calc`), ולכן משפיעה גם על
מחיר ההצעה האוטומטי ללקוחה. JSX משתמש שוב ב-`.bulk-item-list`/
`.bulk-item-add-row`/`.field-error` הקיימים כבר גלובלית (נטענים דרך
`NewOrderWizard.css`, שממילא תמיד נטען יחד עם `RepairOrderForm.tsx`
דרך `ClientDrawer.tsx`) - לא נדרש CSS חדש.

## 4. ניהול תשלומים/חובות בתיקון - אומת, לא נדרש שינוי

`RepairOrderForm.tsx` כבר יוצר את ההזמנה דרך `createOrder()` המשותף
(אותו helper כמו `NewOrderWizard`), עם `clientId` אמיתי ובלי
`isShowroomStock` - כלומר זו כבר בדיוק הזמנת `orders` רגילה, לא
מסוננת מ-Sales.tsx (לא `isUnsoldShowroomStock`), ונפתחת באותו
`OrderDetailsPanel.tsx` עם ניהול התשלומים המובנה שכבר קיים שם. לא
נבנה שום ניהול תשלומים נפרד בתוך `RepairOrderForm.tsx` - זה כבר
מיותר לגמרי ברגע שההזמנה נוצרת.

## בדיקות שבוצעו

- `npm run build` (tsc -b + vite build) עובר נקי.
- `npm run lint` - אין שגיאות/אזהרות חדשות; שתי השגיאות הקיימות
  (`NewOrderWizard.tsx`/`RepairOrderForm.tsx`) הן `react-hooks/set-state-in-effect`
  ו-`no-explicit-any` ישנות ולא קשורות - אומת עם `git diff` שהשורות
  המדוברות לא נגעו בהן.
- לא בוצעה בדיקה ויזואלית בדפדפן בפועל - מומלץ לבדוק ידנית לפני
  סמיכה מלאה, בפרט את דילוג השלבים (סעיף 2) ואת זרימת התיקון המלאה
  מקצה לקצה (סעיף 3).
