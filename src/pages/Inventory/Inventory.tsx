// src/pages/Inventory/Inventory.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, onSnapshot, setDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import type { BulkItem, HairItem, RemnantMergeLogEntry } from '../../types';
import type { Order } from '../Sales/Sales';
import AddHairModal from './AddHairModal';
import AddBulkItemModal from './AddBulkItemModal';
import RestockModal from './RestockModal';
import QuickRetailSaleModal from './QuickRetailSaleModal';
import CreateRemnantBoxModal from './CreateRemnantBoxModal';
import MergeRemnantModal from './MergeRemnantModal';
import RemnantMergeLogModal from './RemnantMergeLogModal';
import ShowroomStockFormModal from './ShowroomStockFormModal';
import SellShowroomStockModal from './SellShowroomStockModal';
import ShowroomStockDetailsPanel from './ShowroomStockDetailsPanel';
import OrderDetailsPanel from '../../components/orders/OrderDetailsPanel';
import AssignHairModal from '../../components/orders/AssignHairModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import { SHOWROOM_BUILD_STATUS_OPTIONS, type ShowroomBuildStatus } from '../../utils/orderCreation';
import './Inventory.css';

const STATUS_LABELS: Record<HairItem['status'], string> = {
  available: 'זמין',
  showroom: 'פאת תצוגה',
  sold: 'נמכרה',
  depleted: 'נוצל',
};

