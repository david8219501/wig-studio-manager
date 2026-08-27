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

export interface NewOrderInput {
  businessId: string;
  clientId: string | null; // null = בלי לקוחה רשומה (למשל מכירה קמעונאית ללקוחה מזדמנת)
  clientName: string;
  clientPhone: string;
  orderType: string; // תווית מוצגת (כבר מתורגמת), למשל "פאה חדשה" / "תיקון / שירות"
  totalPrice: number;
  dueDate: string | null;
  paymentsCount: number;
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
}

export async function createOrderWithProductionExpense(input: NewOrderInput): Promise<string> {
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
    paymentsCount: input.paymentsCount,
    usedBulkItems: input.usedBulkItems,
    usedHairItems: input.usedHairItems,
    hairCostEstimated: input.hairCostEstimated,
    notes: input.notes,
    createdAt,
  });

  return orderRef.id;
}
