import React, { useState, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import './Calculators.css';

const DEFAULT_SETTINGS = {
  pricePerKgUsd: 4700,
  exchangeRate: 3.0,
  profitMargin: 100, // 100% רווח
};

// נתוני קטלוג פאת טופ קלאסי לפי התמונה
const CATALOG_PRICING = [
  { length: 5, price: 8000 },
  { length: 10, price: 10000 },
  { length: 15, price: 12000 },
  { length: 20, price: 12500 },
  { length: 25, price: 13000 },
  { length: 30, price: 13500 },
  { length: 35, price: 14000 },
  { length: 40, price: 14500 },
  { length: 45, price: 15500 },
  { length: 50, price: 16500 },
  { length: 55, price: 18000 },
  { length: 60, price: 20000 },
];

const CATALOG_SPECS = {
  topPrice: 700,
  netPrice: 40,
};

const BASE_WEIGHTS: Record<number, number> = {
  5:110, 10:140, 15:170, 20:200, 25:230,
  30:260, 35:290, 40:320, 45:350, 50:380,
  55:410, 60:440, 65:470, 70:500, 75:530,
};

const STRUCTURE_MOD: Record<string, number> = { טופ:-50, סקין:-40, קלאסי:0, סרט:0 };
const FULLNESS_MOD: Record<string, number>  = { דליל:-30, קלאסי:0, מלא:30 };

function lookupWeight(len: number) {
  const keys = Object.keys(BASE_WEIGHTS).map(Number).sort((a,b)=>a-b);
  let match = keys[0];
  for (const k of keys) { if (k <= len) match = k; else break; }
  return BASE_WEIGHTS[match];
}

interface Settings {
  pricePerKgUsd: number;
  exchangeRate: number;
  profitMargin: number;
}

/* ─── רכיב קטלוג מחירון (מצד שמאל למחשבון) ─── */
function CatalogCard({ settings }: { settings: Settings }) {
  const [showManagerProfit, setShowManagerProfit] = useState(false);

  return (
    <div className="calc-card card-purple catalog-card">
      <div className="calc-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="calc-card-icon">📖</span>
          <div>
            <span className="calc-card-title">קטלוג מחירון - פאת טופ קלאסי</span>
            <div className="catalog-sub-badge">
              סקין/טופ: ₪{CATALOG_SPECS.topPrice} | רשת: ₪{CATALOG_SPECS.netPrice}
            </div>
          </div>
        </div>

        <button
          className="calc-toggle-btn"
          onClick={() => setShowManagerProfit((prev) => !prev)}
        >
          {showManagerProfit ? "👁️ תצוגת מנהל (עם רווח)" : "👁️ תצוגת לקוחה"}
        </button>
      </div>

      <div className="catalog-table-wrapper">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>אורך עורף</th>
              <th>מחיר ללקוחה</th>
              {showManagerProfit && <th>רווח משוער ({settings.profitMargin}%)</th>}
            </tr>
          </thead>
          <tbody>
            {CATALOG_PRICING.map((item) => {
              // חישוב רווח גס מתוך המחיר
              const estimatedProfit = item.price * (settings.profitMargin / (100 + settings.profitMargin));
              return (
                <tr key={item.length}>
                  <td className="font-bold">{item.length} ס״מ</td>
                  <td className="catalog-price">₪{item.price.toLocaleString("he-IL")}</td>
                  {showManagerProfit && (
                    <td className="catalog-profit">₪{estimatedProfit.toFixed(0)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceCalculator({ settings }: { settings: Settings }) {
  const [length, setLength]       = useState("");
  const [structure, setStructure] = useState("");
  const [fullness, setFullness]   = useState("");
  const [skinTop, setSkinTop]     = useState<number | "">(1500);
  const [net, setNet]             = useState<number | "">(200);
  const [extra, setExtra]         = useState<number | "">(300);

  const [hideInternalCosts, setHideInternalCosts] = useState(false);

  const missing = !length || !structure || !fullness;

  const calc = useMemo(() => {
    if (missing) return null;
    const base     = lookupWeight(Number(length));
    const netGrams = base + (STRUCTURE_MOD[structure] || 0) + (FULLNESS_MOD[fullness] || 0);
    const waste    = netGrams * 0.3;
    const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * (netGrams + waste) / 1000;
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
        <MiniSelect label="אורך עורף" value={length} onChange={setLength}
          options={[5,10,15,20,25,30,35,40,45,50,55,60,65,70,75].map(v=>({v: String(v), l:`${v} ס״מ`}))} />
        <MiniSelect label="מבנה" value={structure} onChange={setStructure}
          options={["טופ","סקין","קלאסי","סרט"].map(v=>({v,l:v}))} />
        <MiniSelect label="מלאות" value={fullness} onChange={setFullness}
          options={["דליל","קלאסי","מלא"].map(v=>({v,l:v}))} />
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
        <MiniNum label="אורך עורף" value={nape} onChange={setNape} placeholder="חובה" />
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
    const waste    = g * 0.3;
    const hairCost = (settings.pricePerKgUsd * settings.exchangeRate) * (g + waste) / 1000;
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

const statsData = [
  {month:"ינו",quote:3,repair:1},{month:"פבר",quote:5,repair:2},
  {month:"מרץ",quote:4,repair:3},{month:"אפר",quote:7,repair:2},
  {month:"מאי",quote:6,repair:4},{month:"יוני",quote:9,repair:3},
];

function UsageStats() {
  return (
    <div className="calc-card card-orange">
      <div className="calc-card-header">
        <span className="calc-card-icon">📊</span>
        <span className="calc-card-title">סטטיסטיקת שימוש במחשבונים</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={statsData} margin={{top:10,right:10,left:-25,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eeeff1" vertical={false} />
          <XAxis dataKey="month" tick={{fontSize:11, fill: '#525866'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize:11, fill: '#525866'}} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ background: '#242629', borderRadius: '7px', color: '#fff', border: 'none', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar dataKey="quote" fill="#9b69ff" name="הצעת מחיר" radius={[4,4,0,0]} barSize={16} />
          <Line type="monotone" dataKey="repair" stroke="#00d17e" strokeWidth={2} name="תיקונים" dot={{r:3, fill: '#00d17e'}} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="calc-stats-legend">
        <div className="calc-legend-item"><div className="calc-legend-dot" style={{background:"#9b69ff"}}/>הצעת מחיר</div>
        <div className="calc-legend-item"><div className="calc-legend-dot" style={{background:"#00d17e", borderRadius:"50%"}}/>תיקונים</div>
      </div>
    </div>
  );
}

export default function CalculatorsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="calc-page">
      <div className="calc-top-row">
        <h1 className="calc-page-title">מחשבונים</h1>
        <button className="calc-settings-btn" onClick={()=>setShowSettings(p=>!p)}>
          ⚙️ הגדרות גלובליות
        </button>
      </div>

      {showSettings && (
        <div className="calc-global-settings">
          <div className="calc-setting-row">
            <label className="calc-setting-label">מחיר לק״ג ($)</label>
            <input type="number" className="calc-setting-input" value={settings.pricePerKgUsd}
              onChange={e=>setSettings(p=>({...p,pricePerKgUsd:Number(e.target.value)}))} />
          </div>
          <div className="calc-setting-row">
            <label className="calc-setting-label">שער יציג</label>
            <input type="number" className="calc-setting-input" value={settings.exchangeRate}
              onChange={e=>setSettings(p=>({...p,exchangeRate:Number(e.target.value)}))} />
          </div>
          <div className="calc-setting-row">
            <label className="calc-setting-label">% רווח (לדוגמה: 100 עבור 100%)</label>
            <input type="number" className="calc-setting-input" value={settings.profitMargin}
              onChange={e=>setSettings(p=>({...p,profitMargin:Number(e.target.value)}))} />
          </div>
        </div>
      )}

      {/* הגריד מכיל עכשיו גם את כרטיס הקטלוג מצד שמאל למחשבון */}
      <div className="calc-grid">
        <PriceCalculator settings={settings} />
        <CatalogCard settings={settings} />
        <LengthPlanner />
        <RepairsCalculator settings={settings} />
        <UsageStats />
      </div>
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

function MiniNum({ label, value, onChange, placeholder="0", error=false }: { label: string; value: number | ""; onChange: (v: number | "") => void; placeholder?: string; error?: boolean }) {
  return (
    <div className="calc-field">
      <label className="calc-field-label">{label}</label>
      <input
        type="number"
        className={`calc-input ${error ? 'calc-input-error' : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={e=>onChange(e.target.value === "" ? "" : Number(e.target.value))}
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