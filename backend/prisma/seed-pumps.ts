import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding pumps data...");

  const dataPath = path.join(__dirname, "../../extracted_pumps_data.json");
  if (!fs.existsSync(dataPath)) {
    console.error("extracted_pumps_data.json not found at", dataPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // 1. Clear existing
  console.log("Removing existing pump data...");
  await prisma.pumpProduct.deleteMany({});
  await prisma.pumpCategory.deleteMany({});
  
  // Also clear generated pump inventory products to avoid duplicates
  // They are prefixed with INV-MOTOR-, INV-CTRL-, etc.
  await prisma.product.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "INV-MOTOR-" } },
        { id: { startsWith: "INV-CTRL-" } },
        { id: { startsWith: "SOLAR-PANEL-" } },
        { id: { startsWith: "CABLE-" } },
        { id: { startsWith: "HDPE-PIPE-" } },
        { id: "ACCESSORY-KIT" },
        { id: "AC-CONTROL-BOX" },
      ]
    }
  });

  // 2. Insert Categories
  console.log(`Inserting ${data.categories.length} pump categories...`);
  for (const cat of data.categories) {
    await prisma.pumpCategory.create({
      data: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      }
    });
  }

  // 3. Insert Inventory Products
  if (data.inventory_products) {
    console.log(`Inserting ${data.inventory_products.length} inventory products...`);
    for (const prod of data.inventory_products) {
      await prisma.product.upsert({
        where: { id: prod.id },
        update: {},
        create: {
          id: prod.id,
          code: prod.code,
          name: prod.name,
          category: prod.category,
          quantity: prod.quantity,
          costPrice: prod.costPrice,
          sellPrice: prod.sellPrice,
          unit: prod.unit,
          measurementUnit: prod.measurementUnit,
        }
      });
    }
  }

  // 4. Insert Pump Products
  console.log(`Inserting ${data.pumps.length} pump products...`);
  for (const pump of data.pumps) {
    await prisma.pumpProduct.create({
      data: {
        id: pump.id,
        model: pump.model,
        brand: pump.brand,
        status: pump.status || "Published",
        firstCategory: pump.firstCategory,
        secondCategory: pump.secondCategory,
        power: pump.power,
        voltage: pump.voltage,
        description: pump.description,
        image: pump.image,
        controllerImage: pump.controllerImage,
        panelImage: pump.panelImage,
        introductionTitle: pump.introductionTitle,
        technicalDataTitle: pump.technicalDataTitle,
        hydraulicCurveTitle: pump.hydraulicCurveTitle,
        hydraulicCurveImage: pump.hydraulicCurveImage,
        technicalData: pump.technicalData,
        performanceData: pump.performanceData,
        equipment: pump.equipment,
        sourceUrl: pump.sourceUrl,
      }
    });
  }

  console.log("Seeding pumps data completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
