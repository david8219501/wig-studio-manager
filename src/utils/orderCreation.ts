// src/utils/orderCreation.ts
// יצירת הזמנה - מקור אחד לזרימה הזו, כדי שכל נקודת כניסה שיוצרת הזמנה
// (אשף הזמנה רגיל, מכירת פאת תצוגה, טופס תיקונים נפרד) תכתוב את אותו
// מבנה מסמך בדיוק.
//
// הערה: בעבר הפונקציה הזו גם יצרה אוטומטית רשומת expense מקושרת ("הוצאת
// ייצור"). זה בוטל - זה יצר כפילות פיננסית אמיתית מול הוצאת הרכישה
// המקורית של אותו מלאי (למשל קניית 100 רשתות נרשמת כהוצאה פעם אחת בזמן
// הקנייה; "שימוש" ברשת בהזמנה הוא הקצאה פנימית ממלאי קיים, לא הוצאה
// חדשה). הרווח לכל הזמנה ממשיך להיות מחושב ישירות מ-usedBulkItems/
// usedHairItems/hairCostEstimated דרך calculateOrderProfit, בלי תלות
// בטבלת expenses בכלל.

import { addDoc, collection } from "firebase/firestore";
import { db } from "../services/firebase";
import type { OrderPayment, UsedBulkItem, UsedHairItem } from "../types";

// טיפוס הסטטוס משוכפל כאן במקום ייבוא מ-Sales.tsx (Order["status"]) כדי לא
// ליצור תלות של utils בקוד דף ספציפי - אותה מוסכמה שכבר קיימת בפרויקט
// (עמודים שמגדירים טיפוסים מקומיים דומים במקום לשתף קובץ אחד יחיד).
type OrderStatus = "new" | "in_progress" | "styling" | "ready" | "delivered";

// שדות מפרט גולמיים לפאת תצוגה (Inventory.tsx) - נשמרים בנוסף ל-notes
// (שמכיל תקציר קריא, כמו בכל הזמנה) כדי שאפשר יהיה למלא מחדש את טופס
// העריכה בלי לפרסר את מחרוזת ה-notes בחזרה.
export interface ShowroomSpecs {
  length?: string;
  structure?: string;
  fullness?: string;
  color?: string;
}

// סטטוס תהליך בניית פאת תצוגה - שדה נפרד מ-status הרגיל של הזמנה
// (Order["status"] ב-Sales.tsx, שמייצג workflow של הזמנת לקוחה) כדי לא
// "לזהם" את הטיפוס/הבדג'ים הקיימים שם עם ערכים שלא רלוונטיים לזרימת
// הזמנה רגילה. ברגע שפאת התצוגה נמכרת, ה-status הרגיל נדרס ל-"delivered"
// (ראו SellShowroomStockModal.tsx) - showroomStatus נשאר כתיעוד היסטורי.
export type ShowroomBuildStatus = "בבנייה" | "בטיפול" | "ממתינה לגימור" | "מוכנה";
export const SHOWROOM_BUILD_STATUS_OPTIONS: ShowroomBuildStatus[] = ["בבנייה", "בטיפול", "ממתינה לגימור", "מוכנה"];

export interface NewOrderInput {
  businessId: string;
  clientId: string | null; // null = בלי לקוחה רשומה עדיין (מכירה קמעונאית ללקוחה מזדמנת, או פאת תצוגה שטרם נמכרה)
  clientName: string | null; // null רק כש-isShowroomStock: true (עדיין אין לקוחה)
  clientPhone: string;
  orderType: string; // תווית מוצגת (כבר מתורגמת), למשל "פאה חדשה" / "תיקון / שירות"
  totalPrice: number;
  dueDate: string | null;
  usedBulkItems: UsedBulkItem[];
  usedHairItems: UsedHairItem[];
  hairCostEstimated: number;
  notes: string;
  // ברירות המחדל (status: "new", paidAmount: 0, payments: []) מתאימות לזרימת
  // הזמנה רגילה שעוד בתהליך. מכירה מהירה/מיידית (למשל מוצר קמעונאי) יכולה
  // לדרוס אותן - למשל status: "delivered" + paidAmount ששולם כבר במלואו.
  status?: OrderStatus;
  paidAmount?: number;
  payments?: OrderPayment[];
  // פאת תצוגה שנוצרת מראש במלאי (Inventory.tsx), בלי לקוחה - ראו
  // ShowroomStockFormModal.tsx/SellShowroomStockModal.tsx. מסמך כזה מוצג
  // בלשונית "פאות תצוגה" כל עוד clientId === null, ונכנס לתצוגת המכירות
  // הרגילה (Sales.tsx) רק אחרי שנמכר בפועל וקיבל clientId אמיתי.
  isShowroomStock?: boolean;
  retailPrice?: number; // מחיר המכירה המבוקש (רלוונטי רק כש-isShowroomStock)
  showroomSpecs?: ShowroomSpecs;
  showroomCode?: string; // מזהה ידידותי ורציף (SHOWROOM-1001 וכו') - ראו nextShowroomCode ב-Inventory.tsx
  showroomStatus?: ShowroomBuildStatus; // ברירת מחדל "בבנייה" אם לא הועבר (ראו createOrder)
}

// פאות תצוגה שעדיין לא נמכרו (isShowroomStock && בלי clientId) שייכות
// ללשונית "פאות תצוגה" ב-Inventory.tsx בלבד - לא להזמנות לקוחה אמיתיות,
// אז Sales.tsx/Dashboard.tsx/Reports.tsx מסננים אותן החוצה עם הפונקציה
// הזו לפני הצגה/חישוב. הטיפוס כאן כללי בכוונה (לא Order מ-Sales.tsx) כדי
// לא ליצור import מעגלי (Sales.tsx כבר מייבא ShowroomSpecs מהקובץ הזה).
export function isUnsoldShowroomStock(order: { isShowroomStock?: boolean; clientId?: string | null }): boolean {
  return order.isShowroomStock === true && !order.clientId;
}

export async function createOrder(input: NewOrderInput): Promise<string> {
  const createdAt = new Date().toISOString().split("T")[0];

  const orderRef = await addDoc(collection(db, "orders"), {
    businessId: input.businessId,
    clientId: input.clientId,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    orderType: input.orderType,
    status: input.status ?? "new",
    totalPrice: input.totalPrice,
    paidAmount: input.paidAmount ?? 0,
    payments: input.payments ?? [],
    dueDate: input.dueDate,
    usedBulkItems: input.usedBulkItems,
    usedHairItems: input.usedHairItems,
    hairCostEstimated: input.hairCostEstimated,
    notes: input.notes,
    createdAt,
    // isShowroomStock/retailPrice/showroomSpecs/showroomCode/showroomStatus
    // נכתבים רק כשרלוונטי - Firestore דוחה ערך undefined במפורש, אז אי אפשר
    // סתם לכלול אותם תמיד עם ?? ברירת מחדל.
    ...(input.isShowroomStock
      ? {
          isShowroomStock: true,
          retailPrice: input.retailPrice ?? 0,
          showroomStatus: input.showroomStatus ?? "בבנייה",
        }
      : {}),
    ...(input.showroomSpecs ? { showroomSpecs: input.showroomSpecs } : {}),
    ...(input.showroomCode ? { showroomCode: input.showroomCode } : {}),
  });

  return orderRef.id;
}
