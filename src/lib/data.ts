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

export type ProductCategory = "PUMP" | "PUMP_EQUIPMENT" | "SOLAR_PANEL" | "COMPANY_TOOL" | "WORK_TOOL";

export interface Product {
  id: string;
  code?: string | number;
  name: string;
  category: string;
  productCategory?: ProductCategory;
  quantity: number;
  minStockLevel?: number;
  costPrice: number;
  sellPrice: number;
  unit: string;
  measurementUnit?: string; // m, cm, piece, roll, pack, etc.
  shelfLocation?: string;
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

export const INVENTORY_CATEGORIES: {
  key: ProductCategory;
  label: string;
  icon: string;
  description: string;
  badgeColor: string;
}[] = [
  {
    key: "PUMP",
    label: "Pumps",
    icon: "Droplets",
    description: "Core solar pump units (model + quantity tracked, serial captured at field planning)",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  {
    key: "PUMP_EQUIPMENT",
    label: "Pump Equipment",
    icon: "Zap",
    description: "Model-specific accessories (MPPT controllers, solar panels, dedicated cables)",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    key: "SOLAR_PANEL",
    label: "Solar Panels",
    icon: "Sun",
    description: "Photovoltaic solar panels (mono-crystalline/poly-crystalline modules by wattage)",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  {
    key: "COMPANY_TOOL",
    label: "Company Tools",
    icon: "Wrench",
    description: "Reusable company assets (drills, ladders, multimeters — checked out & returned)",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    key: "WORK_TOOL",
    label: "Work Tools",
    icon: "Package",
    description: "Consumable installation materials (cable ties, glue, tape, generic pipes & screws)",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
];

/**
 * Strict category inference: guarantees pumps never mix with controllers/panels,
 * and pump equipment only includes true accessories and electronics.
 */
export function getItemProductCategory(p?: Partial<Product> | null): ProductCategory {
  if (!p) return "WORK_TOOL";
  if (p.productCategory) return p.productCategory;

  const name = (p.name || "").toLowerCase();
  const cat = (p.category || "").toLowerCase();
  const code = String(p.code || p.id || "").toLowerCase();

  // Check for Solar Panels FIRST
  const isSolarPanel =
    p.productCategory === "SOLAR_PANEL" ||
    name.includes("solar panel") ||
    name.includes("mono solar") ||
    name.includes("pv panel") ||
    cat.includes("solar panels") ||
    code.startsWith("panel-") ||
    code.startsWith("solar-panel");

  if (isSolarPanel) {
    return "SOLAR_PANEL";
  }

  // 1. Check for Equipment / Controllers / Sensors FIRST (ensures "Pump Controller" is NEVER shown under PUMP)
  const isEquipment =
    p.productCategory === "PUMP_EQUIPMENT" ||
    name.includes("controller") ||
    name.includes("mppt") ||
    name.includes("sensor") ||
    name.includes("probe") ||
    name.includes("inverter") ||
    name.includes("bracket") ||
    name.includes("flange") ||
    name.includes("cable joint") ||
    cat.includes("equipment") ||
    cat.includes("accessories") ||
    cat.includes("electronics") ||
    code.startsWith("eq-") ||
    code.startsWith("inv-ctrl");

  if (isEquipment) {
    return "PUMP_EQUIPMENT";
  }

  // 2. Check for Reusable Company Tools
  const isCompanyTool =
    p.productCategory === "COMPANY_TOOL" ||
    name.includes("drill") ||
    name.includes("wrench") ||
    name.includes("multimeter") ||
    name.includes("ladder") ||
    name.includes("crimper") ||
    name.includes("crimping") ||
    name.includes("tester") ||
    cat.includes("company tool") ||
    code.startsWith("tool-");

  if (isCompanyTool) {
    return "COMPANY_TOOL";
  }

  // 3. Check for Pumps (pure pump/motor models only)
  const isPump =
    p.productCategory === "PUMP" ||
    name.includes("pump") ||
    cat.includes("pump") ||
    code.startsWith("pump-") ||
    Boolean(p.model);

  if (isPump && !name.includes("pipe") && !name.includes("cable") && !name.includes("tool") && !name.includes("tape")) {
    return "PUMP";
  }

  // 4. Default to consumable work materials
  return p.productCategory || "WORK_TOOL";
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