type TabKey = 'hair' | 'bulk' | 'showroom';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('hair');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- מלאי שיער ---
  const [hairItems, setHairItems] = useState<HairItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [textureFilter, setTextureFilter] = useState<string>('all'); // סוג שיער / מקור
  const [hairTypeFilter, setHairTypeFilter] = useState<string>('all'); // מרקם
  const [statusFilter, setStatusFilter] = useState<HairItem['status'] | 'all'>('all');
  const [lengthFilter, setLengthFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [isRemnantBoxModalOpen, setIsRemnantBoxModalOpen] = useState(false);
  const [mergeSourceItem, setMergeSourceItem] = useState<HairItem | null>(null);
  const [mergeLogBoxId, setMergeLogBoxId] = useState<string | null>(null);
  const [undoConfirm, setUndoConfirm] = useState<{ index: number; message: string } | null>(null);

  // --- מלאי פשוט ---
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [isAddBulkModalOpen, setIsAddBulkModalOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<BulkItem | null>(null);
  const [quickSaleTarget, setQuickSaleTarget] = useState<BulkItem | null>(null);

  // --- פאות תצוגה (orders עם isShowroomStock: true && clientId ריק - ראו Order ב-Sales.tsx) ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedShowroomOrderId, setSelectedShowroomOrderId] = useState<string | null>(null);
  const [isShowroomFormOpen, setIsShowroomFormOpen] = useState(false);
  const [editingShowroomOrderId, setEditingShowroomOrderId] = useState<string | null>(null);
  const [assigningShowroomOrderId, setAssigningShowroomOrderId] = useState<string | null>(null);
  const [sellingShowroomOrderId, setSellingShowroomOrderId] = useState<string | null>(null);
  const [deletingShowroomOrderId, setDeletingShowroomOrderId] = useState<string | null>(null);
  // פילטר תצוגה בלשונית "פאות תצוגה" - "במלאי" (ברירת מחדל, כמו ההתנהגות
  // הקודמת), "נמכרו" או "הכל". פאה שנמכרה נפתחת ב-OrderDetailsPanel הרגיל
  // (יש לה clientId/תשלומים אמיתיים) ולא ב-ShowroomStockDetailsPanel
  // (שמניח פאה שעדיין לא נמכרה - יש לו כפתור "מכירה" שלא רלוונטי יותר).
  const [showroomViewFilter, setShowroomViewFilter] = useState<'unsold' | 'sold' | 'all'>('unsold');
  const [selectedSoldShowroomOrderId, setSelectedSoldShowroomOrderId] = useState<string | null>(null);

  // --- האזנה חיה ל-Firestore, מסוננת רק לנתונים של העסק המחובר (businessId = uid) ---
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return; // ליתר ביטחון - אם משום מה אין משתמש מחובר, לא טוענים כלום

    const hairQuery = query(collection(db, 'hairItems'), where('businessId', '==', businessId));
    const unsubHair = onSnapshot(
      hairQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<HairItem, 'id'>),
        }));
        setHairItems(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading hairItems:', err);
        setLoadError('שגיאה בטעינת מלאי השיער. בדקי את החיבור ונסי לרענן את הדף.');
        setLoading(false);
      }
    );

    const bulkQuery = query(collection(db, 'bulkItems'), where('businessId', '==', businessId));
    const unsubBulk = onSnapshot(
      bulkQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BulkItem, 'id'>),
        }));
        setBulkItems(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading bulkItems:', err);
        setLoadError('שגיאה בטעינת המלאי הפשוט. בדקי את החיבור ונסי לרענן את הדף.');
        setLoading(false);
      }
    );

    // כל ה-orders של העסק (לא רק פאות תצוגה) - בדיוק כמו ב-Sales.tsx/
    // Dashboard.tsx/Reports.tsx; מסננים ללשונית "פאות תצוגה" רק את אלה
    // עם isShowroomStock && ללא clientId (ראו showroomOrders למטה).
    const ordersQuery = query(collection(db, 'orders'), where('businessId', '==', businessId));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Order, 'id'>),
        }));
        setOrders(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading orders for showroom stock:', err);
        setLoadError('שגיאה בטעינת פאות התצוגה. בדקי את החיבור ונסי לרענן את הדף.');
        setLoading(false);
      }
    );

    // ניקוי המאזינים ביציאה מהדף, כדי לא להישאר עם חיבורים פתוחים מיותרים
    return () => {
      unsubHair();
      unsubBulk();
      unsubOrders();
    };
  }, []);

  // עדכון אוטומטי של showroomStatus מ-"בבנייה" ל-"מוכנה" ברגע ששויך שיער
  // ראשון בפועל (usedHairItems הופך לא-ריק) - בלי לגעת ב-AssignHairModal
  // עצמו (גנרי, לא יודע כלום על showroomStatus). לא דורס בחירה ידנית: רק
  // כשעדיין "בבנייה" (ברירת המחדל) - אם המשתמשת כבר בחרה סטטוס אחר ידנית,
  // זה לא "יתקן" את זה בחזרה.
  useEffect(() => {
    orders
      .filter((o) => o.isShowroomStock && (o.usedHairItems?.length ?? 0) > 0 && o.showroomStatus === 'בבנייה')
      .forEach((o) => {
        updateDoc(doc(db, 'orders', o.id), { showroomStatus: 'מוכנה' }).catch((err) =>
          console.error('Error auto-updating showroom status:', err)
        );
      });
  }, [orders]);

  // ה-hairItems כאן כבר מסונן ל-businessId הנוכחי בלבד (דרך ה-query ב-
  // onSnapshot למעלה), כך שהמספור הסידורי (maxNum) תמיד עצמאי לעסק. אבל
  // ה-collection 'hairItems' עצמו גלובלי (משותף לכל העסקים, לא subcollection
  // לכל עסק) - אז שני עסקים שונים עדיין יכולים להגיע ל"מספר הבא" הזהה
  // (למשל שני עסקים חדשים שכל אחד מתחיל מ-HAIR-1001). מזהה כזה שכבר קיים
  // כמסמך בפועל (של עסק אחר) הופך את ה-setDoc ל"עדכון" מבחינת Firestore,
  // וחוקי העדכון דוחים אותו כי ה-businessId הקיים לא תואם - permission-denied.
  // כדי שהמזהה יהיה בטוח ייחודי גלובלית (ולא רק בתוך העסק), מוסיפים סיומת
  // הנגזרת מה-uid של העסק המחובר.
  const nextHairId = useMemo(() => {
    const maxNum = hairItems.reduce((max, item) => {
      const match = item.id.match(/^HAIR-(\d+)/);
      const num = match ? parseInt(match[1], 10) : NaN;
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 1000);
    const businessSuffix = (auth.currentUser?.uid ?? '').slice(-4);
    return `HAIR-${maxNum + 1}-${businessSuffix}`;
  }, [hairItems]);

  // קופסאות שאריות פעילות - יעדים אפשריים למיזוג שארית קוקו קטן
  const remnantBoxes = useMemo(
    () => hairItems.filter((item) => item.isRemnantBox && item.status === 'available'),
    [hairItems]
  );

  // פאות תצוגה שעדיין לא נמכרו - orders עם isShowroomStock: true וללא clientId
  // (isUnsoldShowroomStock ב-Sales.tsx הוא אותו תנאי בדיוק, כדי שהן לא
  // יופיעו גם שם/ב-Dashboard/Reports עד שנמכרות בפועל).
  const showroomOrders = useMemo(
    () => orders.filter((o) => o.isShowroomStock === true && !o.clientId),
    [orders]
  );

  // כל פאות התצוגה - כולל כאלה שכבר נמכרו (clientId קיים) - לתצוגה/פילטור
  // בטבלת הלשונית עצמה. showroomOrders למעלה (לא נמכרו בלבד) ממשיך לשמש
  // גם לספירת הכרטיסייה וגם למקומות אחרים שצריכים רק את הלא-נמכרות.
  const allShowroomOrders = useMemo(
    () => orders.filter((o) => o.isShowroomStock === true),
    [orders]
  );

  const filteredShowroomOrders = useMemo(() => {
    if (showroomViewFilter === 'unsold') return allShowroomOrders.filter((o) => !o.clientId);
    if (showroomViewFilter === 'sold') return allShowroomOrders.filter((o) => !!o.clientId);
    return allShowroomOrders;
  }, [allShowroomOrders, showroomViewFilter]);

  // מזהה ידידותי לפאת תצוגה חדשה (SHOWROOM-1001 וכו') - מחושב מכל ה-orders
  // עם isShowroomStock (כולל כאלה שכבר נמכרו!) לא רק showroomOrders, כדי
  // שהמספור לעולם לא יתאפס/יתנגש אחרי שפריט נמכר ונעלם מרשימת הלא-נמכרות.
  // בשונה מ-nextHairId, אין כאן סיכון התנגשות בין-עסקית - זה רק שדה מידע
  // (showroomCode), לא ה-ID של המסמך עצמו שנוצר תמיד אוטומטית ע"י Firestore.
  const nextShowroomCode = useMemo(() => {
    const maxNum = orders.reduce((max, o) => {
      if (!o.isShowroomStock) return max;
      const match = (o.showroomCode || '').match(/^SHOWROOM-(\d+)/);
      const num = match ? parseInt(match[1], 10) : NaN;
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 1000);
    return `SHOWROOM-${maxNum + 1}`;
  }, [orders]);

  // כל ה-ids הבאים נגזרים מ-hairItems/orders החיים (לא state של האובייקט
  // עצמו) - כדי שהמודלים תמיד יראו עדכון חי, באותו דפוס כמו mergeLogBox למטה.
  const mergeLogBox = hairItems.find((item) => item.id === mergeLogBoxId) || null;
  const selectedShowroomOrder = orders.find((o) => o.id === selectedShowroomOrderId) || null;
  const editingShowroomOrder = orders.find((o) => o.id === editingShowroomOrderId) || null;
  const assigningShowroomOrder = orders.find((o) => o.id === assigningShowroomOrderId) || null;
  const sellingShowroomOrder = orders.find((o) => o.id === sellingShowroomOrderId) || null;
  const deletingShowroomOrder = orders.find((o) => o.id === deletingShowroomOrderId) || null;
  const selectedSoldShowroomOrder = orders.find((o) => o.id === selectedSoldShowroomOrderId) || null;

  // אפשרויות הפילטר נגזרות מהנתונים בפועל, כדי שהרשימה תישאר מסונכרנת עם מה שבאמת קיים במלאי
  const textureOptions = useMemo(
    () => Array.from(new Set(hairItems.map((item) => item.texture))),
    [hairItems]
  );
  const hairTypeOptions = useMemo(
    () => Array.from(new Set(hairItems.map((item) => item.hairType))),
    [hairItems]
  );

  const filteredHairItems = useMemo(() => {
    return hairItems.filter((item) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTexture = textureFilter === 'all' || item.texture === textureFilter;
      const matchesHairType = hairTypeFilter === 'all' || item.hairType === hairTypeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const matchesLength =
        lengthFilter === 'all' ||
        (lengthFilter === 'short' && item.length < 40) ||
        (lengthFilter === 'medium' && item.length >= 40 && item.length <= 55) ||
        (lengthFilter === 'long' && item.length > 55);

      return matchesSearch && matchesTexture && matchesHairType && matchesStatus && matchesLength;
    });
  }, [hairItems, searchTerm, textureFilter, hairTypeFilter, statusFilter, lengthFilter]);

  // הוצאת רכישה אוטומטית לכל תנועת קניית/חידוש מלאי בפועל - זה הרגע הנכון
  // לרשום אותה (בניגוד ל"שימוש" במלאי בהזמנה, שבוטל בכוונה כי הוא לא
  // הוצאה חדשה, רק הקצאה פנימית ממלאי שכבר נרכש).
  const createInventoryExpense = async (params: { description: string; amount: number; supplier: string }) => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;
    await addDoc(collection(db, 'expenses'), {
      businessId,
      date: new Date().toISOString().split('T')[0],
      supplier: params.supplier,
      category: 'inventory',
      description: params.description,
      amount: params.amount,
      paymentMethod: 'cash',
      status: 'paid',
    });
  };

  // שומרים ל-Firestore עם ה-ID הידידותי שכבר נוצר בטופס (HAIR-1004 וכו'),
  // ומתייגים ב-businessId כדי שהפריט ישויך לעסק המחובר בלבד.
  const handleSaveHairItem = async (item: HairItem) => {
    const { id, ...data } = item;
    await setDoc(doc(db, 'hairItems', id), { ...data, businessId: auth.currentUser!.uid });
    await createInventoryExpense({
      description: `רכישת קוקו - ${item.supplier} - ${item.color}, ${item.length}ס״מ`,
      amount: item.costPrice,
      supplier: item.supplier,
    });
    setIsAddModalOpen(false);
  };

  // קופסת שאריות לא נרכשת - היא נוצרת ריקה ומתמלאת ממיזוג שאריות קוקוים
  // שכבר נרכשו (ונרשמו כהוצאה) בעבר, אז אין כאן הוצאה נוספת ליצור.
  const handleCreateRemnantBox = async (item: HairItem) => {
    const { id, ...data } = item;
    await setDoc(doc(db, 'hairItems', id), { ...data, businessId: auth.currentUser!.uid });
    setIsRemnantBoxModalOpen(false);
  };

  // מיזוג שארית קוקו קטן לתוך קופסת שאריות: שווי השארית (costPrice יחסי
  // למשקל שנשאר) עובר לקופסה, והקוקו המקורי מתאפס ומסומן כנוצל. נרשמת גם
  // רשומת יומן (remnantMergeLog) - כדי שאפשר יהיה לבטל את המיזוג הזה בדיוק
  // בהמשך (ראו handleUndoMerge), גם אחרי שהקופסה המשיכה להתמלא ממיזוגים נוספים.
  const handleMergeIntoRemnantBox = async (boxId: string) => {
    if (!mergeSourceItem) return;
    const box = hairItems.find((h) => h.id === boxId);
    if (!box) return;

    const remainingValue = mergeSourceItem.costPrice * (mergeSourceItem.currentWeight / mergeSourceItem.initialWeight);
    const logEntry: RemnantMergeLogEntry = {
      sourceItemId: mergeSourceItem.id,
      sourceItemLabel: `${mergeSourceItem.id} · ${mergeSourceItem.color} · ${mergeSourceItem.length} ס"מ`,
      weightMerged: mergeSourceItem.currentWeight,
      valueMerged: remainingValue,
      mergedAt: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'hairItems', box.id), {
      currentWeight: box.currentWeight + mergeSourceItem.currentWeight,
      remnantTotalValue: (box.remnantTotalValue ?? 0) + remainingValue,
      remnantMergeLog: [...(box.remnantMergeLog ?? []), logEntry],
    });

    await updateDoc(doc(db, 'hairItems', mergeSourceItem.id), {
      currentWeight: 0,
      status: 'depleted',
    });

    setMergeSourceItem(null);
  };

  // מבצעת בפועל ביטול מיזוג בודד מיומן קופסת שאריות - מחזירה את הקוקו
  // המקורי למצב שלפני המיזוג ומורידה את המשקל/השווי שהוא הוסיף לקופסה.
  // קריאה ישירה (בלי אישור) כשאין סיכון; אחרי אישור ב-ConfirmDialog כשיש.
  const performUndoMerge = async (index: number) => {
    const box = mergeLogBox;
    if (!box) return;
    const log = box.remnantMergeLog ?? [];
    const entry = log[index];
    if (!entry) return;

    const newLog = log.filter((_, i) => i !== index);

    await updateDoc(doc(db, 'hairItems', box.id), {
      currentWeight: box.currentWeight - entry.weightMerged,
      remnantTotalValue: (box.remnantTotalValue ?? 0) - entry.valueMerged,
      remnantMergeLog: newLog,
    });

    const sourceItem = hairItems.find((h) => h.id === entry.sourceItemId);
    if (sourceItem) {
      await updateDoc(doc(db, 'hairItems', sourceItem.id), {
        currentWeight: entry.weightMerged,
        status: 'available',
      });
    }
  };

  // בודקת אם ביטול המיזוג הזה מסוכן (עלול ליצור אי-דיוק בשווי הקופסה):
  //
  // השוואת סכומים בלבד (currentWeight/remnantTotalValue מול weightMerged/
  // valueMerged) לא מספיקה: קופסה עם כמה מיזוגים ושימוש קטן יכולה עדיין
  // "לצאת" אריתמטית מספיקה לביטול מיזוג ישן, למרות שהכסף כבר התערבב בין
  // המיזוגים בפועל. במקום זה, שני תנאים חד-משמעיים שכל אחד מהם, אם לא
  // מתקיים, הוא **אזהרה** (אפשר להמשיך במודע דרך ConfirmDialog) ולא חסימה:
  // 1. זו הרשומה האחרונה בלוג - מיזוגים שקרו אחריה כבר "ישבו על" השווי
  //    שהיא הוסיפה.
  // 2. box.lastUsedAt (השיוך האחרון שנעשה מהקופסה בפועל, מתועד ב-
  //    AssignHairModal) ריק או מוקדם מ-entry.mergedAt - כלומר שום שימוש
  //    לא קרה מהקופסה מאז המיזוג הזה בזמן.
  // אם אין שום סיכון - מבצעים ישר בלי לשאול כלום.
  const handleUndoMerge = async (index: number) => {
    const box = mergeLogBox;
    if (!box) return;
    const log = box.remnantMergeLog ?? [];
    const entry = log[index];
    if (!entry) return;

    const usedSince = !!box.lastUsedAt && box.lastUsedAt > entry.mergedAt;
    const notLastEntry = index !== log.length - 1;

    if (!usedSince && !notLastEntry) {
      await performUndoMerge(index);
      return;
    }

    const warnings = [
      usedSince &&
        'שימי לב: כבר נעשה שימוש מהקופסה אחרי המיזוג הזה. אם את לא בטוחה שהשיער הספציפי הזה לא נכלל באותו שימוש, הביטול עלול ליצור אי-דיוק קטן בשווי הקופסה.',
      notLastEntry && 'שימי לב: בוצעו מיזוגים נוספים אחרי זה. ביטול לא-לפי-סדר עלול ליצור אי-דיוק.',
    ]
      .filter(Boolean)
      .join('\n\n');

    setUndoConfirm({ index, message: `${warnings}\n\nלהמשיך בכל זאת?` });
  };

  const handleConfirmUndoMerge = async () => {
    if (undoConfirm) {
      await performUndoMerge(undoConfirm.index);
    }
    setUndoConfirm(null);
  };

  const handleAddBulkItem = async (item: BulkItem) => {
    const { id, ...data } = item;
    await setDoc(doc(db, 'bulkItems', id), { ...data, businessId: auth.currentUser!.uid });
    await createInventoryExpense({
      description: `רכישת פריט חדש למלאי - ${item.name}`,
      amount: item.quantity * item.unitCost,
      supplier: item.name,
    });
    setIsAddBulkModalOpen(false);
  };

  // ירידה בכמות (צריכה שוטפת) - לא משנה את העלות הממוצעת, רק את הכמות
  const handleUseOne = async (id: string) => {
    const item = bulkItems.find((b) => b.id === id);
    if (!item) return;
    await updateDoc(doc(db, 'bulkItems', id), {
      quantity: Math.max(0, item.quantity - 1),
    });
  };

  // קנייה חדשה - מעדכן גם כמות וגם עלות ממוצעת משוקללת. הוצאת הרכישה
  // מחושבת מ-purchaseUnitCost (המחיר הגולמי של הקנייה הזו בלבד), לא
  // מ-newAverageUnitCost (ממוצע משוקלל שכולל גם את המלאי הישן).
  const handleConfirmRestock = async (
    itemId: string,
    addedQuantity: number,
    purchaseUnitCost: number,
    newAverageUnitCost: number
  ) => {
    const item = bulkItems.find((b) => b.id === itemId);
    if (!item) return;
    await updateDoc(doc(db, 'bulkItems', itemId), {
      quantity: item.quantity + addedQuantity,
      unitCost: newAverageUnitCost,
    });
    await createInventoryExpense({
      description: `חידוש מלאי - ${item.name}`,
      amount: addedQuantity * purchaseUnitCost,
      supplier: item.name,
    });
    setRestockTarget(null);
  };

  // מוחקת פאת תצוגה. אם כבר יש usedHairItems/usedBulkItems משויכים בפועל -
  // קודם מחזירים את המשקל/השווי/הכמות לכל hairItem/bulkItem ששויך אליה
  // (כל אחד מקובץ לפי itemId, כדי לא לדרוס update אחד עם השני אם אותו
  // פריט שויך כמה פעמים - אותו דפוס שכבר תוקן ב-NewOrderWizard.handleFinish),
  // בדיוק כמו handleRemove הבודד ב-AssignHairModal/handleRemoveBulkItem
  // ב-OrderDetailsPanel, רק בבת אחת. אחרת מוחקים את הפאה אבל "שוכחים"
  // להחזיר את המלאי שכבר יצא ממנה.
  const performDeleteShowroomOrder = async (order: Order) => {
    const restoreHairByItemId = new Map<string, { grams: number; value: number }>();
    (order.usedHairItems ?? []).forEach((used) => {
      const entry = restoreHairByItemId.get(used.hairItemId) ?? { grams: 0, value: 0 };
      entry.grams += used.gramsUsed;
      entry.value += used.costAtTime;
      restoreHairByItemId.set(used.hairItemId, entry);
    });

    const restoreBulkByItemId = new Map<string, number>();
    (order.usedBulkItems ?? []).forEach((used) => {
      restoreBulkByItemId.set(used.itemId, (restoreBulkByItemId.get(used.itemId) ?? 0) + used.quantity);
    });

    await Promise.all([
      ...Array.from(restoreHairByItemId.entries()).map(async ([hairItemId, restore]) => {
        const hairItem = hairItems.find((h) => h.id === hairItemId);
        if (!hairItem) return;
        const restoreUpdate: { currentWeight: number; status: HairItem['status']; remnantTotalValue?: number } = {
          currentWeight: hairItem.currentWeight + restore.grams,
          status: 'available',
        };
        if (hairItem.isRemnantBox) {
          restoreUpdate.remnantTotalValue = (hairItem.remnantTotalValue ?? 0) + restore.value;
        }
        await updateDoc(doc(db, 'hairItems', hairItemId), restoreUpdate);
      }),
      ...Array.from(restoreBulkByItemId.entries()).map(async ([bulkItemId, qty]) => {
        const bulkItem = bulkItems.find((b) => b.id === bulkItemId);
        if (!bulkItem) return;
        await updateDoc(doc(db, 'bulkItems', bulkItemId), { quantity: bulkItem.quantity + qty });
      }),
    ]);

    await deleteDoc(doc(db, 'orders', order.id));
  };

  const handleConfirmDeleteShowroomOrder = async () => {
    if (deletingShowroomOrder) {
      await performDeleteShowroomOrder(deletingShowroomOrder);
    }
    setDeletingShowroomOrderId(null);
  };

  const statusBadgeClass = (status: HairItem['status']) => `status-badge status-${status}`;

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>ניהול מלאי</h1>
        <div className="tab-switch">
          <button
            className={activeTab === 'hair' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('hair')}
          >
            מלאי שיער ייחודי
          </button>
          <button
            className={activeTab === 'bulk' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('bulk')}
          >
            מלאי פשוט
          </button>
          <button
            className={activeTab === 'showroom' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('showroom')}
          >
            פאות תצוגה{showroomOrders.length ? ` (${showroomOrders.length})` : ''}
          </button>
        </div>
      </div>

      {loading && (
        <div className="inventory-state">
          <div className="inventory-state__spinner" />
          <p>טוענת נתוני מלאי...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="inventory-state inventory-state--error">
          <span className="inventory-state__icon">⚠️</span>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && activeTab === 'hair' && (
        <div className="tab-content">
          <div className="filter-bar">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש לפי מזהה, ספק או גוון..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select value={textureFilter} onChange={(e) => setTextureFilter(e.target.value)}>
              <option value="all">כל סוגי השיער</option>
              {textureOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select value={hairTypeFilter} onChange={(e) => setHairTypeFilter(e.target.value)}>
              <option value="all">כל המרקמים</option>
              {hairTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={lengthFilter}
              onChange={(e) => setLengthFilter(e.target.value as typeof lengthFilter)}
            >
              <option value="all">כל האורכים</option>
              <option value="short">קצר (עד 40 ס"מ)</option>
              <option value="medium">בינוני (40-55 ס"מ)</option>
              <option value="long">ארוך (מעל 55 ס"מ)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HairItem['status'] | 'all')}
            >
              <option value="all">כל הסטטוסים</option>
              {(Object.keys(STATUS_LABELS) as HairItem['status'][]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <button className="btn-primary add-hair-btn" onClick={() => setIsAddModalOpen(true)}>
              + קליטת קוקו חדש
            </button>
            <button className="btn-secondary add-hair-btn" onClick={() => setIsRemnantBoxModalOpen(true)}>
              + צור קופסת שאריות
            </button>
          </div>

          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>מזהה</th>
                  <th>ספק</th>
                  <th>אורך</th>
                  <th>משקל התחלתי</th>
                  <th>משקל נוכחי</th>
                  <th>גוון</th>
                  <th>מרקם</th>
                  <th>סוג שיער</th>
                  <th>עלות רכישה</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredHairItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-state">
                      לא נמצאו קוקוים התואמים לסינון
                    </td>
                  </tr>
                ) : (
                  filteredHairItems.map((item) => {
                    const isRemnant = item.isRemnantBox === true;
                    const canMerge = !isRemnant && item.currentWeight > 0;
                    const avgPricePerGram = isRemnant && item.currentWeight > 0
                      ? (item.remnantTotalValue ?? 0) / item.currentWeight
                      : 0;
                    return (
                      <tr key={item.id}>
                        <td className="mono">{item.id}</td>
                        <td>{isRemnant && '📦 '}{item.supplier}</td>
                        <td>{isRemnant ? '—' : `${item.length} ס"מ`}</td>
                        <td>{isRemnant ? '—' : `${item.initialWeight} גרם`}</td>
                        <td>{item.currentWeight} גרם</td>
                        <td>{item.color}</td>
                        <td>{isRemnant ? '—' : item.hairType}</td>
                        <td>{isRemnant ? '—' : item.texture}</td>
                        <td>{isRemnant ? `מחיר ממוצע לגרם: ₪${avgPricePerGram.toFixed(2)}` : `₪${item.costPrice.toLocaleString()}`}</td>
                        <td>
                          <span className={statusBadgeClass(item.status)}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td>
                          {canMerge && (
                            <button
                              className="btn-secondary merge-remnant-btn"
                              onClick={() => setMergeSourceItem(item)}
                            >
                              📦 מזג לשאריות
                            </button>
                          )}
                          {isRemnant && (
                            <button
                              className="btn-secondary merge-log-btn"
                              onClick={() => setMergeLogBoxId(item.id)}
                            >
                              📋 יומן מיזוגים{item.remnantMergeLog?.length ? ` (${item.remnantMergeLog.length})` : ''}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !loadError && activeTab === 'bulk' && (
        <div className="tab-content">
          <div className="filter-bar">
            <button className="btn-primary add-hair-btn" onClick={() => setIsAddBulkModalOpen(true)}>
              + מוצר חדש למלאי
            </button>
          </div>

          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>שם הפריט</th>
                  <th>כמות נוכחית</th>
                  <th>סף מינימום</th>
                  <th>עלות ממוצעת ליחידה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {bulkItems.map((item) => {
                  const isLow = item.quantity < item.minThreshold;
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        <span className={isLow ? 'qty-value qty-low' : 'qty-value'}>
                          {item.quantity}
                        </span>
                        {isLow && <span className="low-stock-badge">מלאי נמוך</span>}
                      </td>
                      <td>{item.minThreshold}</td>
                      <td>₪{item.unitCost.toFixed(2)}</td>
                      <td>
                        <div className="qty-controls">
                          <button
                            className="qty-btn"
                            onClick={() => handleUseOne(item.id)}
                            aria-label="הפחת יחידה (שימוש)"
                            title="שימוש ביחידה אחת"
                          >
                            −
                          </button>
                          <button
                            className="btn-secondary restock-btn"
                            onClick={() => setRestockTarget(item)}
                          >
                            + הוספת מלאי
                          </button>
                          {item.retailPrice != null && (
                            <button
                              className="btn-secondary retail-sale-btn"
                              onClick={() => setQuickSaleTarget(item)}
                            >
                              💰 מכירה
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !loadError && activeTab === 'showroom' && (
        <div className="tab-content">
          <div className="filter-bar">
            <div className="showroom-view-toggle">
              <button
                className={showroomViewFilter === 'unsold' ? 'showroom-view-btn active' : 'showroom-view-btn'}
                onClick={() => setShowroomViewFilter('unsold')}
              >
                במלאי
              </button>
              <button
                className={showroomViewFilter === 'sold' ? 'showroom-view-btn active' : 'showroom-view-btn'}
                onClick={() => setShowroomViewFilter('sold')}
              >
                נמכרו
              </button>
              <button
                className={showroomViewFilter === 'all' ? 'showroom-view-btn active' : 'showroom-view-btn'}
                onClick={() => setShowroomViewFilter('all')}
              >
                הכל
              </button>
            </div>
            <button
              className="btn-primary add-hair-btn"
              onClick={() => {
                setEditingShowroomOrderId(null);
                setIsShowroomFormOpen(true);
              }}
            >
              + יצירת פאת תצוגה
            </button>
          </div>

          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>מזהה</th>
                  <th>מפרט</th>
                  <th>מחיר מכירה מבוקש</th>
                  <th>סטטוס בנייה</th>
                  <th>סטטוס מלאי</th>
                </tr>
              </thead>
              <tbody>
                {filteredShowroomOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {showroomViewFilter === 'unsold'
                        ? 'אין כרגע פאות תצוגה במלאי - אפשר ליצור חדשה בכפתור למעלה'
                        : showroomViewFilter === 'sold'
                          ? 'עדיין לא נמכרה אף פאת תצוגה'
                          : 'אין כרגע פאות תצוגה - אפשר ליצור חדשה בכפתור למעלה'}
                    </td>
                  </tr>
                ) : (
                  filteredShowroomOrders.map((order) => {
                    const isSold = !!order.clientId;
                    return (
                      <tr
                        key={order.id}
                        className="showroom-row"
                        onClick={() =>
                          isSold ? setSelectedSoldShowroomOrderId(order.id) : setSelectedShowroomOrderId(order.id)
                        }
                      >
                        <td className="mono">{order.showroomCode || order.id}</td>
                        <td>{order.notes || '—'}</td>
                        <td>₪{(order.retailPrice ?? 0).toLocaleString()}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <CustomSelect
                            value={order.showroomStatus ?? 'בבנייה'}
                            onChange={(value) =>
                              updateDoc(doc(db, 'orders', order.id), { showroomStatus: value as ShowroomBuildStatus }).catch(
                                (err) => console.error('Error updating showroom status:', err)
                              )
                            }
                            options={SHOWROOM_BUILD_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                          />
                        </td>
                        <td>
                          {isSold ? (
                            <span className="status-badge status-sold">נמכרה{order.clientName ? ` - ${order.clientName}` : ''}</span>
                          ) : (
                            <span className="status-badge status-available">במלאי</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddHairModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveHairItem}
        nextId={nextHairId}
      />

      <AddBulkItemModal
        isOpen={isAddBulkModalOpen}
        onClose={() => setIsAddBulkModalOpen(false)}
        onSave={handleAddBulkItem}
      />

      <RestockModal
        isOpen={restockTarget !== null}
        item={restockTarget}
        onClose={() => setRestockTarget(null)}
        onConfirm={handleConfirmRestock}
      />

      <QuickRetailSaleModal
        isOpen={quickSaleTarget !== null}
        item={quickSaleTarget}
        onClose={() => setQuickSaleTarget(null)}
      />

      <CreateRemnantBoxModal
        isOpen={isRemnantBoxModalOpen}
        onClose={() => setIsRemnantBoxModalOpen(false)}
        onSave={handleCreateRemnantBox}
        nextId={nextHairId}
      />

      <MergeRemnantModal
        isOpen={mergeSourceItem !== null}
        sourceItem={mergeSourceItem}
        remnantBoxes={remnantBoxes}
        onClose={() => setMergeSourceItem(null)}
        onConfirm={handleMergeIntoRemnantBox}
      />

      <RemnantMergeLogModal
        isOpen={mergeLogBoxId !== null}
        box={mergeLogBox}
        onClose={() => setMergeLogBoxId(null)}
        onUndo={handleUndoMerge}
      />

      <ConfirmDialog
        isOpen={undoConfirm !== null}
        title="ביטול מיזוג - אזהרה"
        message={undoConfirm?.message ?? ''}
        variant="warning"
        onConfirm={handleConfirmUndoMerge}
        onCancel={() => setUndoConfirm(null)}
      />

      <ShowroomStockDetailsPanel
        isOpen={selectedShowroomOrderId !== null}
        order={selectedShowroomOrder}
        onClose={() => setSelectedShowroomOrderId(null)}
        onOpenAssignHair={() => setAssigningShowroomOrderId(selectedShowroomOrderId)}
        onOpenEdit={() => {
          setEditingShowroomOrderId(selectedShowroomOrderId);
          setIsShowroomFormOpen(true);
        }}
        onOpenSell={() => setSellingShowroomOrderId(selectedShowroomOrderId)}
        onDelete={() => setDeletingShowroomOrderId(selectedShowroomOrderId)}
      />

      {/* פאת תצוגה שכבר נמכרה - נפתחת ב-OrderDetailsPanel הרגיל (אותו רכיב
          כמו הזמנה רגילה ב-Sales.tsx/ClientDrawer.tsx), לא ב-
          ShowroomStockDetailsPanel: יש לה clientId/תשלומים אמיתיים, וכפתור
          "מכירה" כבר לא רלוונטי. שיוך שיער בפועל ממשיך להיפתח דרך אותו
          AssignHairModal המשותף למטה (assigningShowroomOrderId). */}
      <OrderDetailsPanel
        isOpen={selectedSoldShowroomOrderId !== null}
        order={selectedSoldShowroomOrder}
        onClose={() => setSelectedSoldShowroomOrderId(null)}
        onOpenAssignHair={(orderId) => setAssigningShowroomOrderId(orderId)}
      />

      <ShowroomStockFormModal
        isOpen={isShowroomFormOpen}
        editingOrder={editingShowroomOrder}
        nextShowroomCode={nextShowroomCode}
        onClose={() => setIsShowroomFormOpen(false)}
        onSaved={() => setIsShowroomFormOpen(false)}
      />

      {/* ניהול שיוך שיער לפאת תצוגה - אותו AssignHairModal בדיוק כמו על
          הזמנת לקוחה רגילה (Sales.tsx); clientName כאן הוא רק תווית תצוגה
          למודל (הפריט הזה עדיין בלי לקוחה אמיתית). */}
      <AssignHairModal
        isOpen={assigningShowroomOrderId !== null}
        order={
          assigningShowroomOrder
            ? {
                id: assigningShowroomOrder.id,
                clientName: `פאת תצוגה${assigningShowroomOrder.notes ? ` - ${assigningShowroomOrder.notes}` : ''}`,
                usedHairItems: assigningShowroomOrder.usedHairItems,
              }
            : null
        }
        onClose={() => setAssigningShowroomOrderId(null)}
      />

      <SellShowroomStockModal
        isOpen={sellingShowroomOrderId !== null}
        order={sellingShowroomOrder}
        onClose={() => setSellingShowroomOrderId(null)}
        onSold={() => setSellingShowroomOrderId(null)}
      />

      <ConfirmDialog
        isOpen={deletingShowroomOrderId !== null}
        title="מחיקת פאת תצוגה"
        message={
          deletingShowroomOrder &&
          ((deletingShowroomOrder.usedHairItems ?? []).length > 0 || (deletingShowroomOrder.usedBulkItems ?? []).length > 0)
            ? 'לפאה הזו כבר משויך שיער ו/או פריטי מלאי בפועל - המחיקה תחזיר את המשקל/השווי/הכמות לכל פריט ששויך אליה, ואז תמחק את הפאה לצמיתות. להמשיך?'
            : 'למחוק את פאת התצוגה הזו לצמיתות?'
        }
        variant="danger"
        onConfirm={handleConfirmDeleteShowroomOrder}
        onCancel={() => setDeletingShowroomOrderId(null)}
      />
    </div>
  );
};

export default Inventory;
