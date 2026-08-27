import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import type { BulkItem, HairItem, UsedBulkItem, UsedHairItem } from "../../types";
import { HAIR_LENGTH_OPTIONS, STRUCTURE_OPTIONS, FULLNESS_OPTIONS, calculateHairCost, type HairCostSettings } from "../../utils/hairCost";
import { createOrderWithProductionExpense } from "../../utils/orderCreation";
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
  inventory: "פאת תצוגה",
  repair: "תיקון / שירות",
};

export default function NewOrderWizard({ isOpen, onClose, onOrderCreated, preselectedClient = null, onOpenRepairForm }: NewOrderWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1: סוג הזמנה
  const [orderType, setOrderType] = useState<"new" | "inventory" | "repair" | "other">("new");

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

  // Step 3 (פאת תצוגה): בחירת קוקו/פאה קיימים במלאי בסטטוס "פאת תצוגה"
  const [showroomItems, setShowroomItems] = useState<HairItem[]>([]);
  const [showroomSearch, setShowroomSearch] = useState("");
  const [selectedShowroomItemId, setSelectedShowroomItemId] = useState("");

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
    setShowroomSearch("");
    setSelectedShowroomItemId("");
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

      getDocs(query(collection(db, "hairItems"), where("businessId", "==", businessId)))
        .then((snapshot) => {
          const items: HairItem[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<HairItem, "id">),
          }));
          setShowroomItems(items.filter((item) => item.status === "showroom"));
        })
        .catch((err) => console.error("Error loading showroom items for wizard:", err));
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

  const filteredShowroomItems = React.useMemo(
    () =>
      showroomItems.filter(
        (item) =>
          showroomSearch.trim() === "" ||
          item.id.toLowerCase().includes(showroomSearch.toLowerCase()) ||
          item.color.toLowerCase().includes(showroomSearch.toLowerCase())
      ),
    [showroomItems, showroomSearch]
  );

  const selectedShowroomItem = React.useMemo(
    () => showroomItems.find((item) => item.id === selectedShowroomItemId) || null,
    [showroomItems, selectedShowroomItemId]
  );

  const handleAddUsedBulkItem = () => {
    const item = bulkItemsCatalog.find((b) => b.id === bulkItemPickerId);
    const qty = Number(bulkItemPickerQty) || 0;
    if (!item || qty <= 0) return;
    setUsedBulkItems((prev) => [
      ...prev,
      { itemId: item.id, itemName: item.name, quantity: qty, unitCostAtTime: item.unitCost },
    ]);
    setBulkItemPickerId("");
    setBulkItemPickerQty(1);
  };

  const handleRemoveUsedBulkItem = (index: number) => {
    setUsedBulkItems((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const handleNext = () => {
    // תיקון/שירות מקבל טופס נפרד ופשוט - ברגע שהלקוחה נבחרה (סוף שלב 2),
    // יוצאים מהאשף לגמרי במקום להמשיך לשלבים 3-4 שלו.
    if (step === 2 && orderType === "repair") {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        onOpenRepairForm(client);
        onClose();
        return;
      }
    }
    setStep(step + 1);
  };

  const handleFinish = async () => {
    const businessId = auth.currentUser?.uid;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!businessId || !client) {
      setSaveError("יש לבחור לקוחה לפני יצירת ההזמנה.");
      return;
    }
    if (orderType === "inventory" && !selectedShowroomItem) {
      setSaveError("יש לבחור פאת תצוגה למכירה.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const isShowroomSale = orderType === "inventory" && selectedShowroomItem;

    const specsSummary = isShowroomSale
      ? [
          `פאת תצוגה: ${selectedShowroomItem!.id}`,
          `גוון: ${selectedShowroomItem!.color}`,
          `אורך: ${selectedShowroomItem!.length} ס״מ`,
          notes ? `הערות: ${notes}` : null,
        ]
          .filter(Boolean)
          .join(" | ")
      : [
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

    // פאת תצוגה שנמכרת: כל עלות הקוקו (100% מ-costPrice) נכנסת כעלות מלאה בפועל -
    // אין כאן "אומדן", השיוך ידוע במלואו כבר ברגע המכירה.
    const usedHairItems: UsedHairItem[] = isShowroomSale
      ? [
          {
            hairItemId: selectedShowroomItem!.id,
            hairItemLabel: `${selectedShowroomItem!.id} · ${selectedShowroomItem!.color} · ${selectedShowroomItem!.length} ס״מ`,
            gramsUsed: selectedShowroomItem!.initialWeight,
            costAtTime: selectedShowroomItem!.costPrice,
          },
        ]
      : [];

    try {
      await createOrderWithProductionExpense({
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
        hairCostEstimated: isShowroomSale ? 0 : hairCostEstimated,
        notes: specsSummary,
      });

      // הורדת הכמות שנוצלה בפועל מכל פריט מלאי פשוט שצורף להזמנה
      await Promise.all(
        usedBulkItems.map((used) => {
          const catalogItem = bulkItemsCatalog.find((b) => b.id === used.itemId);
          const remaining = Math.max(0, (catalogItem?.quantity ?? used.quantity) - used.quantity);
          return updateDoc(doc(db, "bulkItems", used.itemId), { quantity: remaining });
        })
      );

      // פאת התצוגה שנמכרה יורדת מהמלאי הזמין כפאת תצוגה
      if (isShowroomSale) {
        await updateDoc(doc(db, "hairItems", selectedShowroomItem!.id), {
          status: "sold",
          currentWeight: 0,
        });
      }

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
                  className={`type-card ${orderType === "inventory" ? "active" : ""}`}
                  onClick={() => setOrderType("inventory")}
                >
                  <span className="type-icon">📦</span>
                  <span className="type-title">פאת תצוגה</span>
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

          {/* Step 3: מפרט טכני של הפאה (Pills) - או בחירת פאת תצוגה למכירה */}
          {step === 3 && orderType === "inventory" && (
            <div className="wizard-step">
              <h3>בחירת פאת תצוגה למכירה</h3>
              <input
                type="text"
                className="wizard-input"
                placeholder="חיפוש לפי מזהה קוקו או גוון..."
                value={showroomSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowroomSearch(e.target.value)}
              />
              <div className="client-list-preview">
                {filteredShowroomItems.length === 0 && <p>לא נמצאו פאות תצוגה זמינות למכירה.</p>}
                {filteredShowroomItems.map((item) => (
                  <div
                    key={item.id}
                    className={`client-item ${selectedShowroomItemId === item.id ? "active" : ""}`}
                    onClick={() => setSelectedShowroomItemId(item.id)}
                  >
                    🪞 {item.id} — {item.color} · {item.length} ס״מ · ₪{item.costPrice.toLocaleString()}
                  </div>
                ))}
              </div>
              {selectedShowroomItem && (
                <div className="hair-cost-hint">עלות קוקו מלאה (100%): ₪{selectedShowroomItem.costPrice.toLocaleString()}</div>
              )}
            </div>
          )}

          {step === 3 && orderType !== "inventory" && (
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
                  <select value={bulkItemPickerId} onChange={(e) => setBulkItemPickerId(e.target.value)}>
                    <option value="">בחרי פריט מהמלאי...</option>
                    {bulkItemsCatalog.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (במלאי: {b.quantity})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={bulkItemPickerQty}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setBulkItemPickerQty(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                  <button type="button" className="btn-secondary" onClick={handleAddUsedBulkItem} disabled={!bulkItemPickerId}>
                    + הוסף פריט מהמלאי
                  </button>
                </div>
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
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                  />
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
            <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)} disabled={saving}>
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
              disabled={(step === 2 && !selectedClientId) || (step === 3 && orderType === "inventory" && !selectedShowroomItemId)}
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
