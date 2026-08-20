# SolarFlow Manager - Workspace Guidelines

> **Notice for All Agents:** Follow these UI design, color, and architecture guidelines.

---

## 1. Brand & Colors
- **Brand:** Meseret Mare Solar / Fasil Zelalem (FZ) Trading
- **Primary Hero Banner:** Royal gradient (`bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800`).
- **Core Color Palette:**
  - **Sky Blue:** Pumps, product codes, primary highlights (`#0284c7`)
  - **Amber / Gold:** Pump equipment, controllers, valuation (`#d97706`)
  - **Emerald Green:** Company tools, receipts, dispatches (`#16a34a`)
  - **Purple:** Consumables, expendables (`#7c3aed`)
  - **Rose / Red:** Out-of-stock, alerts (`#dc2626`)

---

## 2. UI Style
- **Cards & Layouts:** Clean light cards (`bg-card border border-border/60 shadow-sm rounded-2xl`).
- **Typography:** High-contrast, clean sans-serif with strong hierarchy.
- **Tables & Modals:** Light theme dialogs (`bg-background text-foreground border-border rounded-2xl`).

---

## 3. Engineering & Functionality
- **Full Connectivity:** No placeholders or dead buttons; all actions wired to state (`useStore()`) and APIs.
- **Offline Reliability:** Instant local store updates with background API sync.
- **Late-Binding Serials:** Warehouse inventory stores pumps by model & quantity only; serials typed during field planning.
- **Build Quality:** `npm run build` must pass with 0 errors.
