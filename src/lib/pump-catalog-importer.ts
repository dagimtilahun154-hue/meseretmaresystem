import { Product, ProductCategory } from "@/lib/data";
import extractedData from "../../extracted_pumps_data.json";

export interface MasterCatalogImportResult {
  addedPumps: number;
  addedEquipment: number;
  addedCompanyTools: number;
  addedWorkTools: number;
  totalAdded: number;
  newProducts: Product[];
}

// Standard Company Tools to register if missing
const STANDARD_COMPANY_TOOLS: Partial<Product>[] = [
  {
    id: "TOOL-MAKITA-HR2470",
    code: "TOOL-DRILL-01",
    name: "Makita Rotary Hammer Drill 780W (HR2470)",
    category: "COMPANY_TOOL",
    productCategory: "COMPANY_TOOL",
    quantity: 3,
    minStockLevel: 1,
    costPrice: 14500,
    sellPrice: 18000,
    unit: "Asset",
    shelfLocation: "Tool Rack A-01",
    brand: "Makita",
    model: "HR2470",
  },
  {
    id: "TOOL-WRENCH-SET",
    code: "TOOL-WRN-02",
    name: "Heavy-Duty Pipe Wrench Set (14\", 18\", 24\")",
    category: "COMPANY_TOOL",
    productCategory: "COMPANY_TOOL",
    quantity: 4,
    minStockLevel: 2,
    costPrice: 4800,
    sellPrice: 6500,
    unit: "Asset",
    shelfLocation: "Tool Rack A-02",
    brand: "Total Tools",
    model: "THT171186",
  },
  {
    id: "TOOL-FLUKE-302",
    code: "TOOL-MTR-03",
    name: "Fluke 302+ Digital AC/DC Clamp Multimeter",
    category: "COMPANY_TOOL",
    productCategory: "COMPANY_TOOL",
    quantity: 2,
    minStockLevel: 1,
    costPrice: 9500,
    sellPrice: 12000,
    unit: "Asset",
    shelfLocation: "Electronics Lab B-01",
    brand: "Fluke",
    model: "302+",
  },
  {
    id: "TOOL-MC4-CRIMPER",
    code: "TOOL-CRIMP-04",
    name: "Solar PV MC4 Crimping & Stripping Tool Kit",
    category: "COMPANY_TOOL",
    productCategory: "COMPANY_TOOL",
    quantity: 5,
    minStockLevel: 2,
    costPrice: 3200,
    sellPrice: 4500,
    unit: "Asset",
    shelfLocation: "Tool Rack A-03",
    brand: "IWISS",
    model: "A-2546B",
  },
  {
    id: "TOOL-ALUM-LADDER",
    code: "TOOL-LDR-05",
    name: "Telescopic Aluminum Extension Ladder (5.8m)",
    category: "COMPANY_TOOL",
    productCategory: "COMPANY_TOOL",
    quantity: 2,
    minStockLevel: 1,
    costPrice: 16000,
    sellPrice: 21000,
    unit: "Asset",
    shelfLocation: "Heavy Bay C-01",
    brand: "HeavyDuty",
    model: "TL-580",
  },
];

// Standard Consumable Work Materials to register if missing
const STANDARD_WORK_TOOLS: Partial<Product>[] = [
  {
    id: "MAT-CABLE-6MM-RED",
    code: "MAT-CBL-6R",
    name: "Solar DC Cable 6mm² - UV Resistant (Red)",
    category: "WORK_TOOL",
    productCategory: "WORK_TOOL",
    quantity: 500,
    minStockLevel: 100,
    costPrice: 120,
    sellPrice: 165,
    unit: "Meter",
    shelfLocation: "Cable Spool Bay C-03",
    brand: "Top Cable",
  },
  {
    id: "MAT-CABLE-6MM-BLK",
    code: "MAT-CBL-6B",
    name: "Solar DC Cable 6mm² - UV Resistant (Black)",
    category: "WORK_TOOL",
    productCategory: "WORK_TOOL",
    quantity: 500,
    minStockLevel: 100,
    costPrice: 120,
    sellPrice: 165,
    unit: "Meter",
    shelfLocation: "Cable Spool Bay C-04",
    brand: "Top Cable",
  },
  {
    id: "MAT-MC4-PAIR",
    code: "MAT-MC4-CONN",
    name: "MC4 Solar Waterproof Connectors (Male/Female Pair)",
    category: "WORK_TOOL",
    productCategory: "WORK_TOOL",
    quantity: 120,
    minStockLevel: 30,
    costPrice: 65,
    sellPrice: 95,
    unit: "Pair",
    shelfLocation: "Bin D-12",
    brand: "Staubli",
  },
  {
    id: "MAT-HEATSHRINK-KIT",
    code: "MAT-SPLICE-KIT",
    name: "Submersible Waterproof Splicing Heat-Shrink Kit (4-Core)",
    category: "WORK_TOOL",
    productCategory: "WORK_TOOL",
    quantity: 45,
    minStockLevel: 15,
    costPrice: 350,
    sellPrice: 500,
    unit: "Kit",
    shelfLocation: "Bin D-08",
    brand: "3M Scotchcast",
  },
  {
    id: "MAT-TEFLON-TAPE",
    code: "MAT-TEFLON",
    name: "Heavy Duty PTFE Teflon Thread Seal Tape (19mm x 15m)",
    category: "WORK_TOOL",
    productCategory: "WORK_TOOL",
    quantity: 80,
    minStockLevel: 20,
    costPrice: 45,
    sellPrice: 70,
    unit: "Roll",
    shelfLocation: "Bin D-02",
  },
  {
    id: "MAT-HDPE-PIPE-32",
    code: "MAT-HDPE-32",
    name: "HDPE Polyethylene Drop Pipe 32mm PN16 (100m Roll)",
    category: "WORK_TOOL",
    productCategory: "WORK_TOOL",
    quantity: 6,
    minStockLevel: 2,
    costPrice: 8500,
    sellPrice: 11500,
    unit: "Roll",
    shelfLocation: "Pipe Yard Yard-01",
    brand: "National Pipes",
  },
];

