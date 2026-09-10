# סיכום: תיקון חישוב "בלאי בפועל" - ניכוי משקל שמוזג לקופסאות שאריות ✅ הושלמה

## הבעיה
`closingSummary` (חישוב הבלאי ב"סגירת קוקו", `Inventory.tsx`) חיסר
מ-`initialWeight` רק את `totalGramsUsed` (סכימת `gramsUsed` מכל
`usedHairItems` בהזמנות) - בלי לנכות משקל שהועבר בעבר לקופסת שאריות
דרך מיזוג (`handleMergeIntoRemnantBox`). התוצאה: כל משקל שמוזג
נספר כ"בלאי" בטעות, למרות שהוא נשמר בפועל בשווי בקופסה - מנפח את
הבלאי המחושב בכל מקרה שהיה מיזוג לפני סגירה (המשתמש דיווח שזה קורה
כמעט תמיד).

## התיקון
נוסף חישוב `totalMergedToRemnantBoxes`: מעבר על כל `hairItems` עם
`isRemnantBox === true`, ובכל אחת - סכימת `weightMerged` מכל רשומה
ב-`remnantMergeLog` שלה שבה `sourceItemId` שווה למזהה הקוקו הנסגר.

```ts
const waste = item.initialWeight - totalGramsUsed - totalMergedToRemnantBoxes;
```

## עדכון תצוגת הסיכום
נוספה שורה ל-`ConfirmDialog` של הסגירה: "הועבר לקופסאות שאריות: X
גרם" - בין "סך גרמים שתועדו" ל"בלאי מחושב", כדי שיהיה ברור מאיפה כל
מספר מגיע. מוצגת ללא תנאי (גם כ-0 גרם כשלא רלוונטי) - עקבי עם שאר
שורות הסיכום.

## ביטול סגירה - אומת שלא נדרש שינוי
`handleConfirmUndoCloseHairItem` לא תלוי בחישוב מחדש בכלל - הוא
פועל אך ורק לפי `wasteReconciliationLog` שנשמר בזמן הסגירה (מחסיר
בדיוק `amountAdded` מכל `entry`), כך שהוא ממשיך לעבוד נכון אוטומטית
גם עם הנוסחה המתוקנת, בלי שום שינוי קוד.

**קבצים:** `src/pages/Inventory/Inventory.tsx` בלבד (`closingSummary`
+ טקסט ה-`ConfirmDialog`).

**בדיקות:** `npm run build` נקי. `npm run lint` - 24 בעיות, זהה
לבייסליין הקבוע.
