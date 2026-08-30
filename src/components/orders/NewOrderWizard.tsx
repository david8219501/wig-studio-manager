import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { BulkItem, UsedBulkItem, UsedHairItem } from "../../types";
import { HAIR_LENGTH_OPTIONS, STRUCTURE_OPTIONS, FULLNESS_OPTIONS, calculateHairCost, type HairCostSettings } from "../../utils/hairCost";
import { createOrder } from "../../utils/orderCreation";
import DateInput from "../common/DateInput";
import "./NewOrderWizard.css";

export interface ClientOption {
  id: string;
  name: string;
  phone: string;
}

const DEFAULT_HAIR_COST_SETTINGS: HairCostSettings = { pricePerKgUsd: 4700, exchangeRate: 3.0 };

interface NewOrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderData: any) => void;
  preselectedClient?: ClientOption | null; // אם נפתח מתוך כרטיס לקוחה - הלקוחה כבר ידועה מראש
  // תיקון/שירות מטופל בטופס נפרד ופשוט יותר (RepairOrderForm) - האשף רק
  // מזהה את הבחירה ומעביר את הלקוחה שנבחרה הלאה, בלי לעבור את שלבי 3-4 שלו.
  onOpenRepairForm: (client: ClientOption) => void;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  new: "פאה חדשה",
  repair: "תיקון / שירות",
};