/**
 * Extracts and compiles all DIFFUL and REDBUD pumps and their compatible equipment
 * into standard Product items for warehouse inventory.
 */
export function generateMasterCatalogProducts(existingProducts: Product[] = []): MasterCatalogImportResult {
  const existingCodes = new Set(existingProducts.map((p) => String(p.code || p.id || "").toLowerCase()));
  const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));

  const newProducts: Product[] = [];
  let addedPumps = 0;
  let addedEquipment = 0;
  let addedCompanyTools = 0;
  let addedWorkTools = 0;

  const data = extractedData as any;
  const pumpsList: any[] = data.pumps || [];

  // 1. Process Master Pumps
  pumpsList.forEach((p) => {
    const brand = (p.brand || (p.model?.startsWith("4SDC") ? "REDBUD" : "DIFFUL")).toUpperCase();
    
    // Only import DIFFUL and REDBUD models (strictly skip any other brands)
    if (brand !== "DIFFUL" && brand !== "REDBUD") return;

    const pumpCode = `PUMP-${p.model.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const pumpName = `${brand} ${p.model} (${p.power || ""}${p.voltage ? `, ${p.voltage}` : ""})`.trim();

    if (!existingCodes.has(pumpCode.toLowerCase()) && !existingNames.has(pumpName.toLowerCase())) {
      existingCodes.add(pumpCode.toLowerCase());
      existingNames.add(pumpName.toLowerCase());

      const product: Product = {
        id: `PRD-${pumpCode}`,
        code: pumpCode,
        name: pumpName,
        category: p.firstCategory || "Solar Water Pump",
        productCategory: "PUMP" as ProductCategory,
        quantity: 0, // Starts at 0 until Storekeeper receives physical stock
        minStockLevel: 2,
        costPrice: Number(p.price || 12000),
        sellPrice: Number(p.price ? p.price * 1.3 : 16000),
        unit: "Piece",
        shelfLocation: brand === "DIFFUL" ? "Bay P-DIFFUL" : "Bay P-REDBUD",
        model: p.model,
        brand,
      };

      newProducts.push(product);
      addedPumps++;
    }

    // 2. Process Compatible Pump Equipment
    const equipmentList = p.equipment || [];
    equipmentList.forEach((eq: any) => {
      const eqCode = String(eq.productId || `EQ-${eq.name.replace(/[^a-zA-Z0-9]/g, "-")}`);
      const eqName = eq.name || "Compatible Pump Equipment";

      if (!existingCodes.has(eqCode.toLowerCase()) && !existingNames.has(eqName.toLowerCase())) {
        existingCodes.add(eqCode.toLowerCase());
        existingNames.add(eqName.toLowerCase());

        const eqProduct: Product = {
          id: `PRD-${eqCode}`,
          code: eqCode,
          name: eqName,
          category: "Pump Accessories & Electronics",
          productCategory: "PUMP_EQUIPMENT" as ProductCategory,
          quantity: 0, // Starts at 0 until storekeeper receives units
          minStockLevel: 3,
          costPrice: Number(eq.cost || eq.price || 3500),
          sellPrice: Number(eq.price ? eq.price * 1.25 : 5000),
          unit: eq.unit || "Piece",
          shelfLocation: eqName.toLowerCase().includes("controller")
            ? "Shelf E-CTRL"
            : eqName.toLowerCase().includes("panel")
            ? "Panel Rack E-PV"
            : "Shelf E-ACC",
          brand,
        };

        newProducts.push(eqProduct);
        addedEquipment++;
      }
    });
  });

  // 3. Process Pre-defined General Inventory Products from JSON
  const inventoryProducts: any[] = data.inventory_products || [];
  inventoryProducts.forEach((inv) => {
    const invCode = String(inv.code || inv.id);
    const invName = inv.name;

    if (!existingCodes.has(invCode.toLowerCase()) && !existingNames.has(invName.toLowerCase())) {
      existingCodes.add(invCode.toLowerCase());
      existingNames.add(invName.toLowerCase());

      const cat: ProductCategory =
        inv.category?.toLowerCase().includes("tool")
          ? "COMPANY_TOOL"
          : inv.category?.toLowerCase().includes("panel") || inv.category?.toLowerCase().includes("controller")
          ? "PUMP_EQUIPMENT"
          : "WORK_TOOL";

      const invProduct: Product = {
        id: `PRD-${invCode}`,
        code: invCode,
        name: invName,
        category: inv.category || "General Inventory",
        productCategory: cat,
        quantity: Number(inv.quantity) || 0,
        minStockLevel: 5,
        costPrice: Number(inv.costPrice) || 0,
        sellPrice: Number(inv.sellPrice) || 0,
        unit: inv.unit || inv.measurementUnit || "Piece",
        shelfLocation: "General Bay G-01",
      };

      newProducts.push(invProduct);
      if (cat === "COMPANY_TOOL") addedCompanyTools++;
      else if (cat === "PUMP_EQUIPMENT") addedEquipment++;
      else addedWorkTools++;
    }
  });

  // 4. Register Standard Company Tools
  STANDARD_COMPANY_TOOLS.forEach((tool) => {
    const code = String(tool.code || tool.id);
    if (!existingCodes.has(code.toLowerCase()) && !existingNames.has(tool.name!.toLowerCase())) {
      existingCodes.add(code.toLowerCase());
      existingNames.add(tool.name!.toLowerCase());

      newProducts.push({
        id: tool.id || `PRD-${code}`,
        code,
        name: tool.name!,
        category: "Company Equipment & Tools",
        productCategory: "COMPANY_TOOL",
        quantity: tool.quantity || 1,
        minStockLevel: tool.minStockLevel || 1,
        costPrice: tool.costPrice || 0,
        sellPrice: tool.sellPrice || 0,
        unit: tool.unit || "Asset",
        shelfLocation: tool.shelfLocation || "Tool Room",
        brand: tool.brand,
        model: tool.model,
      });
      addedCompanyTools++;
    }
  });

  // 5. Register Standard Consumables / Work Tools
  STANDARD_WORK_TOOLS.forEach((mat) => {
    const code = String(mat.code || mat.id);
    if (!existingCodes.has(code.toLowerCase()) && !existingNames.has(mat.name!.toLowerCase())) {
      existingCodes.add(code.toLowerCase());
      existingNames.add(mat.name!.toLowerCase());

      newProducts.push({
        id: mat.id || `PRD-${code}`,
        code,
        name: mat.name!,
        category: "Installation Consumables & Pipes",
        productCategory: "WORK_TOOL",
        quantity: mat.quantity || 10,
        minStockLevel: mat.minStockLevel || 5,
        costPrice: mat.costPrice || 0,
        sellPrice: mat.sellPrice || 0,
        unit: mat.unit || "Piece",
        shelfLocation: mat.shelfLocation || "Consumables Rack",
        brand: mat.brand,
      });
      addedWorkTools++;
    }
  });

  return {
    addedPumps,
    addedEquipment,
    addedCompanyTools,
    addedWorkTools,
    totalAdded: newProducts.length,
    newProducts,
  };
}

/**
 * Returns all master categories from extracted_pumps_data.json
 */
export function getMasterPumpCategories() {
  const data = extractedData as any;
  return (data.categories || []).map((cat: any, index: number) => ({
    id: `cat-${cat.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
    name: cat.name,
    description: cat.description || `${cat.name} solar pump models.`,
    icon: (cat.icon || "droplets").toLowerCase(),
    sortOrder: cat.sortOrder || index + 1,
    persisted: true,
  }));
}

/**
 * Returns all master DIFFUL & REDBUD pump models with normalized performance data, technical specs & equipment
 */
export function getMasterPumpModels() {
  const data = extractedData as any;
  return (data.pumps || []).map((p: any) => {
    let perf = p.performanceData;
    if (typeof perf === "string") {
      try {
        perf = JSON.parse(perf);
      } catch {
        perf = [];
      }
    }
    let tech = p.technicalData;
    if (typeof tech === "string") {
      try {
        tech = JSON.parse(tech);
      } catch {
        tech = [];
      }
    }
    let eq = p.equipment;
    if (typeof eq === "string") {
      try {
        eq = JSON.parse(eq);
      } catch {
        eq = [];
      }
    }

    const brand = (p.brand || (p.model?.startsWith("4SDC") ? "REDBUD" : "DIFFUL")).toUpperCase();

    return {
      ...p,
      brand,
      status: p.status || "Published",
      performanceData: Array.isArray(perf) ? perf : [],
      technicalData: Array.isArray(tech) ? tech : [],
      equipment: Array.isArray(eq) ? eq : [],
    };
  });
}

