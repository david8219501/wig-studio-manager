// src/types/index.ts

// 1. סוגי מלאי
export interface HairItem {
    id: string; // Firestore document id - מזהה טכני אטום (auto-generated), לא מוצג למשתמשת
    hairCode?: string; // תווית ידידותית לתצוגה/הדפסה (HAIR-01, HAIR-02...) - סידורית לפי עסק, לא ה-id עצמו (בדיוק כמו showroomCode לפאת תצוגה) - כדי שלא יהיה סיכון התנגשות בין עסקים ב-collection הגלובלי המשותף. פריטים ישנים (מלפני הפיצ'ר) לא יחזיקו את זה - יש ליפול חזרה ל-id בתצוגה
    supplier: string; // שם הספק
    initialWeight: number; // משקל התחלתי בגרמים
    currentWeight: number; // משקל נוכחי בפועל (במקרה של שימוש חלקי)
    length: number; // אורך בס"מ
    hairType: string; // חלק / גלי / מתולתל
    texture: string; // רוסי / אירופאי וכו'
    color: string; // גוון / צבע
    costPrice: number; // עלות רכישה בש"ח - לא רלוונטי לקופסת שאריות (isRemnantBox), שם המחיר לגרם תמיד remnantTotalValue/currentWeight
    status: 'available' | 'showroom' | 'sold' | 'depleted'; // סטטוס הקוקו - 'sold' = פאת תצוגה שנמכרה ללקוחה
    isRemnantBox?: boolean; // true = "קופסת שאריות" - מיזוג של כמה קוקוים קטנים לברקוד אחד, עם מחיר ממוצע משוקלל דינמי
    remnantTotalValue?: number; // שווי כולל בש"ח של השארית שבקופסה כרגע (רלוונטי רק כש-isRemnantBox)
    remnantMergeLog?: RemnantMergeLogEntry[]; // יומן מיזוגים לקופסת שאריות - מאפשר "בטל מיזוג" (רלוונטי רק כש-isRemnantBox)
    lastUsedAt?: string; // ISO timestamp - מתי לאחרונה שויכו גרמים מהפריט הזה להזמנה (AssignHairModal). משמש לוולידציה של "בטל מיזוג" בקופסת שאריות
    createdAt: string;
  }

  // רשומת מיזוג בודדת ביומן של קופסת שאריות - נשמרת כתמונת מצב של המיזוג
  // (משקל/שווי שהועברו), כדי שאפשר יהיה לבטל אותה בדיוק גם אחרי שהקופסה
  // המשיכה להתמלא ממיזוגים נוספים.
  export interface RemnantMergeLogEntry {
    sourceItemId: string;
    sourceItemLabel: string;
    weightMerged: number;
    valueMerged: number;
    mergedAt: string;
  }
  
  export interface BulkItem {
    id: string;
    name: string; // למשל: "רשת לייס בהירה"
    quantity: number; // כמות במלאי
    minThreshold: number; // סף מינימום להתראה
    unitCost: number; // עלות ליחידה בש"ח
    retailPrice?: number; // מחיר מכירה ללקוחה - אם קיים, זה מוצר קמעונאי (לא רק חומר ייצור) ומקבל כפתור "מכירה מהירה" במלאי
  }
  
  // 3. הזמנת פאה

  // פריט מלאי פשוט (רשת, ראש פאה, קופסת מתנה וכו') שצורף להזמנה ספציפית.
  // unitCostAtTime נשמר כתמונת מצב של העלות בזמן השימוש - לא משתנה רטרואקטיבית
  // גם אם עלות הפריט במלאי משתנה מאוחר יותר (למשל אחרי חידוש מלאי במחיר חדש).
  export interface UsedBulkItem {
    itemId: string;
    itemName: string;
    quantity: number;
    unitCostAtTime: number;
  }

  // שיוך קוקו ספציפי (או חלק ממנו) להזמנה, בפועל (לא אומדן).
  // הזמנה יכולה להחזיק כמה שיוכים כאלה (למשל שני קוקוים שונים לאותה פאה),
  // וכל שיוך שומר costAtTime כתמונת מצב - לא משתנה רטרואקטיבית.
  export interface UsedHairItem {
    hairItemId: string;
    hairItemLabel: string;
    gramsUsed: number;
    costAtTime: number;
  }

  // תשלום בודד שנגבה על חשבון הזמנה - חלק ממערך payments על ה-order עצמו
  // (לא collection נפרד).
  export interface OrderPayment {
    amount: number;
    method: 'cash' | 'credit' | 'transfer' | 'check';
    date: string;
    note?: string;
  }

