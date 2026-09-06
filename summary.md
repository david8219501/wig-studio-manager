# סיכום: פריסה ראשונית ל-Firebase Hosting

## מה נבדק ובוצע

- **`firebase.json`**: לא הייתה בו הגדרת `hosting` בכלל (רק
  `storage`/`functions`) - נוספה:
  - `public: "dist"` - תיקיית הפלט של `vite build`.
  - `rewrites: [{ source: "**", destination: "/index.html" }]` -
    catch-all ל-SPA. לא קריטי כרגע בפועל (האתר הוא state-based
    routing בלי react-router/נתיבי URL אמיתיים - כל הניווט קורה
    בזיכרון, לא ב-URL), אבל זו ברירת המחדל הבטוחה הסטנדרטית לכל
    אתר SPA שמתארחת ב-Firebase Hosting - מונע 404 בכל תרחיש עתידי
    של רענון על נתיב לא-root.
  - `ignore` סטנדרטי (`firebase.json`, dotfiles, `node_modules`).
- `npm run build` - נקי, יצר מחדש את `dist/` (5 קבצים: index.html +
  assets/CSS/JS + favicon/icons).
- `firebase deploy --only hosting` - הצליח (`esti-wigs-system`,
  הפרויקט המוגדר כבר כברירת מחדל ב-`.firebaserc`/מחובר ב-CLI).

## כתובת האתר החי

**https://esti-wigs-system.web.app**

(קונסולת הפרויקט: https://console.firebase.google.com/project/esti-wigs-system/overview)

## הערה

`.firebase/hosting.ZGlzdA.cache` (קובץ cache מקומי של ה-CLI) הופיע
כ"modified" ב-git status אחרי הפריסה - הוא **כבר** עקוב (tracked)
בריפו מלפני זמן, למרות ש-`.gitignore` כן מכיל `.firebase/` (הכלל
מונע מעקב חדש, לא מבטל מעקב קיים). לא נגעתי בו - לא היה חלק
מהמשימה, ומחיקתו מדרישת המעקב היא decision נפרד שלא התבקש.

**בדיקות:** `npm run build` נקי, `firebase deploy --only hosting`
הסתיים ב-"Deploy complete!" בלי שגיאות.
