export interface FieldWorkEquipment {
  productId?: string;
  name: string;
  quantityTaken: number;
  quantityReturned: number;
  quantityUsed: number;
  unit: string;
}

export interface FieldWorker {
  name: string;
  id: string;
  behaviorRating: 1 | 2 | 3 | 4 | 5;
  perDiem: number;
  payment: number;
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

export interface FieldWork {
  id: string;
  startDate: string;
  endDate: string;
  workers: FieldWorker[];
  pumpModel: string;
  location: string;
  status: "in-progress" | "completed";
  equipment: FieldWorkEquipment[];
  notes: string;
  returnForms?: ReturnForm[];
  saleId?: string;
  fuelAmount?: number;
  fuelPrice?: number;
}

export const BEHAVIOR_LABELS: Record<number, string> = {
  1: "Very Poor",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent",
};
