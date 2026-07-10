// Shared data types and mock data for the solar pump management system

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
  region?: string;
  woreda?: string;
  gpsLat?: string;
  gpsLng?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  unit: string;
  measurementUnit?: string; // m, cm, piece, roll, pack, etc.
  image?: string;
  // Sizing Metadata
  brand?: string;
  model?: string;
  productCode?: string;
  pumpType?: "Submersible" | "Surface";
  suitableSources?: ("Borehole" | "River" | "Pond")[];
  maxHead?: number;
  maxFlow?: number;
  powerWatt?: number;
  voltage?: string;
  controllerType?: string;
  recommendedSolarPanelWatt?: number;
  outletSize?: string;
  performanceTable?: { head: number; flow: number }[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface Sale {
  id: string;
  date: string;
  customer: Customer;
  items: SaleItem[];
  totalSell: number;
  totalCost: number;
  profit: number;
  vatIncluded: boolean;
  vatAmount: number;
  netAmount: number;
  paymentMethod: "Cash" | "Bank" | "Telebirr";
  bankName?: string;
}

export const MEASUREMENT_UNITS = [
  "Piece", "Pack", "Roll", "Set", "Meter (m)", "Centimeter (cm)", "Kilogram (kg)", "Liter (L)", "Box",
];

export const PRODUCT_CATEGORIES = [
  "Pump Equipment",
  "Solar Panels",
  "Installation Materials",
  "HDPE Fittings",
  "GS Fittings",
  "Foot Valves",
  "Accessories",
  "Pipes",
];

// POS category groups for easier selection
export const POS_CATEGORY_GROUPS = [
  {
    group: "Pump Equipment",
    categories: ["Pump Equipment", "Solar Panels"],
  },
  {
    group: "Installation Materials",
    categories: ["Installation Materials", "Pipes"],
  },
  {
    group: "Accessories & Fittings",
    categories: ["HDPE Fittings", "GS Fittings", "Foot Valves", "Accessories"],
  },
];

export const ETHIOPIAN_BANKS = [
  "Commercial Bank of Ethiopia",
  "Awash Bank",
  "Dashen Bank",
  "Bank of Abyssinia",
  "Hibret Bank",
  "Wegagen Bank",
  "Cooperative Bank of Oromia",
  "Abay Bank",
  "Bunna Bank",
  "Nib International Bank",
  "Zemen Bank",
  "Enat Bank",
  "Oromia Bank",
  "Amhara Bank",
  "Tsehay Bank",
  "Siinqee Bank",
];

export const ETHIOPIAN_REGIONS = [
  "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa",
  "Gambela", "Harari", "Oromia", "Sidama", "Somali",
  "South Ethiopia", "South West Ethiopia", "SNNPR", "Tigray",
];

export const VAT_RATE = 0.15;

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

export const getStockStatus = (quantity: number) => {
  if (quantity <= 0) return { label: "Out of Stock", color: "destructive" as const };
  if (quantity <= 5) return { label: "Low Stock", color: "warning" as const };
  return { label: "In Stock", color: "success" as const };
};
