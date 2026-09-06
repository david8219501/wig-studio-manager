# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

Always communicate with the user in Hebrew (chat responses, explanations, status updates) — regardless of the language they type in. Code, identifiers, and comments follow the Hebrew-UI convention described below, not this rule.

## Project

Wig Studio Manager (Esti Wigs) — a Hebrew-language, RTL business management portal for a wig studio: client management, appointment calendar, inventory, sales, expenses, calculators, and reports. React 19 + TypeScript + Vite, with Firebase (Auth + Firestore) as the backend. No dedicated server — the SPA talks to Firestore directly.

All UI text, comments, and Firestore field values (statuses like `"מוכנה"`, `"שולם"`) are in Hebrew. Match this convention in new code — keep UI strings and domain-status values in Hebrew; identifiers/code stay in English.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # tsc -b (project references) + vite build
npm run lint      # eslint .
npm run preview   # preview the production build
```

There is no test runner configured (no `npm test` script, no test files present) — don't assume Vitest is wired up despite it being mentioned in `GEMINI.md`.

## Architecture

**Single-page, state-driven routing (no router library).** `src/App.tsx` holds `activePage` in `useState` and renders one of the page components via a `switch` in `renderPage()`. `Sidebar` (`src/components/Sidebar/Sidebar.tsx`) calls `onNavigate(id)` to change it. To add a new page/section: add a case to the switch in `App.tsx` and a nav entry to `NAV_ITEMS` in `Sidebar.tsx` — there are no route files or URL paths to update.

**Auth gating.** `App.tsx` also owns `isLoggedIn` state. When false it renders `Login` (handles both sign-in and business registration via Firebase Auth); when true it renders the full app shell. Registration writes a `users/{uid}` document with business profile fields and `role: "admin"`.

**Multi-tenant data model keyed by `businessId`.** There's no separate `businessId` field to look up — every page uses `auth.currentUser.uid` directly as the tenant key:
- Every Firestore write includes `businessId: auth.currentUser!.uid`.
- Every Firestore read filters with `where("businessId", "==", businessId)`.
- Follow this pattern for any new collection/query — omitting the `businessId` filter or write leaks/misfiles data across tenants.

**Firestore access is inline in components**, not behind a service/repository layer. Pages (`src/pages/*/*.tsx`) and modals (`src/components/modals/`, `src/components/orders/`) import `db`/`auth` from `src/services/firebase.ts` directly and call `getDocs`/`onSnapshot`/`addDoc`/`setDoc`/`deleteDoc` themselves. Keep new features consistent with this pattern unless deliberately introducing an abstraction layer. This still holds specifically for Firestore reads/writes — shared business-logic *calculations*, though, already live behind a thin `src/utils/` layer (below), so don't reimplement those formulas inline in a new component.

**Shared calculation utils.** `src/utils/hairCost.ts` holds the single hair-cost formula (`calculateHairCostFromGrams`) — used by `Calculators.tsx`, `NewOrderWizard.tsx`, and `RepairOrderForm.tsx`; don't duplicate it. `src/utils/orderProfit.ts` holds order profit/production-cost calculations (used by `Sales.tsx`). `src/utils/orderCreation.ts` holds `createOrder`, the shared order-creation helper used by `NewOrderWizard.tsx`, `RepairOrderForm.tsx`, and `QuickRetailSaleModal.tsx` (renamed from the misleading `createOrderWithProductionExpense` — it no longer creates an `expenses` doc, see the comment at the top of `orderCreation.ts`). `src/utils/formatDate.ts` holds `formatDateIL`/`getMonthNameIL`, the shared Hebrew date-formatting helpers (used by `Calendar.tsx`, `Dashboard.tsx`, `Reports.tsx`, `RemnantMergeLogModal.tsx`) — implemented from fixed lookup tables rather than `toLocaleDateString`, so the display doesn't depend on the running browser/OS's locale data.

**Firestore collections in use:** `users`, `clients`, `orders`, `appointments`, `hairItems`, `bulkItems`, `expenses`, `businessSettings`. Of the domain types in `src/types/index.ts`, only `HairItem` and `BulkItem` are actually used — import those. `Client` is **not** imported from there: each page defines its own local `Client`-like interface (`Clients.tsx`'s `export interface Client` is the real source of truth for the `clients` shape; `Calendar.tsx` defines its own smaller, deliberate subset for what it needs). `WigOrder`, `Payment`, and `ClientDocument` exist in `types/index.ts` but are dead code — not imported anywhere — and don't match the real data shape (e.g. `WigOrder.status` is missing `"new"`; `Client.measurements` is typed as an object but is actually a string in Firestore); see REVIEW.md §5. Don't import them, and treat them as unreliable if you read them — they're candidates for deletion later, not in scope here. `businessSettings` holds pricing config (price per kg, exchange rate, profit %) and, like `users`, is identified by the `businessId` itself as the document ID rather than a `businessId` field inside the document — it needs its own Firestore Rules clause, not the generic `resource.data.businessId` one.

**Icons and emoji.** `lucide-react` is the site's icon library, used across most pages (it replaced emoji-as-icons). Any emoji still left in the code (free text, `<option>` labels, spots not yet migrated) is rendered as fixed Twemoji SVG images via `@twemoji/api` rather than as plain text characters, so it looks identical across machines/browsers/OSes — `App.tsx` runs a global `twemoji.parse()` scan on mount plus a `MutationObserver` (debounced via `requestAnimationFrame`) so it also catches emoji appearing later inside inner pages/modals that don't re-render `App.tsx` itself. Note: `twemoji.parse()` mutates the DOM directly, outside React — a known, low-risk source of rare DOM errors if React updates the same node concurrently; not observed in practice.

**Shared input components.** `src/components/common/DateInput.tsx`, `TimeInput.tsx`, and `CustomSelect.tsx` are self-built replacements for native `<input type="date"/"time">` and `<select>`, used for every date/time/select field in the app. Reason: native OS/browser popups (especially on Linux) ignore the field's on-page position and can open in the wrong place; these components compute their own position via `getBoundingClientRect()` and render through `createPortal` to `document.body`, independent of browser/OS popup behavior. Use these for any new date/time/select field instead of the native HTML elements.

**Advanced inventory features.** `HairItem.isRemnantBox` (created via `src/pages/Inventory/CreateRemnantBoxModal.tsx`, consumed in `Inventory.tsx`/`AssignHairModal.tsx`) merges several small hair offcuts into one barcode with a dynamic weighted-average price, including a merge log and per-merge undo. `BulkItem.retailPrice` plus `src/pages/Inventory/QuickRetailSaleModal.tsx` support selling non-production retail products directly from stock.

**Styling:** one CSS file per component/page, colocated and imported directly (e.g. `Clients.tsx` + `Clients.css`) — no CSS-in-JS, no Tailwind, no shared design-system components. `App.css` and `src/index.css` hold global/layout styles.

**Directory layout:**
- `src/pages/<Feature>/` — top-level screens routed from `App.tsx` (Dashboard, Clients, Calendar, Inventory, Calculators, Sales, Expenses, Reports, Settings, Login)
- `src/components/` — shared/reusable pieces: `Sidebar/`, `Header/`, `modals/` (e.g. `AddClientModal`), `orders/` (`NewOrderWizard`), `clients/` (`ClientDrawer`), `common/` (`DateInput`, `TimeInput`, `CustomSelect` — see above)
- `src/services/firebase.ts` — Firebase app/auth/firestore initialization, imported everywhere data access is needed
- `src/types/index.ts` — shared domain interfaces
- `src/utils/` — shared calculation helpers (`hairCost.ts`, `orderProfit.ts`, `orderCreation.ts` — see above)
- `functions/` — separate Cloud Functions codebase, see below

## Cloud Functions (`functions/`)

`functions/` is a fully separate Node/TypeScript codebase from the main SPA — its own `package.json`/`tsconfig.json`, not part of the Vite build. Its purpose is automatic two-way sync with Google Calendar:
- `googleCalendarOAuthCallback` (`functions/src/googleCalendarAuth.ts`) — the OAuth callback, 1st gen (`.runWith(...).https.onRequest`), so it gets a stable, predictable callback URL to register with Google.
- `onAppointmentCreated` / `onAppointmentUpdated` / `onAppointmentDeleted` (`functions/src/googleCalendarSync.ts`) — 2nd-gen Firestore triggers (`onDocumentCreated`/`onDocumentUpdated`/`onDocumentDeleted`) on `appointments`; 2nd gen is required because 1st-gen Firestore triggers don't support this project's `nam5` multi-region database.
- `syncExistingAppointments` (`functions/src/syncExistingAppointments.ts`) — a callable, one-time historical sync for appointments that existed before Google Calendar was connected.

`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are managed in Firebase Secret Manager, not in code (see `functions/src/config.ts`). `firebase.json`/`.firebaserc` at the repo root configure the deploy target. Deploy with `firebase deploy --only functions`.

## Firebase project note

`src/services/firebase.ts` initializes against project `esti-wigs-system`. An older config once referenced project `esti-wigs-portal` in now-deleted stale docs — treat `src/services/firebase.ts` as the source of truth for which Firebase project is live.

## Notes from GEMINI.md

This repo was originally scaffolded/edited in Firebase Studio using Gemini, and has a `GEMINI.md` with agent operating instructions. Relevant parts not already covered above:
- `.idx/dev.nix` is the Firebase Studio workspace config (Node 22, runs `npm run dev -- --port $PORT --host 0.0.0.0` for the preview server, runs `npm i` on workspace create). Not relevant outside that environment.
- If Firebase MCP is needed, the expected `.idx/mcp.json` entry runs `npx -y firebase-tools@latest experimental:mcp`.
