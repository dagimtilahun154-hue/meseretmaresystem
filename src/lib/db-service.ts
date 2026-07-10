import { apiClient } from "@/lib/api/client";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import type {
  Account,
  Customer,
  Vendor,
  Invoice,
  Bill,
  Payment,
  Expense,
  JournalEntry,
} from "./finance-hub-store";

async function apiFetch(endpoint: string, options: any = {}) {
  const method = options.method || "GET";
  const data = options.body ? JSON.parse(options.body) : options.data;
  try {
    const response = await apiClient.request({
      url: endpoint,
      method,
      data,
      headers: options.headers,
    });
    return response.data;
  } catch (error: any) {
    const canQueue = method !== "GET" && (!navigator.onLine || !error?.response);
    if (!canQueue) throw error;

    await enqueueOfflineMutation({
      endpoint,
      method,
      payload: data,
      headers: options.headers,
      entityType: options.entityType || endpoint.split("/").filter(Boolean)[0] || "unknown",
      operation: options.operation || method.toLowerCase(),
      company: data?.company || data?.companyCode || data?.entity,
      lastError: error?.message || "Network unavailable",
    });

    return { success: true, queued: true };
  }
}

export interface AppUser {
  id: string;
  username: string;
  password_hash: string;
  role: "manager" | "finance" | "storekeeper" | "fieldwork";
  display_name: string;
  is_active: boolean;
}

export interface DBProduct {
  id: string;
  code?: string | number;
  name: string;
  category: string;
  quantity: number;
  cost_price?: number;
  sell_price?: number;
  unit: string;
  measurement_unit?: string;
  costPrice?: number;
  sellPrice?: number;
  measurementUnit?: string;
}

export interface DBSale {
  id: string;
  date: string;
  customer_name: string;
  payment_method: string;
  bank_name?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note?: string;
  created_by?: string;
  items?: DBSaleItem[];
}

export interface DBSaleItem {
  id?: number;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface DBFieldWork {
  id: string;
  title: string;
  description?: string;
  customer_name?: string;
  location?: string;
  assigned_to?: string;
  status: string;
  priority: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  notes?: string;
}

export const usersDB = {
  getAll: async (): Promise<AppUser[]> => apiFetch("/users"),
};

export const productsDB = {
  getAll: async (): Promise<DBProduct[]> => apiFetch("/products"),
  add: async (product: DBProduct): Promise<DBProduct | null> =>
    apiFetch("/products", { method: "POST", body: JSON.stringify(product) }),
  update: async (product: DBProduct): Promise<DBProduct | null> =>
    apiFetch(`/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) }),
  delete: async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/products/${id}`, { method: "DELETE" });
    return !!res?.success;
  },
};

export const salesDB = {
  getAll: async (): Promise<DBSale[]> => apiFetch("/sales"),
  add: async (sale: DBSale): Promise<{ success: boolean; queued?: boolean }> => {
    const res = await apiFetch("/sales", { method: "POST", body: JSON.stringify(sale) });
    return { success: !!res?.success, queued: !!res?.queued };
  },
};

export const fieldWorkDB = {
  getAll: async (): Promise<DBFieldWork[]> => apiFetch("/fieldwork"),
  add: async (job: DBFieldWork): Promise<boolean> => {
    const res = await apiFetch("/fieldwork", { method: "POST", body: JSON.stringify(job) });
    return !!res?.success;
  },
  update: async (id: string, job: DBFieldWork): Promise<boolean> => {
    const res = await apiFetch(`/fieldwork/${id}`, { method: "PUT", body: JSON.stringify(job) });
    return !!res?.success;
  },
  delete: async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/fieldwork/${id}`, { method: "DELETE" });
    return !!res?.success;
  },
};

export const hrDB = {
  getDepartments: async () => apiFetch("/hr/departments"),
  saveDepartment: async (dept: any) => {
    const res = await apiFetch("/hr/departments", { method: "POST", body: JSON.stringify(dept) });
    return !!res?.success;
  },
  deleteDepartment: async (id: string) => {
    const res = await apiFetch(`/hr/departments/${id}`, { method: "DELETE" });
    return !!res?.success;
  },
  getWorkers: async () => apiFetch("/hr/workers"),
  saveWorker: async (worker: any) => {
    const res = await apiFetch("/hr/workers", { method: "POST", body: JSON.stringify(worker) });
    return !!res?.success;
  },
  deleteWorker: async (id: string) => {
    const res = await apiFetch(`/hr/workers/${id}`, { method: "DELETE" });
    return !!res?.success;
  },
  getSettings: async () => apiFetch("/hr/settings"),
  saveSettings: async (settings: any) => {
    const res = await apiFetch("/hr/settings", { method: "PUT", body: JSON.stringify(settings) });
    return !!res?.success;
  },
  scanAttendance: async (fingerprintId: string) =>
    apiFetch("/hr/attendance/scan", { method: "POST", body: JSON.stringify({ fingerprintId }) }),
  getAttendanceLogs: async (filters: any) => apiFetch(`/hr/attendance/logs?${new URLSearchParams(filters).toString()}`),
};

export const customersDB = {
  getAll: async (): Promise<Customer[]> => apiFetch("/customers"),
  save: async (customer: Customer): Promise<boolean> => !!(await apiFetch("/customers", { method: "POST", body: JSON.stringify(customer) }))?.success,
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/customers/${id}`, { method: "DELETE" }))?.success,
};

