import { InventoryTransactionItem } from "@/lib/api/inventory";
import { ProductCategory, Product, getItemProductCategory } from "@/lib/data";

const LOCAL_STORAGE_KEY = "solarflow_inventory_transactions_v2";

/**
 * Baseline transactions initialized empty
 */
const DEFAULT_BASELINE_TRANSACTIONS: InventoryTransactionItem[] = [];

export function getLocalInventoryTransactions(): InventoryTransactionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load local inventory transactions:", err);
    return [];
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
