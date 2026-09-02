import { apiClient } from "@/lib/api/client";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import { getMasterPumpCategories, getMasterPumpModels } from "@/lib/pump-catalog-importer";
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

export type {
  Account,
  Customer,
  Vendor,
  Invoice,
  Bill,
  Payment,
  Expense,
  JournalEntry,
};

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
  requestCash: async (jobId: string, data: { amount: number; category: string; reason: string; receiptUrl?: string }) => {
    return apiFetch(`/fieldwork/${jobId}/cash-request`, { method: "POST", body: JSON.stringify(data) });
  },
  delete: async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/fieldwork/${id}`, { method: "DELETE" });
    return !!res?.success;
  },
};

export const DEFAULT_DEPARTMENTS = [
  { id: "dept-field", name: "Field Operations", nameAmharic: "የመስክ ስራዎች ዘርፍ", description: "Site surveys, on-site drilling, pump installation, and testing" },
  { id: "dept-finance", name: "Finance & Administration", nameAmharic: "የፋይናንስ እና አስተዳደር", description: "Financial planning, administration, and corporate governance" },
  { id: "dept-accounting", name: "Accounting", nameAmharic: "የሂሳብ ክፍል", description: "Bookkeeping, invoices, tax compliance, and payroll accounting" },
  { id: "dept-mgmt", name: "General Management", nameAmharic: "አጠቃላይ አመራር", description: "Executive leadership and departmental oversight" },
  { id: "dept-inventory", name: "Inventory & Warehouse", nameAmharic: "የእቃ ግምጃ ቤት እና ክምችት", description: "Stock management, parts storage, and replenishment" },
  { id: "dept-logistics", name: "Logistics & Transport", nameAmharic: "ሎጂስቲክስ እና ትራንስፖርት", description: "Vehicle fleet, material transit, and site deliveries" },
  { id: "dept-marketing", name: "Marketing & Grants", nameAmharic: "ማርኬቲንግ እና ድጋፍ", description: "Marketing campaigns, brand strategy, donor relations, and grant proposals" },
  { id: "dept-sales", name: "Sales & Commercial", nameAmharic: "ሽያጭ እና ንግድ", description: "Storefront retail, customer intake, package quotations, and commercial pipeline" },
  { id: "dept-tech", name: "Technical & Engineering", nameAmharic: "የቴክኒክ እና ምህንድስና", description: "Solar pump sizing, engineering design, electrical systems, and technical QA" },
];

export const getDepartmentBilingual = (deptName?: string) => {
  if (!deptName) return { amharic: "አጠቃላይ", english: "General", combined: "General" };
  const matched = DEFAULT_DEPARTMENTS.find(
    (d) => d.name.toLowerCase() === deptName.toLowerCase() || d.nameAmharic.toLowerCase() === deptName.toLowerCase() || d.id === deptName
  );
  if (matched) {
    return {
      amharic: matched.nameAmharic,
      english: matched.name,
      combined: `${matched.nameAmharic} • ${matched.name}`,
    };
  }
  return { amharic: deptName, english: deptName, combined: deptName };
};

export const hrDB = {
  getDepartments: async () => {
    try {
      const data = await apiFetch("/hr/departments");
      if (Array.isArray(data) && data.length > 0) return data;
      return DEFAULT_DEPARTMENTS;
    } catch {
      return DEFAULT_DEPARTMENTS;
    }
  },
  saveDepartment: async (dept: any) => {
    const res = await apiFetch("/hr/departments", { method: "POST", body: JSON.stringify(dept) });
    return !!res?.success;
  },
  deleteDepartment: async (id: string) => {
    const res = await apiFetch(`/hr/departments/${id}`, { method: "DELETE" });
    return !!res?.success;
  },
  getWorkers: async () => {
    try {
      const data = await apiFetch("/hr/workers");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
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
  get360: async (id: string) => apiFetch(`/customers/${id}/360`),
  addNote: async (id: string, note: string) => apiFetch(`/customers/${id}/notes`, { method: "POST", body: JSON.stringify({ note }) }),
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
  getVault: async () => apiFetch("/sync/peachtree/vault"),
};

export const analyticsDB = {
  dashboard: async (company?: string) =>
    apiFetch(`/analytics/dashboard${company ? `?${new URLSearchParams({ company }).toString()}` : ""}`),
  getDashboard: async (company?: string) =>
    apiFetch(`/analytics/dashboard${company ? `?${new URLSearchParams({ company }).toString()}` : ""}`),
};

export const syncDB = {
  status: async (company?: string) =>
    apiFetch(`/sync/status${company ? `?${new URLSearchParams({ company }).toString()}` : ""}`),
};

export const pumpProductsDB = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await apiFetch("/pumps");
      if (Array.isArray(res) && res.length > 0) return res;
    } catch {}
    return getMasterPumpModels();
  },
  getById: async (id: string): Promise<any> => {
    try {
      const res = await apiFetch(`/pumps/${id}`);
      if (res && res.id) return res;
    } catch {}
    return getMasterPumpModels().find((p: any) => p.id === id || p.model === id);
  },
  save: async (pump: any): Promise<boolean> => !!(await apiFetch("/pumps", { method: "POST", body: JSON.stringify(pump) })),
  update: async (id: string, pump: any): Promise<boolean> => !!(await apiFetch(`/pumps/${id}`, { method: "PUT", body: JSON.stringify(pump) })),
  delete: async (id: string): Promise<boolean> => !!(await apiFetch(`/pumps/${id}`, { method: "DELETE" }))?.success,
};

export const pumpCategoriesDB = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await apiFetch("/pump-categories");
      if (Array.isArray(res) && res.length > 0) return res;
    } catch {}
    return getMasterPumpCategories();
  },
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
    }),
  updateDetails: async (id: string, details: any, comment?: string) =>
    apiFetch(`/hierarchy/requests/${id}/details`, {
      method: "PATCH",
      body: JSON.stringify({ details, comment })
    })
};

export const userPresenceDB = {
  getAll: async () => apiFetch("/hierarchy/users-presence"),
};

export const eodReportsDB = {
  getAll: async (date?: string) => apiFetch(`/eod-reports${date ? `?date=${date}` : ""}`),
  create: async (report: any) => apiFetch("/eod-reports", { method: "POST", body: JSON.stringify(report) }),
  forwardToGm: async (reportId: string, summaryNote: string) => apiFetch(`/eod-reports/${reportId}/forward`, { method: "POST", body: JSON.stringify({ summaryNote }) }),
  addComment: async (reportId: string, comment: string) => apiFetch(`/eod-reports/${reportId}/comments`, { method: "POST", body: JSON.stringify({ comment }) }),
};
