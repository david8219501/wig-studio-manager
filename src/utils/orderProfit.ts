// src/utils/orderProfit.ts
// מקור אמת יחיד לחישוב עלות הייצור והרווח בפועל של הזמנה - נגזר ממחיר שנגבה
// בפועל, פחות עלות אמיתית מהמלאי (לא רק "מה שגבינו").

import type { UsedBulkItem, UsedHairItem } from "../types";

export interface ProductionCostOrder {
  usedBulkItems?: UsedBulkItem[];
  usedHairItems?: UsedHairItem[];
  hairCostEstimated?: number;
}

export interface ProfitableOrder extends ProductionCostOrder {
  totalPrice: number;
}

// עלות הייצור בפועל: פריטי מלאי פשוט שנוצלו + עלות שיער.
// עלות השיער: אם כבר שויכו קוקוים בפועל (usedHairItems) - סכימת costAtTime שלהם
// (העלות האמיתית מנצחת את האומדן ברגע שיש שיוך אחד לפחות), אחרת האומדן הגולמי.
export function calculateOrderProductionCost(order: ProductionCostOrder): number {
  const bulkItemsCost = (order.usedBulkItems || []).reduce(
    (sum, item) => sum + item.unitCostAtTime * item.quantity,
    0
  );
  const hairCost =
    order.usedHairItems && order.usedHairItems.length > 0
      ? order.usedHairItems.reduce((sum, item) => sum + item.costAtTime, 0)
      : order.hairCostEstimated ?? 0;
  return bulkItemsCost + hairCost;
}

export function calculateOrderProfit(order: ProfitableOrder): number {
  return order.totalPrice - calculateOrderProductionCost(order);
}
