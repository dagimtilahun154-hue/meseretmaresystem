import { InventoryTransactionItem } from "@/lib/api/inventory";
import { ProductCategory, Product, getItemProductCategory } from "@/lib/data";

const LOCAL_STORAGE_KEY = "solarflow_inventory_transactions_v2";

/**
 * Initial sample baseline transactions so the ledger is active from day 1
 */
const DEFAULT_BASELINE_TRANSACTIONS: InventoryTransactionItem[] = [
  {
    id: "TX-INIT-001",
    productId: "PRD-PUMP-4SDC3.0-30-24-300",
    productCode: "PUMP-4SDC3.0-30-24-300",
    productName: "REDBUD 4SDC3.0/30-24/300 (300W, 24V)",
    category: "PUMP",
    transactionType: "RECEIVE",
    quantity: 10,
    unit: "Piece",
    unitPrice: 12000,
    reference: "PO-DIFFUL-2026-01",
    performedBy: "Store Keeper",
    notes: "Initial supplier container delivery - batch inspected",
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
  },
  {
    id: "TX-INIT-002",
    productId: "EQ-CTRL-24V-300W",
    productCode: "EQ-CTRL-24V-300W",
    productName: "Redbud 24V MPPT Solar Controller (300W)",
    category: "PUMP_EQUIPMENT",
    transactionType: "RECEIVE",
    quantity: 15,
    unit: "Piece",
    unitPrice: 4200,
    reference: "PO-DIFFUL-2026-01",
    performedBy: "Store Keeper",
    notes: "Controller shipment received in warehouse",
    createdAt: new Date(Date.now() - 3600 * 1000 * 46).toISOString(),
  },
  {
    id: "TX-INIT-003",
    productId: "TOOL-MAKITA-HR2470",
    productCode: "TOOL-DRILL-01",
    productName: "Makita Rotary Hammer Drill 780W (HR2470)",
    category: "COMPANY_TOOL",
    transactionType: "RECEIVE",
    quantity: 3,
    unit: "Asset",
    unitPrice: 14500,
    reference: "ASSET-REG-01",
    performedBy: "Store Keeper",
    notes: "Registered company installation tools",
    createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
  },
  {
    id: "TX-INIT-004",
    productId: "MAT-CABLE-6MM-RED",
    productCode: "MAT-CBL-6R",
    productName: "Solar DC Cable 6mm² - UV Resistant (Red)",
    category: "WORK_TOOL",
    transactionType: "RECEIVE",
    quantity: 500,
    unit: "Meter",
    unitPrice: 120,
    reference: "PO-CBL-992",
    performedBy: "Store Keeper",
    notes: "Spools received into cable bay C-03",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
];

export function getLocalInventoryTransactions(): InventoryTransactionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_BASELINE_TRANSACTIONS));
      return DEFAULT_BASELINE_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BASELINE_TRANSACTIONS;
  } catch (err) {
    console.warn("Failed to load local inventory transactions:", err);
    return DEFAULT_BASELINE_TRANSACTIONS;
  }
}

export function recordLocalInventoryTransaction(
  tx: Omit<InventoryTransactionItem, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): InventoryTransactionItem {
  const newTx: InventoryTransactionItem = {
    ...tx,
    id: tx.id || `TX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    createdAt: tx.createdAt || new Date().toISOString(),
  };

  try {
    const existing = getLocalInventoryTransactions();
    const updated = [newTx, ...existing.filter((item) => item.id !== newTx.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist local inventory transaction:", err);
  }

  return newTx;
}

export function mergeInventoryTransactions(
  remote: InventoryTransactionItem[] = [],
  local: InventoryTransactionItem[] = []
): InventoryTransactionItem[] {
  const map = new Map<string, InventoryTransactionItem>();

  // Add local first
  local.forEach((tx) => {
    if (tx && tx.id) map.set(tx.id, tx);
  });

  // Overwrite or add remote
  remote.forEach((tx) => {
    if (tx && tx.id) map.set(tx.id, tx);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
