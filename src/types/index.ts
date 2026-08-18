// src/types/index.ts

// 1. סוגי מלאי
export interface HairItem {
    id: string; // ברקוד / ID ייחודי
    supplier: string; // שם הספק
    initialWeight: number; // משקל התחלתי בגרמים
    currentWeight: number; // משקל נוכחי בפועל (במקרה של שימוש חלקי)
    length: number; // אורך בס"מ
    hairType: string; // חלק / גלי / מתולתל
    texture: string; // רוסי / אירופאי וכו'
    color: string; // גוון / צבע
    costPrice: number; // עלות רכישה בש"ח
    status: 'available' | 'reserved' | 'showroom' | 'depleted'; // סטטוס הקוקו
    assignedOrderId?: string; // מזהה הזמנה אם הקוקו משויך
    createdAt: string;
  }
  
  export interface BulkItem {
    id: string;
    name: string; // למשל: "רשת לייס בהירה"
    quantity: number; // כמות במלאי
    minThreshold: number; // סף מינימום להתראה
    unitCost: number; // עלות ליחידה בש"ח
  }
  
  // 2. תשלומים ומסמכים
  export interface Payment {
    id: string;
    clientId: string;
    amount: number;
    date: string;
    paymentMethod: 'cash' | 'credit' | 'transfer' | 'check' | 'other';
    referenceNumber?: string; // מספר אסמכתא / 4 ספרות
    description: string;
    pdfUrl?: string; // קישור לקובץ האישור ב-Firebase Storage
  }
  
  export interface ClientDocument {
    id: string;
    clientId: string;
    title: string;
    date: string;
    type: 'digital_contract' | 'scanned_image';
    fileUrl: string; // קישור לתמונה או ל-PDF
  }
  
  // 3. הזמנת פאה
  export interface WigOrder {
    id: string;
    clientId?: string; // אם ריק - מדובר בפאת תצוגה!
    isShowroom: boolean;
    status: 'in_production' | 'ready' | 'delivered';
    hairItemId?: string; // ID של הקוקו שנבחר
    hairCost: number; // עלות השיער בפועל
    netCost: number; // עלות רשת
    skinTopCost: number; // עלות סקין/טופ
    extraCosts: number; // הוצאות נוספות
    totalPrice: number; // מחיר סופי ללקוחה
    notes?: string;
    createdAt: string;
  }
  
  // 4. כרטיס לקוחה מורחב
  export interface Client {
    id: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    measurements?: {
      circumference?: string; // היקף
      earToEar?: string; // מאוזן לאוזן
      frontToNape?: string; // ממצח לעורף
    };
    createdAt: string;
  }