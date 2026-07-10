import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, "../../extracted_pumps_data.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`Data file not found at: ${dataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(rawData);

  console.log("Wiping existing products, pump products, and pump categories...");
  
  // Wipe database tables
  const deletedProductsCount = await prisma.product.deleteMany();
  console.log(`Deleted ${deletedProductsCount.count} products from general inventory.`);

  const deletedPumpsCount = await prisma.pumpProduct.deleteMany();
  console.log(`Deleted ${deletedPumpsCount.count} pump products.`);

  const deletedCategoriesCount = await prisma.pumpCategory.deleteMany();
  console.log(`Deleted ${deletedCategoriesCount.count} pump categories.`);

  console.log("Seeding new categories based on brand...");
  for (const cat of data.categories) {
    await prisma.pumpCategory.create({
      data: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
    });
  }
  console.log(`Seeded ${data.categories.length} categories.`);

  console.log("Seeding general inventory products needed for kits...");
  for (const prod of data.inventory_products) {
    await prisma.product.create({
      data: {
        id: prod.id,
        code: prod.code,
        name: prod.name,
        category: prod.category,
        quantity: prod.quantity,
        costPrice: prod.costPrice,
        sellPrice: prod.sellPrice,
        unit: prod.unit,
        measurementUnit: prod.measurementUnit,
        metadata: {},
      },
    });
  }
  console.log(`Seeded ${data.inventory_products.length} products in general inventory.`);

  console.log("Seeding pump products and linking equipment...");
  for (const pump of data.pumps) {
    await prisma.pumpProduct.create({
      data: {
        id: pump.id,
        model: pump.model,
        brand: pump.brand,
        status: "Published",
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
        sourceUrl: pump.sourceUrl,
        technicalData: pump.technicalData,
        performanceData: pump.performanceData,
        equipment: pump.equipment,
      },
    });
  }
  console.log(`Seeded ${data.pumps.length} pump products linked to inventory.`);

  console.log("Database seeding of extracted products completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
