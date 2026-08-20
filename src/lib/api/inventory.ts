import { apiClient } from "./client";
import { Product, ProductCategory } from "../data";

export interface InventoryDashboardData {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  pendingReleasesCount: number;
  categoryCounts: Record<string, { count: number; qty: number; value: number }>;
  recentTransactions: InventoryTransactionItem[];
  lowStockItems: {
    id: string;
    code?: string;
    name: string;
    category?: string;
    quantity: number;
    minStockLevel: number;
    unit: string;
  }[];
}

export interface InventoryTransactionItem {
  id: string;
  productId?: string;
  productCode?: string;
  productName: string;
  category: ProductCategory;
  transactionType: "RECEIVE" | "ISSUE" | "RETURN" | "ADJUSTMENT" | "BOUGHT" | "WRITE_OFF";
  quantity: number;
  unit?: string;
  unitPrice: number;
  serialNumber?: string;
  fieldWorkJobId?: string;
  reference?: string;
  performedBy?: string;
  notes?: string;
  createdAt: string;
  product?: { id: string; name: string; code?: string; category?: string };
}

export interface PendingReleaseJob {
  id: string;
  title?: string;
  customerName?: string;
  location?: string;
  assignedTo?: string;
  status: string;
  materials?: any[];
  plannedEquipment?: any[];
  plannedCompanyTools?: string[];
  payload?: any;
}

export interface StockCountItemData {
  id: string;
  stockCountId: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  systemQty: number;
  countedQty: number;
  variance: number;
  unit?: string;
  notes?: string;
}

export interface StockCountRecord {
  id: string;
  category?: ProductCategory;
  status: "IN_PROGRESS" | "SUBMITTED" | "APPROVED";
  countedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  items: StockCountItemData[];
}

export const inventoryApi = {
  getDashboard: async (): Promise<InventoryDashboardData> => {
    const res = await apiClient.get("/inventory/dashboard");
    return res.data;
  },

  getCatalog: async (category?: string, search?: string): Promise<Product[]> => {
    const res = await apiClient.get("/inventory/catalog", {
      params: { category, search },
    });
    return res.data;
  },

  createProduct: async (product: Partial<Product> & { productCategory: ProductCategory }): Promise<Product> => {
    const res = await apiClient.post("/inventory/products", product);
    return res.data;
  },

  receiveStock: async (payload: {
    productId: string;
    quantity: number;
    costPrice?: number;
    reference?: string;
    notes?: string;
  }): Promise<Product> => {
    const res = await apiClient.post("/inventory/products/receive", payload);
    return res.data;
  },

  updateProduct: async (id: string, payload: Partial<Product>): Promise<Product> => {
    const res = await apiClient.patch(`/inventory/products/${id}`, payload);
    return res.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/products/${id}`);
  },

  getReleases: async (): Promise<PendingReleaseJob[]> => {
    const res = await apiClient.get("/inventory/releases");
    return res.data;
  },

  confirmRelease: async (
    jobId: string,
    payload: {
      items: {
        productId?: string;
        productCode?: string;
        name: string;
        category: ProductCategory;
        quantity: number;
        unit?: string;
        serialNumber?: string;
        source: "FROM_STOCK" | "BOUGHT";
      }[];
      companyTools?: string[];
      notes?: string;
    }
  ) => {
    const res = await apiClient.post(`/inventory/releases/${jobId}/confirm`, payload);
    return res.data;
  },

  getTransactions: async (type?: string, category?: string, limit = 100): Promise<InventoryTransactionItem[]> => {
    const res = await apiClient.get("/inventory/transactions", {
      params: { type, category, limit },
    });
    return res.data;
  },

  getAudits: async (): Promise<StockCountRecord[]> => {
    const res = await apiClient.get("/inventory/audits");
    return res.data;
  },

  createAudit: async (payload: { category?: ProductCategory; countedBy: string; notes?: string }): Promise<StockCountRecord> => {
    const res = await apiClient.post("/inventory/audits", payload);
    return res.data;
  },

  submitAudit: async (
    id: string,
    payload: {
      items: { id: string; productId: string; countedQty: number; notes?: string }[];
      approvedBy?: string;
      notes?: string;
    }
  ): Promise<StockCountRecord> => {
    const res = await apiClient.post(`/inventory/audits/${id}/submit`, payload);
    return res.data;
  },

  getPumpEquipmentMap: async (pumpModel: string) => {
    const res = await apiClient.get(`/inventory/pump-equipment-map/${encodeURIComponent(pumpModel)}`);
    return res.data;
  },

  seedCatalog: async () => {
    const res = await apiClient.post("/inventory/seed-catalog");
    return res.data;
  },
};