export const vendorsDB = {
  getAll: async (): Promise<Vendor[]> => apiFetch("/vendors"),
  save: async (vendor: Vendor): Promise<boolean> => !!(await apiFetch("/vendors", { method: "POST", body: JSON.stringify(vendor) }))?.success,
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/vendors/${id}`, { method: "DELETE" }))?.success,
};

export const accountsDB = {
  getAll: async (): Promise<Account[]> => apiFetch("/accounts"),
  save: async (account: Account): Promise<boolean> => !!(await apiFetch("/accounts", { method: "POST", body: JSON.stringify(account) }))?.success,
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/accounts/${id}`, { method: "DELETE" }))?.success,
};

export const invoicesDB = {
  getAll: async (): Promise<Invoice[]> => apiFetch("/invoices"),
  save: async (invoice: Invoice): Promise<boolean> => !!(await apiFetch("/invoices", { method: "POST", body: JSON.stringify(invoice) }))?.success,
};

export const billsDB = {
  getAll: async (): Promise<Bill[]> => apiFetch("/bills"),
  save: async (bill: Bill): Promise<boolean> => !!(await apiFetch("/bills", { method: "POST", body: JSON.stringify(bill) }))?.success,
};

export const paymentsDB = {
  getAll: async (): Promise<Payment[]> => apiFetch("/payments"),
  save: async (payment: Payment): Promise<boolean> => !!(await apiFetch("/payments", { method: "POST", body: JSON.stringify(payment) }))?.success,
};

export const expensesDB = {
  getAll: async (): Promise<Expense[]> => apiFetch("/expenses"),
  save: async (expense: Expense): Promise<boolean> => !!(await apiFetch("/expenses", { method: "POST", body: JSON.stringify(expense) }))?.success,
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/expenses/${id}`, { method: "DELETE" }))?.success,
};

export const journalDB = {
  getAll: async (): Promise<JournalEntry[]> => apiFetch("/journal"),
  save: async (entry: JournalEntry): Promise<boolean> => !!(await apiFetch("/journal", { method: "POST", body: JSON.stringify(entry) }))?.success,
};

export const inventoryRequestsDB = {
  getAll: async () => apiFetch("/inventory-requests"),
  save: async (request: any) => !!(await apiFetch("/inventory-requests", { method: "POST", body: JSON.stringify(request) }))?.success,
};

export const financeCenterDB = {
  getAll: async (type: string) => apiFetch(`/finance-center/${type}`),
  save: async (type: string, record: any) => !!(await apiFetch(`/finance-center/${type}`, { method: "POST", body: JSON.stringify(record) }))?.success,
  add: async (type: string, record: any) => !!(await apiFetch(`/finance-center/${type}`, { method: "POST", body: JSON.stringify(record) }))?.success,
};

export const peachtreeDB = {
  getImports: async (company?: string) =>
    apiFetch(`/peachtree/imports${company ? `?${new URLSearchParams({ company }).toString()}` : ""}`),
  getImport: async (id: string) => apiFetch(`/peachtree/imports/${id}`),
  upload: async (file: File, company: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("company", company);
    form.append("source", "manual-finance-page");
    try {
      const response = await apiClient.post("/peachtree/imports/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error: any) {
      if (navigator.onLine && error?.response) throw error;
      return { success: false, queued: false, offline: true };
    }
  },
  getSyncedData: async () => apiFetch("/sync/peachtree/data"),
};

export const analyticsDB = {
  dashboard: async (company?: string) =>
    apiFetch(`/analytics/dashboard${company ? `?${new URLSearchParams({ company }).toString()}` : ""}`),
};

export const syncDB = {
  status: async (company?: string) =>
    apiFetch(`/sync/status${company ? `?${new URLSearchParams({ company }).toString()}` : ""}`),
};

export const pumpProductsDB = {
  getAll: async (): Promise<any[]> => apiFetch("/pumps"),
  getById: async (id: string): Promise<any> => apiFetch(`/pumps/${id}`),
  save: async (pump: any): Promise<boolean> => !!(await apiFetch("/pumps", { method: "POST", body: JSON.stringify(pump) })),
  update: async (id: string, pump: any): Promise<boolean> => !!(await apiFetch(`/pumps/${id}`, { method: "PUT", body: JSON.stringify(pump) })),
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/pumps/${id}`, { method: "DELETE" }))?.success,
};

export const pumpCategoriesDB = {
  getAll: async (): Promise<any[]> => apiFetch("/pump-categories"),
  save: async (category: any): Promise<any> => apiFetch("/pump-categories", { method: "POST", body: JSON.stringify(category) }),
  update: async (id: string, category: any): Promise<any> =>
    apiFetch(`/pump-categories/${id}`, { method: "PUT", body: JSON.stringify(category) }),
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/pump-categories/${id}`, { method: "DELETE" }))?.success,
};

export const hierarchyRequestsDB = {
  getAll: async () => apiFetch("/hierarchy/requests"),
  create: async (req: any) => apiFetch("/hierarchy/requests", { method: "POST", body: JSON.stringify(req) }),
  action: async (id: string, action: string, comment?: string) =>
    apiFetch(`/hierarchy/requests/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action, comment })
    })
};

export const userPresenceDB = {
  getAll: async () => apiFetch("/hierarchy/users-presence"),
};

export const eodReportsDB = {
  getAll: async (date?: string) => apiFetch(`/eod-reports${date ? `?date=${date}` : ""}`),
  create: async (report: any) => apiFetch("/eod-reports", { method: "POST", body: JSON.stringify(report) }),
};
