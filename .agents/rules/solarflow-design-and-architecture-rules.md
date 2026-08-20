# SolarFlow Manager - UI Style & Architecture Guidelines

> **System Scope:** Applies to all AI agents performing design, UI styling, and full-stack development in this workspace.

---

## 1. Brand & Color Palette

- **Brand:** Meseret Mare Solar / Fasil Zelalem (FZ) Trading (SolarFlow Manager ERP)
- **Primary Hero Gradients:** Royal blue-to-purple header (`bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800`).
- **Core Accent Colors:**
  - **Blue / Sky (`#0284c7`):** Primary brand actions, solar pump models, code tags.
  - **Amber / Gold (`#d97706`):** Pump electrical equipment, MPPT controllers, financial valuation.
  - **Emerald / Green (`#16a34a`):** Company assets, successful dispatches, stock inbound receipts.
  - **Purple / Indigo (`#7c3aed`):** Consumables, expendables, trip logistics.
  - **Rose / Red (`#dc2626`):** Out of stock, stock issues, write-offs.

---

## 2. UI Style & Layout Guidelines

- **Theme Mode:** Clean, high-contrast light theme with dark mode support (`bg-background text-foreground`).
- **Containers & Cards:** Clean rounded cards (`bg-card border border-border/60 shadow-sm rounded-2xl`).
- **Typography:** Modern, crisp sans-serif with high-contrast text and clear font-weight hierarchy (`font-bold`, `font-extrabold`).
- **Tables & Lists:** Subtle borders (`border-border/40`), soft gray headers (`bg-muted/40 text-muted-foreground`), and responsive hover highlights (`hover:bg-muted/30`).
- **Dialogs & Modals:** Light theme dialog overlays with clean rounded corners (`rounded-2xl bg-background border-border shadow-2xl`).

---

## 3. Functional Integrity & End-to-End Connectivity

- **Zero Dead Code:** Every button, tab, modal, and filter must be fully wired and functional.
- **Dual-Layer Store Resilience:** Every write action must update the local client state (`useStore()`) immediately and sync with the backend API, ensuring the app remains 100% operational online and offline.
- **Late-Binding Serial Philosophy:** Warehouse inventory tracks pumps by **Model + Qty only**. Serial numbers are entered during field work planning.
- **Quality Assurance:** Always verify that `npm run build` exits with **0 errors** before completing tasks.
