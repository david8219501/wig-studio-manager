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

**Firestore access is inline in components**, not behind a service/repository layer. Pages (`src/pages/*/*.tsx`) and modals (`src/components/modals/`, `src/components/orders/`) import `db`/`auth` from `src/services/firebase.ts` directly and call `getDocs`/`onSnapshot`/`addDoc`/`setDoc`/`deleteDoc` themselves. Keep new features consistent with this pattern unless deliberately introducing an abstraction layer.

**Firestore collections in use:** `users`, `clients`, `orders`, `appointments`, `hairItems`, `bulkItems`, `expenses`. Domain types for these live in `src/types/index.ts` (`Client`, `WigOrder`, `HairItem`, `BulkItem`, `Payment`, `ClientDocument`) — note some pages (e.g. `Clients.tsx`) define their own local `Client`-like interface shaped to that page's Firestore fields rather than importing from `types/index.ts`; check both when changing a shape.

**Styling:** one CSS file per component/page, colocated and imported directly (e.g. `Clients.tsx` + `Clients.css`) — no CSS-in-JS, no Tailwind, no shared design-system components. `App.css` and `src/index.css` hold global/layout styles.

**Directory layout:**
- `src/pages/<Feature>/` — top-level screens routed from `App.tsx` (Dashboard, Clients, Calendar, Inventory, Calculators, Sales, Expenses, Reports, Settings, Login)
- `src/components/` — shared/reusable pieces: `Sidebar/`, `Header/`, `modals/` (e.g. `AddClientModal`), `orders/` (`NewOrderWizard`), `clients/` (`ClientDrawer`)
- `src/services/firebase.ts` — Firebase app/auth/firestore initialization, imported everywhere data access is needed
- `src/types/index.ts` — shared domain interfaces

## Firebase project note

`src/services/firebase.ts` initializes against project `esti-wigs-system`. This differs from an older config referenced in stale docs (`key_files_preview.txt`, project `esti-wigs-portal`) — treat `src/services/firebase.ts` as the source of truth for which Firebase project is live.

`key_files_preview.txt` and `project_structure.txt` at the repo root are stale snapshots from an earlier state of the project (e.g. they show a pre-auth `App.tsx` and an old `Clients.tsx`) — don't treat them as current; read the actual source files instead.

## Notes from GEMINI.md

This repo was originally scaffolded/edited in Firebase Studio using Gemini, and has a `GEMINI.md` with agent operating instructions. Relevant parts not already covered above:
- `.idx/dev.nix` is the Firebase Studio workspace config (Node 22, runs `npm run dev -- --port $PORT --host 0.0.0.0` for the preview server, runs `npm i` on workspace create). Not relevant outside that environment.
- If Firebase MCP is needed, the expected `.idx/mcp.json` entry runs `npx -y firebase-tools@latest experimental:mcp`.
