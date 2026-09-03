# בדיקת מצב - 2026-09-03 (עדכון 2 - אחרי תיקון #1 ו-#4)

בדיקה מבוססת קוד (grep/read), לא זיכרון שיחה. עדכון של הבדיקה הקודמת -
פריטים #1 ו-#4 שסומנו ❌ עברו תיקון בפועל ואומתו מחדש.

| # | פריט | סטטוס | פרטים |
|---|------|-------|--------|
| 1 | Dashboard.tsx - "הכנסות החודש" | ✅ קיים ועובד | `thisMonthRevenue`/`lastMonthRevenue` (Dashboard.tsx:141-146) עכשיו `reduce((sum, o) => sum + calculateOrderProfit(o), 0)` - `calculateOrderProfit` מיובא מ-`../../utils/orderProfit` (שורה 9). זה **רווח נטו** (הכנסה פחות עלות ייצור בפועל), לא הכנסה גולמית - אותו מקור שכבר משמש את "רווח" ב-Sales.tsx. |
| 2 | AssignHairModal - מבנה scroll | ✅ קיים ועובד | ללא שינוי מהבדיקה הקודמת - `.assign-hair-card { max-height: 90vh }`, `.assign-hair-header/.assign-hair-footer { flex-shrink: 0 }`, `.assign-hair-body { overflow-y: auto; min-height: 0; flex: 1 }`. |
| 3 | ClientDrawer.tsx - טבלת "פירוט לפי הזמנה" | ✅ קיים ועובד | ללא שינוי מהבדיקה הקודמת - 6 `<th>` מול 6 `<td>` בכל שורה, `.payments-orders-table td.mono { display: table-cell }` פותר את התנגשות ה-`.mono` הגלובלי. |
| 4 | OrderDetailsPanel.tsx - סטטוס | ✅ קיים ועובד | ה-`<span>` הסטטי הוחלף ב-`CustomSelect` ניתן לעריכה (שורה 411), כולל "אחר / הוסף חדש" עם טקסט חופשי (`OTHER_STATUS`) ושמירה מיידית עם `updateDoc`. הקבועים `OTHER_STATUS`/`KNOWN_STATUSES`/`STATUS_SELECT_OPTIONS` הועברו למקור משותף חדש `src/utils/orderStatus.ts` - גם `Sales.tsx` וגם `OrderDetailsPanel.tsx` מייבאים משם (אין כפילות). כשההזמנה מבוטלת (`status === "בוטלה"`) עדיין מוצג badge סטטי בלי עריכה - החרגה מכוונת (יש לזה נתיב ייעודי - כפתור "ביטול הזמנה"). |
| 5 | Sales.tsx - מיון ברירת מחדל | ✅ קיים ועובד | ללא שינוי מהבדיקה הקודמת - `filteredOrders.sort((a, b) => (b.createdAt \|\| "").localeCompare(a.createdAt \|\| ""))`. |
| 6 | OrderDetailsPanel.tsx - ביטול הזמנה + עריכת מחיר/הערות | ✅ קיים ועובד | ללא שינוי מהבדיקה הקודמת - `handleCancelOrder`, `commitTotalPrice`, `commitNotes` כולם קיימים ומחוברים ל-UI. |

## סיכום

6/6 קיימים ועובדים בפועל בקוד הנוכחי (אומת מחדש ב-grep, לא מזיכרון
שיחה קודם). שני הפריטים שהיו חסרים בבדיקה הקודמת (#1, #4) תוקנו ואומתו.

**החלטה פתוחה (לא בוצעה, ממתינה לאישור):** האם לשנות את כותרת הכרטיס
"הכנסות החודש" ל"רווח החודש" בדשבורד, כדי שהכותרת תשקף נכון שהמספר
מתחתיה הוא רווח נטו ולא הכנסה גולמית - ראו המלצה ב-`summary.md`.