export default function NewOrderWizard({ isOpen, onClose, onOrderCreated, preselectedClient = null, onOpenRepairForm }: NewOrderWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1: סוג הזמנה
  const [orderType, setOrderType] = useState<"new" | "repair" | "other">("new");

  // Step 2: לקוחה - נטענת בפועל מ-Firestore
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  // Step 3: פרטי הפאה (Chips / Pills) - רלוונטי רק ל"פאה חדשה"
  const [size, setSize] = useState("M");
  const [texture, setTexture] = useState("גלי");
  const [handwork, setHandwork] = useState("רגיל");
  const [repairs, setRepairs] = useState("לא");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");

  // Step 3: עלות שיער - בחירות סגורות זהות למחשבון, לאומדן אוטומטי (hairCostEstimated)
  const [hairLength, setHairLength] = useState("");
  const [hairStructure, setHairStructure] = useState("");
  const [hairFullness, setHairFullness] = useState("");
  const [hairCostSettings, setHairCostSettings] = useState<HairCostSettings>(DEFAULT_HAIR_COST_SETTINGS);

  // Step 3: פריטי מלאי פשוט שצורפו להזמנה הספציפית (רשת, ראש פאה, קופסת מתנה וכו')
  const [bulkItemsCatalog, setBulkItemsCatalog] = useState<BulkItem[]>([]);
  const [usedBulkItems, setUsedBulkItems] = useState<UsedBulkItem[]>([]);
  const [bulkItemPickerId, setBulkItemPickerId] = useState("");
  const [bulkItemPickerQty, setBulkItemPickerQty] = useState<number | "">(1);
  const [bulkItemQtyError, setBulkItemQtyError] = useState<string | null>(null);

  // Step 4: תמחיור ותשלומים
  const [price, setPrice] = useState<number | "">(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentsCount, setPaymentsCount] = useState(1);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // בכל פתיחה מחדש של האשף: איפוס מצב + טעינת רשימת לקוחות אמיתית מ-Firestore
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setOrderType("new");
    setClientSearch("");
    setSize("M");
    setTexture("גלי");
    setHandwork("רגיל");
    setRepairs("לא");
    setColor("");
    setNotes("");
    setHairLength("");
    setHairStructure("");
    setHairFullness("");
    setUsedBulkItems([]);
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
    setBulkItemQtyError(null);
    setPrice(0);
    setDueDate("");
    setPaymentsCount(1);
    setSaveError(null);

    const businessId = auth.currentUser?.uid;
    if (businessId) {
      getDoc(doc(db, "businessSettings", businessId))
        .then((snap) => {
          if (snap.exists()) {
            setHairCostSettings((prev) => ({ ...prev, ...(snap.data() as Partial<HairCostSettings>) }));
          }
        })
        .catch((err) => console.error("Error loading business settings for wizard:", err));

      getDocs(query(collection(db, "bulkItems"), where("businessId", "==", businessId)))
        .then((snapshot) => {
          const items: BulkItem[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<BulkItem, "id">),
          }));
          setBulkItemsCatalog(items);
        })
        .catch((err) => console.error("Error loading bulk items for wizard:", err));
    }

    if (preselectedClient) {
      setSelectedClientId(preselectedClient.id);
      setClients([preselectedClient]);
      return;
    }

    setSelectedClientId("");
    if (!businessId) return;

    setLoadingClients(true);
    getDocs(query(collection(db, "clients"), where("businessId", "==", businessId)))
      .then((snapshot) => {
        const list: ClientOption[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as { name?: string; phone?: string };
          return { id: docSnap.id, name: data.name || "", phone: data.phone || "" };
        });
        setClients(list);
      })
      .catch((err) => console.error("Error loading clients for wizard:", err))
      .finally(() => setLoadingClients(false));
  }, [isOpen, preselectedClient]);

  const hairCostEstimated = React.useMemo(() => {
    if (!hairLength || !hairStructure || !hairFullness) return 0;
    return calculateHairCost(
      { length: Number(hairLength), structure: hairStructure, fullness: hairFullness },
      hairCostSettings
    ).hairCost;
  }, [hairLength, hairStructure, hairFullness, hairCostSettings]);

  // וולידציה זהה לדפוס שכבר קיים ב-AssignHairModal.tsx (gramsExceedsStock),
  // OrderDetailsPanel.tsx (bulkQtyExceedsStock) ו-QuickRetailSaleModal.tsx -
  // בודקת מול המלאי הזמין **כולל** כמות שכבר נבחרה לאותו פריט קודם
  // באותה הזמנה (אפשר להוסיף את אותו פריט כמה פעמים), לא רק את הכמות
  // הבודדת שמתווספת עכשיו.
  const handleAddUsedBulkItem = () => {
    const item = bulkItemsCatalog.find((b) => b.id === bulkItemPickerId);
    const qty = Number(bulkItemPickerQty) || 0;
    if (!item || qty <= 0) return;

    const alreadyUsedQty = usedBulkItems
      .filter((used) => used.itemId === item.id)
      .reduce((sum, used) => sum + used.quantity, 0);
    const remaining = item.quantity - alreadyUsedQty;

    if (qty > remaining) {
      setBulkItemQtyError(`הכמות המבוקשת עולה על המלאי הזמין - נותרו רק ${remaining} יח'.`);
      return;
    }

    setBulkItemQtyError(null);
    setUsedBulkItems((prev) => [
      ...prev,
      { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
    ]);
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
  };

  const handleRemoveUsedBulkItem = (index: number) => {
    setUsedBulkItems((prev) => prev.filter((_, i) => i !== index));
    setBulkItemQtyError(null);
  };

  if (!isOpen) return null;

  // כשהאשף נפתח עם preselectedClient (מתוך ClientDrawer של לקוחה ספציפית) -
  // הלקוחה כבר ידועה מההקשר, אז מדלגים על שלב 2 (בחירת לקוחה) לגמרי בשני
  // הכיוונים (הבא/חזור) - אין טעם לבקש לבחור/לאשר שוב לקוחה שכבר נבחרה.
  const handleNext = () => {
    // תיקון/שירות מקבל טופס נפרד ופשוט - ברגע שהלקוחה ידועה (מ-preselectedClient
    // בשלב 1, או בסוף שלב 2 הרגיל כשאין preselectedClient), יוצאים מהאשף
    // לגמרי במקום להמשיך לשלבים 3-4 שלו.
    if (step === 1 && orderType === "repair" && preselectedClient) {
      onOpenRepairForm(preselectedClient);
      onClose();
      return;
    }
    if (step === 2 && orderType === "repair") {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        onOpenRepairForm(client);
        onClose();
        return;
      }
    }
    if (step === 1) {
      setStep(preselectedClient ? 3 : 2);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 3 && preselectedClient) {
      setStep(1);
      return;
    }
    setStep(step - 1);
  };

  const handleFinish = async () => {
    const businessId = auth.currentUser?.uid;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!businessId || !client) {
      setSaveError("יש לבחור לקוחה לפני יצירת ההזמנה.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    // בדיקת הגנה נוספת (defense in depth) - הוולידציה האמיתית כבר קורית
    // ב-handleAddUsedBulkItem בזמן הבחירה (כולל צבירה נכונה אם אותו פריט
    // נבחר כמה פעמים). זו רק רשת ביטחון למקרה שהמלאי בפועל השתנה במקביל
    // (למשל מכירה אחרת) בין פתיחת האשף (וטעינת bulkItemsCatalog) לבין
    // לחיצה על "סיום" - אם מתגלה כאן חריגה בכל זאת, עוצרים לגמרי לפני
    // שההזמנה נוצרת, במקום ליצור אותה עם מלאי שיירד בשקט ל-0.
    const usedQtyByItemId = new Map<string, number>();
    usedBulkItems.forEach((used) => {
      usedQtyByItemId.set(used.itemId, (usedQtyByItemId.get(used.itemId) ?? 0) + used.quantity);
    });
    for (const [itemId, totalQty] of usedQtyByItemId) {
      const catalogItem = bulkItemsCatalog.find((b) => b.id === itemId);
      if (catalogItem && totalQty > catalogItem.quantity) {
        setSaveError(
          `הכמות המבוקשת מ-"${catalogItem.name}" עולה על המלאי הזמין (נותרו ${catalogItem.quantity}) - ייתכן שהמלאי השתנה. יש לעדכן את הכמות ולנסות שוב.`
        );
        setSaving(false);
        return;
      }
    }

    const specsSummary = [
      `מידה: ${size}`,
      `תנועה: ${texture}`,
      `עבודת יד: ${handwork}`,
      repairs !== "לא" ? `תיקונים: ${repairs}` : null,
      hairLength ? `אורך: ${hairLength} ס״מ` : null,
      hairStructure ? `מבנה: ${hairStructure}` : null,
      hairFullness ? `מלאות: ${hairFullness}` : null,
      color ? `צבע: ${color}` : null,
      notes ? `הערות: ${notes}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    // שיוך שיער בפועל להזמנה חדשה נעשה תמיד אחרי היצירה, דרך AssignHairModal
    // (Sales.tsx) - לא כאן.
    const usedHairItems: UsedHairItem[] = [];

    try {
      await createOrder({
        businessId,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        orderType: ORDER_TYPE_LABELS[orderType] || orderType,
        totalPrice: Number(price) || 0,
        dueDate: dueDate || null,
        paymentsCount,
        usedBulkItems,
        usedHairItems,
        hairCostEstimated,
        notes: specsSummary,
      });

      // הורדת הכמות שנוצלה בפועל מכל פריט מלאי פשוט שצורף להזמנה - מקובצת
      // לפי itemId (usedQtyByItemId מהבדיקה למעלה), כדי שאם אותו פריט נבחר
      // כמה פעמים באותה הזמנה, ההורדה תהיה update אחד עם הסכום הכולל,
      // ולא כמה update-ים מקבילים על אותו מסמך שדורסים זה את זה.
      await Promise.all(
        Array.from(usedQtyByItemId.entries()).map(([itemId, totalQty]) => {
          const catalogItem = bulkItemsCatalog.find((b) => b.id === itemId);
          const remaining = (catalogItem?.quantity ?? totalQty) - totalQty;
          return updateDoc(doc(db, "bulkItems", itemId), { quantity: remaining });
        })
      );

      onOrderCreated({});
      onClose();
    } catch (err) {
      console.error("Error creating order:", err);
      setSaveError("שגיאה ביצירת ההזמנה. נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Navigation */}
        <div className="wizard-header">
          <h2>יצירת הזמנה חדשה</h2>
          <span className="step-indicator">שלב {step} מתוך 4</span>
        </div>

        <div className="wizard-body">
          {/* Step 1: בחירת סוג הזמנה */}
          {step === 1 && (
            <div className="wizard-step">
              <h3>בחרי סוג הזמנה</h3>
              <div className="type-grid">
                <button
                  type="button"
                  className={`type-card ${orderType === "new" ? "active" : ""}`}
                  onClick={() => setOrderType("new")}
                >
                  <span className="type-icon">✨</span>
                  <span className="type-title">פאה חדשה</span>
                </button>
                <button
                  type="button"
                  className={`type-card ${orderType === "repair" ? "active" : ""}`}
                  onClick={() => setOrderType("repair")}
                >
                  <span className="type-icon">🧵</span>
                  <span className="type-title">תיקון / שירות</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: בחירת לקוחה */}
          {step === 2 && (
            <div className="wizard-step">
              <h3>בחירת לקוחה</h3>
              {preselectedClient ? (
                <div className="client-item active">👤 {preselectedClient.name} ({preselectedClient.phone})</div>
              ) : (
                <>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="חיפוש לפי שם או טלפון..."
                    value={clientSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSearch(e.target.value)}
                  />
                  <div className="client-list-preview">
                    {loadingClients && <p>טוענת רשימת לקוחות...</p>}
                    {!loadingClients && clients.length === 0 && (
                      <p>אין עדיין לקוחות במערכת. יש להוסיף לקוחה בדף הלקוחות תחילה.</p>
                    )}
                    {!loadingClients &&
                      clients
                        .filter(
                          (c) =>
                            c.name.includes(clientSearch) || c.phone.includes(clientSearch)
                        )
                        .map((client) => (
                          <div
                            key={client.id}
                            className={`client-item ${selectedClientId === client.id ? "active" : ""}`}
                            onClick={() => setSelectedClientId(client.id)}
                          >
                            👤 {client.name} ({client.phone})
                          </div>
                        ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: מפרט טכני של הפאה (Pills) */}
          {step === 3 && (
            <div className="wizard-step">
              <h3>מפרט הפאה</h3>

              <div className="pill-group">
                <label>מידה:</label>
                <div className="pills">
                  {["S", "M", "L", "XL"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={`pill ${size === s ? "active" : ""}`}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pill-group">
                <label>תנועה:</label>
                <div className="pills">
                  {["ישר", "גלי", "מתולתל"].map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={`pill ${texture === t ? "active" : ""}`}
                      onClick={() => setTexture(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pill-group">
                <label>עבודת יד:</label>
                <div className="pills">
                  {["גבוה", "נמוך", "רגיל"].map((h) => (
                    <button
                      type="button"
                      key={h}
                      className={`pill ${handwork === h ? "active" : ""}`}
                      onClick={() => setHandwork(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row form-row-3">
                <div className="field">
                  <label>אורך עורף</label>
                  <select value={hairLength} onChange={(e) => setHairLength(e.target.value)}>
                    <option value="">בחר...</option>
                    {HAIR_LENGTH_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v} ס״מ</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>מבנה</label>
                  <select value={hairStructure} onChange={(e) => setHairStructure(e.target.value)}>
                    <option value="">בחר...</option>
                    {STRUCTURE_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>מלאות</label>
                  <select value={hairFullness} onChange={(e) => setHairFullness(e.target.value)}>
                    <option value="">בחר...</option>
                    {FULLNESS_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {hairCostEstimated > 0 && (
                <div className="hair-cost-hint">עלות שיער משוערת (גולמית): ₪{hairCostEstimated.toFixed(0)}</div>
              )}

              <div className="field">
                <label>גוון / צבע</label>
                <input
                  type="text"
                  placeholder="לדוגמה: חום דבש עם גוונים"
                  value={color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <div className="pill-group">
                <label>פריטי מלאי שנוספו להזמנה (רשת, ראש פאה, קופסת מתנה וכו'):</label>

                {usedBulkItems.length > 0 && (
                  <div className="bulk-item-list">
                    {usedBulkItems.map((used, idx) => (
                      <div key={idx} className="bulk-item-row">
                        <span>{used.itemName} × {used.quantity}</span>
                        <span className="mono">₪{(used.unitCostAtTime * used.quantity).toFixed(0)}</span>
                        <button
                          type="button"
                          className="bulk-item-remove-btn"
                          onClick={() => handleRemoveUsedBulkItem(idx)}
                          aria-label="הסרת פריט"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bulk-item-add-row">
                  <select
                    value={bulkItemPickerId}
                    onChange={(e) => {
                      setBulkItemPickerId(e.target.value);
                      setBulkItemQtyError(null);
                    }}
                  >
                    <option value="">בחרי פריט מהמלאי...</option>
                    {bulkItemsCatalog.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (במלאי: {b.quantity})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={bulkItemPickerQty}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setBulkItemPickerQty(e.target.value === "" ? "" : Number(e.target.value));
                      setBulkItemQtyError(null);
                    }}
                  />
                  <button type="button" className="btn-secondary" onClick={handleAddUsedBulkItem} disabled={!bulkItemPickerId}>
                    + הוסף פריט מהמלאי
                  </button>
                </div>
                {bulkItemQtyError && <span className="field-error">{bulkItemQtyError}</span>}
              </div>

              <div className="field">
                <label>הערות נוספות</label>
                <textarea
                  rows={2}
                  placeholder="דגשים מיוחדים לפאה..."
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: תמחיור ותשלומים */}
          {step === 4 && (
            <div className="wizard-step">
              <h3>תמחיור ותנאי תשלום</h3>
              <div className="form-row">
                <div className="field">
                  <label>מחיר ללקוחה (₪)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div className="field">
                  <label>תאריך יעד מוכן</label>
                  <DateInput value={dueDate} onChange={setDueDate} />
                </div>
              </div>

              <div className="pill-group">
                <label>מספר תשלומים:</label>
                <div className="pills">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      type="button"
                      key={num}
                      className={`pill ${paymentsCount === num ? "active" : ""}`}
                      onClick={() => setPaymentsCount(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="wizard-footer">
          {saveError && <span className="field-error" style={{ marginInlineEnd: "auto" }}>{saveError}</span>}
          {step > 1 ? (
            <button type="button" className="btn-secondary" onClick={handleBack} disabled={saving}>
              חזור
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              ביטול
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              disabled={step === 2 && !selectedClientId}
            >
              הבא
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleFinish} disabled={saving}>
              {saving ? "יוצר הזמנה..." : "סיום ויצירת הזמנה 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
