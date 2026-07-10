import { RequestStatus } from "./finance-data";

export interface ProductMaster {
  code: number;
  name: string;
  category: string;
}

export const PRODUCT_MASTER: ProductMaster[] = [
  { code: 1, name: "Solar Pump Controller", category: "Pump Equipment" },
  { code: 2, name: "Submersible Solar Pump", category: "Pump Equipment" },
  { code: 3, name: "Surface Solar Pump", category: "Pump Equipment" },
  { code: 4, name: "Solar Panel 550W", category: "Solar Panels" },
  { code: 5, name: "Mounting Structure", category: "Installation Materials" },
  { code: 6, name: "Pump Cable", category: "Accessories" },
  { code: 7, name: "Water Sensor", category: "Accessories" },
  { code: 8, name: "Inverter", category: "Pump Equipment" },
  { code: 9, name: "Pipe Set", category: "Pipes" },
  { code: 10, name: "Junction Box", category: "Accessories" },
];

export interface InventoryRequest {
  id: string;
  productCode: number | string;
  productName: string;
  category: string;
  quantity: number;
  requestedBy: string;
  date: string;
  note: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedDate?: string;
}
