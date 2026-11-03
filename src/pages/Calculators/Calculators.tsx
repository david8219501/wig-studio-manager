import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, deleteField, collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import { HAIR_LENGTH_OPTIONS, STRUCTURE_OPTIONS, FULLNESS_OPTIONS, calculateHairCost, calculateHairCostFromGrams } from "../../utils/hairCost";
import { formatDateIL } from "../../utils/formatDate";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import CopyButton from "../../components/common/CopyButton";
import { Lock } from "lucide-react";
import './Calculators.css';

const DEFAULT_SETTINGS = {
  pricePerKgUsd: 4700,
  exchangeRate: 3.0,
  profitMargin: 100, // 100% רווח
};

interface Settings {
  pricePerKgUsd: number;
  exchangeRate: number;
  profitMargin: number;
}

function PriceCalculator({ settings }: { settings: Settings }) {
  const [length, setLength]       = useState<number | "">("");
  const [structure, setStructure] = useState("");
  const [fullness, setFullness]   = useState("");
  const [skinTop, setSkinTop]     = useState<number | "">(1500);
  const [net, setNet]             = useState<number | "">(200);
  const [extra, setExtra]         = useState<number | "">(300);

  const [hideInternalCosts, setHideInternalCosts] = useState(false);

  const missing = length === "" || !structure || !fullness;

  const calc = useMemo(() => {
    if (missing) return null;
    const { netGrams, waste, hairCost } = calculateHairCost(
      { length: Number(length), structure, fullness },
      settings
    );
    const mfgCost  = hairCost + Number(skinTop || 0) + Number(net || 0) + Number(extra || 0);
    const profit   = mfgCost * (settings.profitMargin / 100);
    const final    = mfgCost + profit;
    return { netGrams, waste, hairCost, mfgCost, profit, final };
  }, [length, structure, fullness, skinTop, net, extra, settings]);

  return (
    <div className="calc-card card-blue">
      <div className="calc-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="calc-card-icon">📐</span>
          <span className="calc-card-title">מחשבון הצעת מחיר לפאה</span>
        </div>

        <button
          className="calc-toggle-btn"
          onClick={() => setHideInternalCosts(prev => !prev)}
        >
          {hideInternalCosts ? "👁️ תצוגת לקוחה" : "👁️ תצוגת מנהל"}
        </button>
      </div>

      <div className="calc-row">
        <MiniNum label="אורך עורף (ס״מ)" value={length} onChange={setLength}
          placeholder="5-75" min={5} max={75} integer />
        <MiniSelect label="מבנה" value={structure} onChange={setStructure}
          options={STRUCTURE_OPTIONS.map(v=>({v,l:v}))} />
        <MiniSelect label="מלאות" value={fullness} onChange={setFullness}
          options={FULLNESS_OPTIONS.map(v=>({v,l:v}))} />
      </div>

      <div className="calc-row">
        <MiniNum label="סקין/טופ ₪" value={skinTop} onChange={setSkinTop} />
        <MiniNum label="רשת ₪" value={net} onChange={setNet} />
        <MiniNum label="נוספות ₪" value={extra} onChange={setExtra} />
      </div>

      {missing || !calc ? (
        <div className="calc-hint">יש למלא את כל הפרטים לחישוב התוצאה</div>
      ) : (
        <div className="calc-result-rows">
          <ResultRow label="סה״כ שיער נטו" value={`${calc.netGrams} גרם`} />
          <ResultRow label="בלאי 30%" value={`${calc.waste.toFixed(0)} גרם`} />
          
          {!hideInternalCosts && (
            <>
              <ResultRow label="עלות שיער" value={`₪${calc.hairCost.toFixed(0)}`} />
              <ResultRow label="עלות ייצור" value={`₪${calc.mfgCost.toFixed(0)}`} />
              <ResultRow label={`רווח משוער (${settings.profitMargin}%)`} value={`₪${calc.profit.toFixed(0)}`} />
            </>
          )}

          <div className="calc-final-row">
            <span>מחיר ללקוחה</span>
            <span className="calc-final-num">₪{calc.final.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const MAX_CAPS: Record<string, { nape: number; ear: number }> = {
  חלק:     { nape: 20, ear: 9  },
  גלי:     { nape: 14, ear: 4  },
  מתולתל:  { nape: 9,  ear: 0  },
};

const NAPE_STAGES = [
  { label: "שלב 1", range: [0,2]   },
  { label: "שלב 2", range: [3,11]  },
  { label: "שלב 3", range: [12,15] },
  { label: "שלב 4", range: [16,19] },
  { label: "שלב 5", range: [20,20] },
];
const EAR_STAGES = [
  { label: "שלב 3", range: [0,4] },
  { label: "שלב 4", range: [5,9] },
];

function LengthPlanner() {
  const [wigType, setWigType] = useState("");
  const [nape, setNape]       = useState<number | "">("");
  const [ear, setEar]         = useState<number | "">("");

  const napeRows = useMemo(() => {
    if (!wigType || nape === "") return null;
    const cap = Number(nape) + MAX_CAPS[wigType].nape;
    return Array.from({length:21}, (_,i) => Math.min(Number(nape)+i, cap));
  }, [wigType, nape]);

  const earRows = useMemo(() => {
    if (!wigType || ear === "") return null;
    const cap = Number(ear) + MAX_CAPS[wigType].ear;
    return Array.from({length:10}, (_,i) => Math.min(Number(ear)+i, cap));
  }, [wigType, ear]);

  return (
    <div className="calc-card card-green">
      <div className="calc-card-header">
        <span className="calc-card-icon">✂️</span>
        <span className="calc-card-title">מחשבון אורכים לבניית פאה</span>
      </div>

      <div className="calc-row">
        <MiniSelect label="סוג פאה" value={wigType} onChange={setWigType}
          options={["חלק","גלי","מתולתל"].map(v=>({v,l:v}))} />
        <MiniNum label="אורך עורף" value={nape} onChange={setNape} placeholder="חובה (5-75)" min={5} max={75} integer />
        <MiniNum label="אורך אוזניים" value={ear} onChange={setEar} placeholder="מומלץ" />
      </div>

      {!wigType || nape === "" || !napeRows ? (
        <div className="calc-hint">יש לבחור סוג פאה ואורך עורף</div>
      ) : (
        <div className="calc-stages-wrap">
          <div className="calc-stages-title">טבלת עורף</div>
          <div className="calc-stages-row">
            {NAPE_STAGES.map(({ label, range }) => (
              <StageCol key={label} label={label}
                rows={napeRows.slice(range[0], range[1]+1)} />
            ))}
          </div>

          {earRows && (
            <>
              <div className="calc-stages-title" style={{marginTop: '10px'}}>טבלת אוזניים</div>
              <div className="calc-stages-row">
                {EAR_STAGES.map(({ label, range }) => (
                  <StageCol key={label} label={label}
                    rows={earRows.slice(range[0], range[1]+1)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StageCol({ label, rows }: { label: string; rows: number[] }) {
  return (
    <div className="calc-stage-col">
      <div className="calc-stage-label">{label}</div>
      {rows.map((v,i) => <div key={i} className="calc-stage-cell">{v}</div>)}
    </div>
  );
}

function RepairsCalculator({ settings }: { settings: Settings }) {
  const [grams, setGrams]     = useState<number | "">("");
  const [skinTop, setSkinTop] = useState<number | "">(0);
  const [net, setNet]         = useState<number | "">(0);
  const [color, setColor]     = useState<number | "">(0);
  const [extra, setExtra]     = useState<number | "">(0);

  const missing = grams === "" || Number(grams) <= 0;

  const calc = useMemo(() => {
    if (missing) return null;
    const g        = Number(grams);
    const { waste, hairCost } = calculateHairCostFromGrams(g, settings);
    const mfgCost  = hairCost + Number(skinTop || 0) + Number(net || 0) + Number(color || 0) + Number(extra || 0);
    const final    = mfgCost * (1 + (settings.profitMargin / 100));
    return { waste, hairCost, mfgCost, final };
  }, [grams, skinTop, net, color, extra, settings]);

  return (
    <div className="calc-card card-purple">
      <div className="calc-card-header">
        <span className="calc-card-icon">🔧</span>
        <span className="calc-card-title">מחשבון שדרוגים ותיקונים</span>
      </div>

      <div className="calc-row">
        <MiniNum label="גרם שיער נדרש" value={grams} onChange={setGrams}
          placeholder="חובה" error={missing && grams !== ""} />
        <MiniNum label="סקין/טופ ₪" value={skinTop} onChange={setSkinTop} />
        <MiniNum label="רשת ₪" value={net} onChange={setNet} />
      </div>
      <div className="calc-row">
        <MiniNum label="צבע ₪" value={color} onChange={setColor} />
        <MiniNum label="נוספות ₪" value={extra} onChange={setExtra} />
      </div>

      {missing || !calc ? (
        <div className="calc-hint">יש להזין כמות גרמים לחישוב התוצאה</div>
      ) : (
        <div className="calc-result-rows">
          <ResultRow label="בלאי 30%" value={`${calc.waste.toFixed(0)} גרם`} />
          <ResultRow label="עלות שיער" value={`₪${calc.hairCost.toFixed(0)}`} />
          <ResultRow label="עלות ייצור" value={`₪${calc.mfgCost.toFixed(0)}`} />
          <div className="calc-final-row">
            <span>מחיר ללקוחה</span>
            <span className="calc-final-num">₪{calc.final.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── קטלוגי מחירים - טאב "קטלוגי מחירים" ─── */

interface CatalogRow {
  length: number;
  cost: number;
  price: number;
  priceManual?: boolean; // true = המחיר נערך ידנית (קטלוג "ידני" מלא, או עריכת תא בודד) - "עדכן לפי הגדרות נוכחיות" לא נוגע בשורה הזו
}

type CatalogMode = "auto" | "manual";

interface PriceCatalog {
  id: string;
  name: string;
  structure: string;
  fullness: string;
  mode: CatalogMode;
  createdAt: string;
  rows: CatalogRow[];
  extraCost: number; // עלות קבועה נוספת (רשת/עבודה/וכו'), מתווספת לעלות השיער בכל שורה. ברירת מחדל 0 - קטלוגים ישנים בלי השדה נטענים בדיוק כמו קודם
  extraCostLabel?: string; // תיאור קצר לעלות הנוספת (למשל "רשת ועבודה") - אופציונלי, לא נכתב ל-Firestore אם ריק
}

// שורות קטלוג "אוטומטיות" לכל האורכים האפשריים (HAIR_LENGTH_OPTIONS) -
// עלות = עלות שיער (calculateHairCost, בלי סקין/טופ/רשת/נוספות - בשונה
// מ-PriceCalculator) + extraCost הקבוע של הקטלוג (רשת/עבודה/וכו', אם
// הוגדר). מחיר מוצע עם אחוז הרווח על העלות הכוללת, אותה נוסחה בדיוק כמו
// suggestedPrice ב-RepairOrderForm.tsx. cost תמיד מחושב כך - לא ניתן
// לעריכה ידנית באף מצב. price הוא רק ההצעה ה"אוטומטית" - במצב ידני
// המשתמשת יכולה לשנות אותו (ראו handleCreateCatalog/recomputeRows).
function computeAutoRows(structure: string, fullness: string, settings: Settings, extraCost: number): CatalogRow[] {
  return HAIR_LENGTH_OPTIONS.map((length) => {
    const { hairCost } = calculateHairCost({ length, structure, fullness }, settings);
    const cost = Math.round(hairCost + extraCost);
    const price = Math.round(cost * (1 + settings.profitMargin / 100));
    return { length, cost, price };
  });
}

// עדכון שורות קטלוג קיים (כפתור "עדכן לפי הגדרות נוכחיות" + שמירת עריכה
// של מבנה/מלאות/עלות נוספת): cost מחושב מחדש תמיד (עלות חומר גלם/עלות
// נוספת יכולות להשתנות). price מחושב מחדש רק לשורות בלי priceManual -
// שורות עם priceManual (קטלוג "ידני" מלא, או עריכת תא בודד) שומרות את
// המחיר שלהן בדיוק, גם אם ה-cost שלהן השתנה (מאותרות לפי length, לא
// לפי אינדקס - ליתר בטחון).
function recomputeRows(existingRows: CatalogRow[], structure: string, fullness: string, settings: Settings, extraCost: number): CatalogRow[] {
  const autoRows = computeAutoRows(structure, fullness, settings, extraCost);
  return autoRows.map((row) => {
    const existing = existingRows.find((r) => r.length === row.length);
    if (existing?.priceManual) {
      return { ...row, price: existing.price, priceManual: true };
    }
    return row;
  });
}

// ביטול נעילת מחיר ידני לשורה בודדת - מחזירה אותה למחיר אוטומטי לפי
// ההגדרות הנוכחיות (לא "מקפיאה" את המחיר הידני האחרון כ-auto).
function unlockRowPrice(rows: CatalogRow[], length: number, structure: string, fullness: string, settings: Settings, extraCost: number): CatalogRow[] {
  const autoRows = computeAutoRows(structure, fullness, settings, extraCost);
  const autoRow = autoRows.find((r) => r.length === length);
  if (!autoRow) return rows;
  return rows.map((r) => (r.length === length ? autoRow : r));
}

// טקסט מוכן להעתקה/שליחה בוואטסאפ - שם הקטלוג + שורה לכל אורך.
// עמודת רווח נכללת רק כש-showProfit דלוק (בהתאמה למה שמוצג בטבלה עצמה).
function buildCatalogCopyText(catalog: PriceCatalog, showProfit: boolean): string {
  const lines = catalog.rows.map((row) => {
    const base = `${row.length} ס״מ - ${row.price.toLocaleString("he-IL")}₪`;
    return showProfit ? `${base} (רווח: ₪${(row.price - row.cost).toLocaleString("he-IL")})` : base;
  });
  return `${catalog.name}\n${lines.join("\n")}`;
}

// טקסט "נקי" למסמך ללקוחה (הדפסה/שיתוף) - אורך ומחיר סופי בלבד. לעולם
// לא מקבלת showProfit כפרמטר בכלל (לא רק שלא משתמשת בו) - כדי שלא
// ניתן יהיה בטעות לחשוף cost/profit/extraCost מכאן, גם אם "הצג רווח"
// דלוק באותו רגע במסך. נפרדת לגמרי מ-buildCatalogCopyText (שלא השתנה).
function buildCatalogShareText(catalog: PriceCatalog): string {
  const lines = catalog.rows.map((row) => `${row.length} ס״מ - ₪${row.price.toLocaleString("he-IL")}`);
  return `${catalog.name}\n${lines.join("\n")}`;
}

// תא מחיר ניתן לעריכה inline בטבלת קטלוג שמור - state מקומי (לא state
// של ההורה) כדי לא "לקפוץ" תוך כדי הקלדה בזמן שה-onSnapshot החי מרענן
// את שאר הטבלה; מתאפס ל-price העדכני כשהוא משתנה מבחוץ (למשל "עדכן
// לפי הגדרות נוכחיות"). שלילי לא נשמר בכלל (כמו שדה המחיר הידני
// בתצוגה המקדימה), 0 מותר. נעילה (priceManual) מוצגת כאייקון מנעול
// עם tooltip + כפתור שחרור קטן.
// key={price} בקריאה (ולא useEffect) מאפס את ה-state המקומי כש-price
// משתנה מבחוץ (onSnapshot חי) - React מרכיב instance חדש עם price
// העדכני כ-state ראשוני, בלי setState בתוך effect (react-hooks/set-
// state-in-effect).
function CatalogPriceCell({ price, locked, onCommit, onUnlock }: { price: number; locked: boolean; onCommit: (newPrice: number) => void; onUnlock: () => void }) {
  const [localValue, setLocalValue] = useState(price);

  return (
    <span className="catalog-price-cell">
      <input
        type="number"
        min="0"
        className="calc-input catalog-price-input"
        value={localValue}
        onChange={(e) => {
          const newValue = Number(e.target.value) || 0;
          if (newValue < 0) return;
          setLocalValue(newValue);
        }}
        onBlur={() => {
          if (localValue !== price) onCommit(localValue);
        }}
      />
      {locked && (
        <button
          type="button"
          className="catalog-price-lock-btn"
          title="מחיר ידני - לא יתעדכן אוטומטית. לחצי לשחרור הנעילה"
          onClick={onUnlock}
        >
          <Lock size={13} />
        </button>
      )}
    </span>
  );
}

function PriceCatalogsTab({ settings, businessName, logoUrl }: { settings: Settings; businessName: string; logoUrl: string | null }) {
  const [catalogs, setCatalogs] = useState<PriceCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [structure, setStructure] = useState("");
  const [fullness, setFullness] = useState("");
  const [mode, setMode] = useState<CatalogMode>("auto");
  const [manualPrices, setManualPrices] = useState<Record<number, number>>({});
  const [extraCost, setExtraCost] = useState<number | "">(0);
  const [extraCostLabel, setExtraCostLabel] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStructure, setEditStructure] = useState("");
  const [editFullness, setEditFullness] = useState("");
  const [editExtraCost, setEditExtraCost] = useState<number | "">(0);
  const [editExtraCostLabel, setEditExtraCostLabel] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // הצגת/הסתרת עמודת "רווח" בטבלת הקטלוגים השמורים - state גלובלי אחד
  // לכל הטאב (לא כפתור נפרד לכל קטלוג), כי השימוש הטיפוסי הוא הצגת
  // המסך ללקוחה: אין סיבה לחשוף רווח בקטלוג אחד ולהסתיר באחר בעת ובעונה
  // אחת. false כברירת מחדל - מוסתר, כדי שלא "יחשף בטעות" למי שמסתכל
  // מעבר לכתף. לא חל על טבלת התצוגה המקדימה במצב ידני בטופס היצירה -
  // זו כלי עבודה פנימי (העסק ממלא מחירים, לא מציג ללקוחה), אז הרווח
  // שם תמיד מוצג כדי שהמשתמשת תדע כמה היא מרוויחה בזמן שהיא קובעת מחיר.
  const [showProfit, setShowProfit] = useState(false);

  // הדפסה - קטלוג שנבחר להדפסה כרגע (ראו handlePrintCatalog/print-area
  // למטה) + תפריט שיתוף נפילה (רק במחשב, כש-navigator.share לא קיים).
  const [printingCatalog, setPrintingCatalog] = useState<PriceCatalog | null>(null);
  const [shareMenuCatalogId, setShareMenuCatalogId] = useState<string | null>(null);

  // סגירת תפריט השיתוף בלחיצה מחוץ לו - אותו דפוס כמו תפריטים נפילה
  // אחרים באתר (CustomSelect).
  useEffect(() => {
    if (!shareMenuCatalogId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".price-catalog-share-wrapper")) {
        setShareMenuCatalogId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareMenuCatalogId]);

  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const unsub = onSnapshot(
      query(collection(db, "priceCatalogs"), where("businessId", "==", businessId)),
      (snapshot) => {
        setCatalogs(
          snapshot.docs
            .map((d) => {
              // תאימות לאחור: קטלוגים שנוצרו לפני הוספת מצב ידני/עמודת
              // רווח לא מחזיקים mode או rows[].price (רק suggestedPrice
              // הישן) - ממפים אותם כ"אוטומטי" עם price נופל בחזרה ל-
              // suggestedPrice, כדי שלא יישברו בתצוגה.
              const data = d.data() as Record<string, unknown>;
              const rawRows = (data.rows as Array<Record<string, unknown>>) || [];
              const rows: CatalogRow[] = rawRows.map((r) => ({
                length: r.length as number,
                cost: r.cost as number,
                price: (r.price as number) ?? (r.suggestedPrice as number) ?? 0,
                priceManual: r.priceManual as boolean | undefined,
              }));
              return {
                id: d.id,
                name: data.name as string,
                structure: data.structure as string,
                fullness: data.fullness as string,
                createdAt: data.createdAt as string,
                mode: (data.mode === "manual" ? "manual" : "auto") as CatalogMode,
                rows,
                extraCost: (data.extraCost as number) ?? 0,
                extraCostLabel: data.extraCostLabel as string | undefined,
              };
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error loading price catalogs:", err);
        setLoadError("שגיאה בטעינת קטלוגי המחירים. בדקי את החיבור ונסי לרענן את הדף.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // בבחירת מבנה/מלאות אחרים - מנקה override ידניים קודמים (נשמרים לפי
  // length בלבד, אז בלי הניקוי הזה ערך ידני ממבנה/מלאות קודמים היה
  // "נדבק" בטעות למבנה/מלאות החדשים). לא מזין מחדש בפועל - שדה המחיר
  // הריק נופל חזרה ל-row.price (ההצעה האוטומטית) ברינדור, ראו למטה.
  const handleStructureChange = (v: string) => { setStructure(v); setManualPrices({}); };
  const handleFullnessChange = (v: string) => { setFullness(v); setManualPrices({}); };

  const previewRows = useMemo(() => {
    if (!structure || !fullness) return [];
    return computeAutoRows(structure, fullness, settings, Number(extraCost) || 0);
  }, [structure, fullness, settings, extraCost]);

  const canCreate = name.trim() !== "" && structure !== "" && fullness !== "";

  const handleCreateCatalog = async () => {
    if (!canCreate) return;
    // קטלוג "ידני" - כל שורותיו priceManual: true (לא רק אלו שנערכו
    // בפועל) - "עדכן לפי הגדרות נוכחיות" לא יחליף אף מחיר בקטלוג כזה.
    const rows: CatalogRow[] = mode === "manual"
      ? previewRows.map((row) => ({ ...row, price: manualPrices[row.length] ?? row.price, priceManual: true }))
      : previewRows;
    const extraCostLabelTrimmed = extraCostLabel.trim();
    await addDoc(collection(db, "priceCatalogs"), {
      businessId: auth.currentUser!.uid,
      name: name.trim(),
      structure,
      fullness,
      mode,
      createdAt: new Date().toISOString(),
      rows,
      extraCost: Number(extraCost) || 0,
      // Firestore דוחה כתיבת undefined - שדה מושמט כליל (לא נכתב) אם
      // התיאור ריק, לא "extraCostLabel: undefined".
      ...(extraCostLabelTrimmed ? { extraCostLabel: extraCostLabelTrimmed } : {}),
    });
    setName("");
    setStructure("");
    setFullness("");
    setMode("auto");
    setManualPrices({});
    setExtraCost(0);
    setExtraCostLabel("");
  };

  const handleRefreshCatalog = async (catalog: PriceCatalog) => {
    await updateDoc(doc(db, "priceCatalogs", catalog.id), {
      rows: recomputeRows(catalog.rows, catalog.structure, catalog.fullness, settings, catalog.extraCost),
    });
  };

  const startEdit = (catalog: PriceCatalog) => {
    setEditingId(catalog.id);
    setEditName(catalog.name);
    setEditStructure(catalog.structure);
    setEditFullness(catalog.fullness);
    setEditExtraCost(catalog.extraCost);
    setEditExtraCostLabel(catalog.extraCostLabel ?? "");
  };

  // עריכת מבנה/מלאות/עלות נוספת עשויה לשנות את עלות השיער הבסיסית -
  // cost מחושב מחדש תמיד. price מחושב מחדש רק לשורות בלי priceManual
  // (recomputeRows, אותה לוגיקה כמו כפתור "עדכן").
  const handleSaveEdit = async () => {
    if (!editingId || editName.trim() === "" || editStructure === "" || editFullness === "") return;
    const catalog = catalogs.find((c) => c.id === editingId);
    if (!catalog) return;
    const editExtraCostNum = Number(editExtraCost) || 0;
    const editExtraCostLabelTrimmed = editExtraCostLabel.trim();
    await updateDoc(doc(db, "priceCatalogs", editingId), {
      name: editName.trim(),
      structure: editStructure,
      fullness: editFullness,
      rows: recomputeRows(catalog.rows, editStructure, editFullness, settings, editExtraCostNum),
      extraCost: editExtraCostNum,
      // שדה מושמט כליל אם ריק - לא extraCostLabel: undefined (Firestore דוחה).
      ...(editExtraCostLabelTrimmed ? { extraCostLabel: editExtraCostLabelTrimmed } : { extraCostLabel: deleteField() }),
    });
    setEditingId(null);
  };

  // עריכת מחיר שורה בודדת בטבלת קטלוג שמור - נועלת רק אותה (priceManual:
  // true), לא משנה שום שורה אחרת. כתיבה ישירה ל-Firestore (לא state
  // מקומי) - onSnapshot החי יעדכן את התצוגה.
  const handleRowPriceChange = async (catalog: PriceCatalog, length: number, newPrice: number) => {
    const newRows = catalog.rows.map((r) => (r.length === length ? { ...r, price: newPrice, priceManual: true } : r));
    await updateDoc(doc(db, "priceCatalogs", catalog.id), { rows: newRows });
  };

  // "שחרור נעילה" לשורה בודדת - מחזיר אותה למחיר אוטומטי לפי ההגדרות
  // הנוכחיות (לא מקפיא את המחיר הידני האחרון כאילו הוא "אוטומטי").
  const handleUnlockRowPrice = async (catalog: PriceCatalog, length: number) => {
    const newRows = unlockRowPrice(catalog.rows, length, catalog.structure, catalog.fullness, settings, catalog.extraCost);
    await updateDoc(doc(db, "priceCatalogs", catalog.id), { rows: newRows });
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteDoc(doc(db, "priceCatalogs", deletingId));
    setDeletingId(null);
  };

  // מדפיסה קטלוג יחיד - ראו .print-area/CSS @media print (Calculators.css):
  // "is-printing-catalog" על ה-body הוא מה שמפעיל את ההדפסה הממוקדת (רק
  // אזור ההדפסה, לא שאר האפליקציה) - בלי המחלקה הזו, הדפסה מדף אחר
  // באתר לא נפגעת בכלל (הכלל חל רק כש-body נושא אותה בפועל).
  // requestAnimationFrame - נותן ל-React לרנדר את אזור ההדפסה עם הקטלוג
  // הנבחר לפני שקוראים בפועל ל-window.print() (קריאה סינכרונית מוקדמת
  // מדי הייתה מדפיסה דף ריק, לפני שה-state עדיין הוחל ב-DOM).
  const handlePrintCatalog = (catalog: PriceCatalog) => {
    setPrintingCatalog(catalog);
    document.body.classList.add("is-printing-catalog");
    requestAnimationFrame(() => window.print());
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("is-printing-catalog");
      setPrintingCatalog(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  // navigator.share (בעיקר נייד) - פותח את חלון השיתוף של המכשיר עם
  // הטקסט הנקי. ביטול מפורש ע"י המשתמשת (AbortError) אינו שגיאה - לא
  // מוצגת הודעה. אם navigator.share לא קיים (בעיקר מחשב) - תפריט נפילה
  // קטן עם וואטסאפ/העתקה (shareMenuCatalogId, ראו JSX למטה).
  const handleShareCatalog = async (catalog: PriceCatalog) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: buildCatalogShareText(catalog) });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("Error sharing catalog:", err);
        }
      }
      return;
    }
    setShareMenuCatalogId((prev) => (prev === catalog.id ? null : catalog.id));
  };

  return (
    <div className="price-catalog-tab">
      <div className="calc-card card-purple price-catalog-create-card">
        <div className="calc-card-header">
          <span className="calc-card-icon">📖</span>
          <span className="calc-card-title">יצירת קטלוג חדש</span>
        </div>

        <div className="calc-row">
          <MiniText label="שם הקטלוג" value={name} onChange={setName} placeholder="לדוגמה: פאות בלונד טוף לייס" />
          <MiniSelect label="מבנה" value={structure} onChange={handleStructureChange}
            options={STRUCTURE_OPTIONS.map(v=>({v,l:v}))} />
          <MiniSelect label="מלאות" value={fullness} onChange={handleFullnessChange}
            options={FULLNESS_OPTIONS.map(v=>({v,l:v}))} />
        </div>

        {/* עלות נוספת - אופציונלי, מתווספת לעלות השיער בכל שורות הקטלוג
            (למשל רשת/עבודה שקבועה לכל הקטלוג, בלי קשר לאורך). ריק = 0,
            לא שדה חובה. */}
        <div className="calc-row">
          <MiniNum label="עלות נוספת ₪ (אופציונלי)" value={extraCost} onChange={setExtraCost} min={0} />
          <MiniText label="תיאור העלות הנוספת (אופציונלי)" value={extraCostLabel} onChange={setExtraCostLabel} placeholder="לדוגמה: רשת ועבודה" />
        </div>

        <div className="calc-field">
          <label className="calc-field-label">קביעת מחירים - אוטומטי לפי המחשבון, או ידני בעצמך?</label>
          <div className="tab-switch">
            <button type="button" className={mode === "auto" ? "tab-btn active" : "tab-btn"} onClick={() => setMode("auto")}>
              אוטומטי
            </button>
            <button type="button" className={mode === "manual" ? "tab-btn active" : "tab-btn"} onClick={() => setMode("manual")}>
              ידני
            </button>
          </div>
        </div>

        {mode === "manual" && previewRows.length > 0 && (
          <div className="catalog-table-wrapper">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>אורך עורף</th>
                  <th>עלות שיער</th>
                  <th>מחיר (לעריכה)</th>
                  <th>רווח</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const price = manualPrices[row.length] ?? row.price;
                  const profit = price - row.cost;
                  return (
                    <tr key={row.length}>
                      <td className="font-bold">{row.length} ס״מ</td>
                      <td className="mono">₪{row.cost.toLocaleString("he-IL")}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="calc-input catalog-price-input"
                          value={price}
                          onChange={(e) => {
                            const newValue = Number(e.target.value) || 0;
                            // 0 מותר בכוונה (למשל שורה "בחינם") - רק שלילי חסום,
                            // לא נשמר בכלל (הערך הקודם נשאר).
                            if (newValue < 0) return;
                            setManualPrices((prev) => ({ ...prev, [row.length]: newValue }));
                          }}
                        />
                      </td>
                      <td className="mono text-success">₪{profit.toLocaleString("he-IL")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <button className="calc-settings-btn" disabled={!canCreate} onClick={handleCreateCatalog}>
          + צור קטלוג
        </button>
      </div>

      {loading && (
        <div className="calc-state">
          <p>טוענת קטלוגי מחירים...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="calc-state calc-state--error">
          <span className="calc-state__icon">⚠️</span>
          <p>{loadError}</p>
        </div>
      )}

      {!loading && !loadError && catalogs.length === 0 && (
        <div className="calc-hint">אין עדיין קטלוגי מחירים - צרי את הראשון למעלה.</div>
      )}

      {!loading && !loadError && catalogs.length > 0 && (
        <div className="price-catalog-profit-toggle">
          <button className="calc-toggle-btn" onClick={() => setShowProfit((prev) => !prev)}>
            {showProfit ? "🙈 הסתר רווח" : "👁 הצג רווח"}
          </button>
        </div>
      )}

      {!loading && !loadError && catalogs.map((catalog) => (
        <div key={catalog.id} className="calc-card price-catalog-card">
          {editingId === catalog.id ? (
            <>
              <div className="calc-row">
                <MiniText label="שם הקטלוג" value={editName} onChange={setEditName} />
                <MiniSelect label="מבנה" value={editStructure} onChange={setEditStructure}
                  options={STRUCTURE_OPTIONS.map(v=>({v,l:v}))} />
                <MiniSelect label="מלאות" value={editFullness} onChange={setEditFullness}
                  options={FULLNESS_OPTIONS.map(v=>({v,l:v}))} />
              </div>
              <div className="calc-row">
                <MiniNum label="עלות נוספת ₪ (אופציונלי)" value={editExtraCost} onChange={setEditExtraCost} min={0} />
                <MiniText label="תיאור העלות הנוספת (אופציונלי)" value={editExtraCostLabel} onChange={setEditExtraCostLabel} placeholder="לדוגמה: רשת ועבודה" />
                <button className="calc-toggle-btn" onClick={handleSaveEdit}>💾 שמירה</button>
                <button className="calc-toggle-btn" onClick={() => setEditingId(null)}>ביטול</button>
              </div>
            </>
          ) : (
            <div className="price-catalog-card-header">
              <div>
                <span className="price-catalog-name">{catalog.name}</span>
                <div className="price-catalog-meta">
                  {catalog.structure} · {catalog.fullness} · {catalog.mode === "manual" ? "תמחור ידני" : "תמחור אוטומטי"} · נוצר ב-{formatDateIL(catalog.createdAt)}
                </div>
                {catalog.extraCost > 0 && (
                  <div className="price-catalog-meta">
                    כולל עלות נוספת: ₪{catalog.extraCost.toLocaleString("he-IL")}{catalog.extraCostLabel ? ` (${catalog.extraCostLabel})` : ""}
                  </div>
                )}
              </div>
              <div className="price-catalog-actions">
                <CopyButton text={buildCatalogCopyText(catalog, showProfit)} label="העתק לשליחה" />
                <button
                  className="calc-toggle-btn"
                  disabled={catalog.rows.length === 0}
                  onClick={() => handlePrintCatalog(catalog)}
                >
                  🖨 הדפס
                </button>
                <div className="price-catalog-share-wrapper">
                  <button
                    className="calc-toggle-btn"
                    disabled={catalog.rows.length === 0}
                    onClick={() => handleShareCatalog(catalog)}
                  >
                    ↗ שתף
                  </button>
                  {shareMenuCatalogId === catalog.id && (
                    <div className="price-catalog-share-menu">
                      <button
                        type="button"
                        className="price-catalog-share-menu-item"
                        onClick={() => {
                          window.open(`https://wa.me/?text=${encodeURIComponent(buildCatalogShareText(catalog))}`, "_blank");
                          setShareMenuCatalogId(null);
                        }}
                      >
                        שליחה בוואטסאפ
                      </button>
                      <CopyButton
                        text={buildCatalogShareText(catalog)}
                        label="העתקה"
                        className="price-catalog-share-menu-item"
                      />
                    </div>
                  )}
                </div>
                <button className="calc-toggle-btn" onClick={() => handleRefreshCatalog(catalog)}>
                  🔄 עדכן לפי הגדרות נוכחיות
                </button>
                <button className="calc-toggle-btn" onClick={() => startEdit(catalog)}>✏️ עריכה</button>
                <button className="calc-toggle-btn price-catalog-delete-btn" onClick={() => setDeletingId(catalog.id)}>
                  🗑️ מחיקה
                </button>
              </div>
            </div>
          )}

          <div className="catalog-table-wrapper">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>אורך עורף</th>
                  <th>עלות שיער</th>
                  <th>מחיר</th>
                  {showProfit && <th>רווח</th>}
                </tr>
              </thead>
              <tbody>
                {catalog.rows.map((row) => (
                  <tr key={row.length}>
                    <td className="font-bold">{row.length} ס״מ</td>
                    <td className="mono">₪{row.cost.toLocaleString("he-IL")}</td>
                    <td className="mono catalog-price">
                      <CatalogPriceCell
                        key={row.price}
                        price={row.price}
                        locked={!!row.priceManual}
                        onCommit={(newPrice) => handleRowPriceChange(catalog, row.length, newPrice)}
                        onUnlock={() => handleUnlockRowPrice(catalog, row.length)}
                      />
                    </td>
                    {showProfit && (
                      <td className="mono text-success">₪{(row.price - row.cost).toLocaleString("he-IL")}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <ConfirmDialog
        isOpen={deletingId !== null}
        title="מחיקת קטלוג מחירים"
        message="למחוק את הקטלוג הזה לצמיתות? הפעולה לא ניתנת לביטול."
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* מסמך ללקוחה - אורך ומחיר סופי בלבד, לעולם לא cost/profit/extraCost,
          גם אם "הצג רווח" דלוק באותו רגע במסך (ראו buildCatalogShareText -
          לא מקבלת showProfit בכלל). מוסתר בתצוגה רגילה, מוצג רק בהדפסה
          (ראו .print-area ב-Calculators.css, @media print). */}
      <div className="print-area">
        {printingCatalog && (
          <div className="print-catalog">
            <div className="print-header">
              {logoUrl && <img src={logoUrl} alt="" className="print-logo" />}
              {businessName && <div className="print-business-name">{businessName}</div>}
            </div>
            <h2 className="print-catalog-name">{printingCatalog.name}</h2>
            <p className="print-catalog-meta">{printingCatalog.structure} · {printingCatalog.fullness}</p>
            <table className="print-table">
              <thead>
                <tr>
                  <th>אורך (ס״מ)</th>
                  <th>מחיר (₪)</th>
                </tr>
              </thead>
              <tbody>
                {printingCatalog.rows.map((row) => (
                  <tr key={row.length}>
                    <td>{row.length}</td>
                    <td>₪{row.price.toLocaleString("he-IL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="print-date">תאריך הפקה: {formatDateIL(new Date())}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CalculatorsPageProps {
  onNavigateToSettings?: () => void;
}

export default function CalculatorsPage({ onNavigateToSettings }: CalculatorsPageProps) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calculators" | "catalogs">("calculators");
  // שם העסק/לוגו (users/{uid}) - רק לתצוגה במסמך ההדפסה של קטלוג
  // (ראו PriceCatalogsTab), אותו דפוס בדיוק כמו App.tsx (כותרת/סיידבר).
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // טעינת הגדרות התמחור של העסק מ-Firestore (ואם עדיין אין - שמירת ברירת
  // המחדל). העריכה עצמה עברה למסך ההגדרות (Settings.tsx, כרטיס "הגדרות
  // תמחור") - כאן רק קוראים כדי להזין את המחשבונים. getDoc חד-פעמי מספיק
  // (לא מאזין חי): זה עמוד נפרד שנטען מחדש בכל מעבר אליו, אז שינוי
  // שנשמר במסך ההגדרות כבר יתפוס בטעינה הבאה של העמוד הזה.
  useEffect(() => {
    const businessId = auth.currentUser?.uid;
    if (!businessId) return;

    const settingsRef = doc(db, "businessSettings", businessId);
    getDoc(settingsRef)
      .then((snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...(snap.data() as Partial<Settings>) }));
        } else {
          setDoc(settingsRef, DEFAULT_SETTINGS, { merge: true }).catch((err) =>
            console.error("Error seeding business settings:", err)
          );
        }
      })
      .catch((err) => {
        console.error("Error loading business settings:", err);
        setLoadError("שגיאה בטעינת הגדרות התמחור - מוצגים ערכי ברירת מחדל. בדקי את החיבור ונסי לרענן את הדף.");
      });

    getDoc(doc(db, "users", businessId))
      .then((snap) => {
        const data = snap.data() as { businessName?: string; logoUrl?: string } | undefined;
        setBusinessName(data?.businessName || "");
        setLogoUrl(data?.logoUrl || null);
      })
      .catch((err) => console.error("Error loading business profile for catalog printing:", err));
  }, []);

  return (
    <div className="calc-page">
      <div className="calc-top-row">
        <h1 className="calc-page-title">מחשבונים</h1>
        <button className="calc-settings-btn" onClick={onNavigateToSettings}>
          ⚙️ לעריכת הגדרות תמחור - לחצי כאן
        </button>
      </div>

      <div className="tab-switch">
        <button
          className={activeTab === "calculators" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("calculators")}
        >
          מחשבונים
        </button>
        <button
          className={activeTab === "catalogs" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("catalogs")}
        >
          קטלוגי מחירים
        </button>
      </div>

      {loadError && (
        <div className="calc-state calc-state--error">
          <span className="calc-state__icon">⚠️</span>
          <p>{loadError}</p>
        </div>
      )}

      {activeTab === "calculators" && (
        // מחשבון הצעת מחיר + מחשבון שדרוגים/תיקונים בשורה עליונה אחד ליד
        // השני; מחשבון אורכים לבניית פאה יורד לשורה שמתחת.
        <div className="calc-grid">
          <PriceCalculator settings={settings} />
          <RepairsCalculator settings={settings} />
          <LengthPlanner />
        </div>
      )}

      {activeTab === "catalogs" && <PriceCatalogsTab settings={settings} businessName={businessName} logoUrl={logoUrl} />}
    </div>
  );
}

function MiniSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="calc-field">
      <label className="calc-field-label">{label}</label>
      <select className="calc-select" value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">בחר...</option>
        {options.map(({v,l})=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function MiniText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="calc-field">
      <label className="calc-field-label">{label}</label>
      <input
        type="text"
        className="calc-input"
        value={value}
        placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
      />
    </div>
  );
}

function MiniNum({ label, value, onChange, placeholder="0", error=false, min, max, integer }: { label: string; value: number | ""; onChange: (v: number | "") => void; placeholder?: string; error?: boolean; min?: number; max?: number; integer?: boolean }) {
  return (
    <div className="calc-field">
      <label className="calc-field-label">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={integer ? 1 : undefined}
        className={`calc-input ${error ? 'calc-input-error' : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value === "") { onChange(""); return; }
          let newValue = Number(e.target.value);
          if (integer) newValue = Math.trunc(newValue);
          // min/max מתנהגים כמו בשדה המחיר הידני בטבלת הקטלוג: ערך מעבר
          // לטווח לא נשמר בכלל (הערך הקודם נשאר), לא רק HTML-level הגנה.
          if (min !== undefined && newValue < min) return;
          if (max !== undefined && newValue > max) return;
          onChange(newValue);
        }}
      />
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="calc-result-row">
      <span className="calc-result-label">{label}</span>
      <span className="calc-result-val">{value}</span>
    </div>
  );
}