import { ProductCategory } from "./data";

export type MaterialSource = "FROM_STOCK" | "BOUGHT";

export interface FieldWorkEquipment {
  productId?: string;
  productCode?: string;
  name: string;
  category?: ProductCategory;
  serialNumber?: string;
  quantityTaken: number;
  quantityReturned: number;
  quantityUsed: number;
  unit: string;
  unitPrice?: number;
  source?: MaterialSource;
}

export interface PlannedMaterialItem {
  id?: string;
  productId?: string;
  productCode?: string;
  name: string;
  category: ProductCategory;
  serialNumber?: string;
  quantity: number;
  unit: string;
  price: number;
  source: MaterialSource;
  availableStock?: number;
}

export interface FieldWorker {
  name: string;
  id: string;
  behaviorRating: 1 | 2 | 3 | 4 | 5;
  perDiem: number | "";
  payment: number | "";
}

export interface ReturnForm {
  id: string;
  fieldWorkId: string;
  workerName: string;
  date: string;
  returnedMaterials: { productId?: string; name: string; quantity: number; condition: string }[];
  comments: string;
  otherNotes: string;
  status: "pending" | "reviewed" | "approved";
}

export interface DailyReport {
  id: string;
  date: string | Date;
  content: string;
  submittedBy: string;
  forwardedToGm: boolean;
  forwardedAt?: string | Date | null;
}

export interface FieldWork {
  id: string;
  title?: string;
  startDate: string;
  endDate: string;
  workers: FieldWorker[];
  pumpModel: string;
  pumpSerial?: string;
  pumpSource?: MaterialSource;
  location: string;
  customerName?: string;
  assignedTo?: string;
  status: "pending" | "planning" | "accepted" | "submitted_tm" | "checked_tm" | "approved_gm" | "Approved and ready to go" | "completed_ttl" | "completed" | "done" | string;
  equipment: FieldWorkEquipment[];
  companyTools?: string[];
  materials?: PlannedMaterialItem[];
  notes: string;
  returnForms?: ReturnForm[];
  saleId?: string;
  fuelAmount?: number;
  fuelPrice?: number;
  dailyReports?: DailyReport[];
  returnsApproved?: boolean;
  completedDate?: string;
  payload?: Record<string, any>;
}

export const BEHAVIOR_LABELS: Record<number, string> = {
  1: "Very Poor",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent",
};
