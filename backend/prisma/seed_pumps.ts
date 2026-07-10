import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const pumps = [
  // 1. DIFFUL Submersible Deep Well Pumps
  {
    model: "4DGS3-100/5-2200S-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "2200W",
    voltage: "DC 80V-420V",
    description: "Solar submersible pump for medium depth wells, ideal for small to medium irrigation systems.",
    image: "/uploads/submersible-pump.jpg",
    controllerImage: "/uploads/submersible-controller.jpg",
    panelImage: "/uploads/solar-panel.jpg",
    introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
    technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
    hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
    hydraulicCurveImage: "/uploads/6000rpm-hydraulic-curve.png",
    technicalData: [
      {
        item: "4DGS3-100/5-2200S-A/D",
        ratedFlow: 3,
        ratedHead: 100,
        maxFlow: 8,
        maxHead: 117,
        acVoltage: 220,
        optimumDcVoltage: "300-400",
        openCircuitVoltage: "< 430",
        powerKw: 2.2,
        outletInch: 1.25,
        outletDiameterMm: 100,
        cableM: 2,
        pumpHeightMm: 618,
        pumpWeightKg: 8.9,
      }
    ],
    performanceData: [
      { head: 111.38, flow: 1 }, { head: 106.28, flow: 2.01 }, { head: 99.75, flow: 3 },
      { head: 89.85, flow: 4.02 }, { head: 77.31, flow: 5.01 }, { head: 59.25, flow: 6 },
      { head: 41.81, flow: 7 }, { head: 17.94, flow: 8.01 }, { head: 8.66, flow: 8.38 },
    ],
    equipment: [
      { name: "Pump – 2200W", quantity: 1, unit: "Piece", price: 35000 },
      { name: "Pump Controller – 2200W", quantity: 1, unit: "Piece", price: 8000 },
      { name: "Solar Panels", quantity: 8, unit: "Piece", price: 6500 },
      { name: "Solar Panel Rod", quantity: 1, unit: "Pack", price: 2500 },
      { name: "HDPE Pipe – 1.5 inch", quantity: 1, unit: "Roll", price: 3000 },
      { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
      { name: "HDPE Elbow – 2 inch", quantity: 2, unit: "Piece", price: 350 },
      { name: "HDPE Socket – 2 inch", quantity: 2, unit: "Piece", price: 250 },
      { name: "GS Union – 4 inch", quantity: 1, unit: "Piece", price: 900 },
      { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },
  {
    model: "4DGS8-40/2-2200S-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "2200W",
    voltage: "DC 80V-420V",
    description: "High speed solar submersible deep well pump with 8m³/h rated flow and 40m rated head.",
    image: "/uploads/submersible-pump.jpg",
    controllerImage: "/uploads/submersible-controller.jpg",
    panelImage: "/uploads/solar-panel.jpg",
    introductionTitle: "6000rpm High Speed Deep Well Pump with 8m³/h Rated Flow",
    technicalDataTitle: "6000rpm High Speed Deep Well Pump with 8m³/h Rated Flow Technical Data",
    hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 8m³/h Rated Flow Hydraulic Performance Curves",
    hydraulicCurveImage: "/uploads/6000rpm-8-hydraulic-curve.png",
    technicalData: [
      {
        item: "4DGS8-40/2-2200S-A/D",
        ratedFlow: 8,
        ratedHead: 40,
        maxFlow: 14,
        maxHead: 52,
        acVoltage: 220,
        optimumDcVoltage: "300-400",
        openCircuitVoltage: "< 430",
        powerKw: 2.2,
        outletInch: 2.0,
        outletDiameterMm: 100,
        cableM: 2,
        pumpHeightMm: 580,
        pumpWeightKg: 8.5,
      }
    ],
    performanceData: [
      { head: 52, flow: 1 }, { head: 48, flow: 4 }, { head: 40, flow: 8 },
      { head: 30, flow: 10 }, { head: 20, flow: 12 }, { head: 5, flow: 14 }
    ],
    equipment: [
      { name: "Pump – 2200W High Flow", quantity: 1, unit: "Piece", price: 38000 },
      { name: "Pump Controller – 2200W", quantity: 1, unit: "Piece", price: 8000 },
      { name: "Solar Panels 330W", quantity: 8, unit: "Piece", price: 6500 },
      { name: "Solar Panel Rod", quantity: 1, unit: "Pack", price: 2500 },
      { name: "HDPE Pipe – 2 inch", quantity: 1, unit: "Roll", price: 4000 },
      { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
      { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },
  {
    model: "4DGS15-31/2-3000-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "3000W",
    voltage: "DC 120V-500V",
    description: "High speed solar submersible deep well pump with 15m³/h rated flow and 31m rated head.",
    image: "/uploads/submersible-pump.jpg",
    controllerImage: "/uploads/submersible-controller.jpg",
    panelImage: "/uploads/solar-panel.jpg",
    technicalData: [
      {
        item: "4DGS15-31/2-3000-A/D",
        ratedFlow: 15,
        ratedHead: 31,
        maxFlow: 22,
        maxHead: 42,
        acVoltage: 380,
        optimumDcVoltage: "520-750",
        openCircuitVoltage: "< 780",
        powerKw: 3.0,
        outletInch: 2.0,
        outletDiameterMm: 100,
        cableM: 2,
        pumpHeightMm: 620,
        pumpWeightKg: 9.8,
      }
    ],
    performanceData: [
      { head: 42, flow: 1 }, { head: 38, flow: 8 }, { head: 31, flow: 15 },
      { head: 22, flow: 18 }, { head: 10, flow: 22 }
    ],
    equipment: [
      { name: "Pump – 3000W High Flow", quantity: 1, unit: "Piece", price: 45000 },
      { name: "Pump Controller – 3000W", quantity: 1, unit: "Piece", price: 10000 },
      { name: "Solar Panels 330W", quantity: 10, unit: "Piece", price: 6500 },
      { name: "HDPE Pipe – 2 inch", quantity: 2, unit: "Roll", price: 4000 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },
  {
    model: "4DGS20-28/2-3000-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "3000W",
    voltage: "DC 120V-500V",
    description: "High speed solar submersible deep well pump with 20m³/h rated flow and 28m rated head.",
    image: "/uploads/submersible-pump.jpg",
    technicalData: [
      {
        item: "4DGS20-28/2-3000-A/D",
        ratedFlow: 20,
        ratedHead: 28,
        maxFlow: 28,
        maxHead: 38,
        acVoltage: 380,
        optimumDcVoltage: "520-750",
        openCircuitVoltage: "< 780",
        powerKw: 3.0,
        outletInch: 2.5,
        outletDiameterMm: 100,
        cableM: 2,
        pumpHeightMm: 640,
        pumpWeightKg: 10.2,
      }
    ],
    performanceData: [
      { head: 38, flow: 2 }, { head: 33, flow: 10 }, { head: 28, flow: 20 },
      { head: 15, flow: 25 }, { head: 5, flow: 28 }
    ],
    equipment: [
      { name: "Pump – 3000W Ultra Flow", quantity: 1, unit: "Piece", price: 47000 },
      { name: "Pump Controller – 3000W", quantity: 1, unit: "Piece", price: 10000 },
      { name: "Solar Panels 330W", quantity: 10, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },

  // 2. DIFFUL Series Plastic Impeller Pumps
  {
    model: "4DPC6-56-110-750-HV",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "DIFFUL Series",
    secondCategory: "Plastic Impeller Submersible Pump",
    power: "750W",
    voltage: "DC 110V",
    description: "Solar powered pump with plastic impeller, ideal for irrigation and agricultural water supply.",
    image: "/uploads/submersible-pump.jpg",
    performanceData: [
      { head: 54.26, flow: 0.03 }, { head: 50.99, flow: 0.52 }, { head: 49.36, flow: 1.01 },
      { head: 47.01, flow: 1.54 }, { head: 45.28, flow: 2.02 }, { head: 41.91, flow: 2.52 },
      { head: 38.45, flow: 3.01 }, { head: 33.45, flow: 3.55 }, { head: 29.78, flow: 4.1 },
      { head: 26.31, flow: 4.52 }, { head: 21.62, flow: 4.97 }, { head: 17.74, flow: 5.53 },
      { head: 12.03, flow: 6.01 }, { head: 6.83, flow: 6.39 }
    ],
    equipment: [
      { name: "Pump – 750W", quantity: 1, unit: "Piece", price: 12000 },
      { name: "Pump Controller – 750W", quantity: 1, unit: "Piece", price: 4500 },
      { name: "Solar Panels 330W", quantity: 3, unit: "Piece", price: 6500 },
      { name: "Cable (per m)", quantity: 30, unit: "Meter", price: 150 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },
  {
    model: "4DPC9-45-110-750-HV",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "DIFFUL Series",
    secondCategory: "Plastic Impeller Submersible Pump",
    power: "750W",
    voltage: "DC 110V",
    description: "High-flow solar submersible pump with plastic impeller for irrigation.",
    image: "/uploads/submersible-pump.jpg",
    performanceData: [
      { head: 50.99, flow: 1.08 }, { head: 50.07, flow: 2.04 }, { head: 48.03, flow: 3.05 },
      { head: 42.73, flow: 4.05 }, { head: 33.96, flow: 5.08 }, { head: 26.82, flow: 6.0 },
      { head: 18.86, flow: 7.05 }, { head: 10.91, flow: 8.07 }, { head: 2.03, flow: 9.04 }
    ],
    equipment: [
      { name: "Pump – 750W High Flow", quantity: 1, unit: "Piece", price: 13500 },
      { name: "Pump Controller – 750W", quantity: 1, unit: "Piece", price: 4500 },
      { name: "Solar Panels 330W", quantity: 3, unit: "Piece", price: 6500 },
      { name: "Cable (per m)", quantity: 30, unit: "Meter", price: 150 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },

  // 3. DIFFUL Surface Pumps
  {
    model: "DCPM6-24-48-550",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Surface Pump",
    secondCategory: "DC Surface Pump",
    power: "550W",
    voltage: "DC 48V",
    description: "Domestic centrifugal surface pump with solar power, perfect for home gardening and livestock.",
    image: "/uploads/surface-pump.jpg",
    controllerImage: "/uploads/surface-controller.jpg",
    panelImage: "/uploads/solar-panel.jpg",
    performanceData: [
      { head: 24.47, flow: 0.51 }, { head: 22.23, flow: 1.04 }, { head: 20.9, flow: 1.52 },
      { head: 19.27, flow: 2.01 }, { head: 17.84, flow: 2.48 }, { head: 16.31, flow: 3.04 },
      { head: 15.19, flow: 3.47 }, { head: 12.03, flow: 4.46 }, { head: 9.48, flow: 4.99 }
    ],
    equipment: [
      { name: "Surface Pump DCPM6", quantity: 1, unit: "Piece", price: 18000 },
      { name: "Pump Controller 48V", quantity: 1, unit: "Piece", price: 6000 },
      { name: "Solar Panel 270W", quantity: 2, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },
  {
    model: "DCPM21-14-72-750",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Surface Pump",
    secondCategory: "DC Surface Pump",
    power: "750W",
    voltage: "DC 72V",
    description: "High capacity centrifugal surface solar pump for agricultural transfer.",
    image: "/uploads/surface-pump.jpg",
    performanceData: [
      { head: 14, flow: 1.0 }, { head: 12, flow: 10.0 }, { head: 10, flow: 15.0 }, { head: 5, flow: 21.0 }
    ],
    equipment: [
      { name: "Surface Pump DCPM21", quantity: 1, unit: "Piece", price: 21000 },
      { name: "Pump Controller 72V", quantity: 1, unit: "Piece", price: 7000 },
      { name: "Solar Panel 330W", quantity: 3, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://www.diffulpump.com/"
  },

  // 4. Redbud Solar Pumps
  {
    model: "SDC Brushless Solar Pump",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "80W-1500W",
    voltage: "DC 24V-110V",
    description: "Zhejiang Redbud SDC Series stainless steel brushless DC solar pump. Features high speed, high efficiency, and smart controller protection.",
    image: "/uploads/submersible-pump.jpg",
    performanceData: [
      { head: 30, flow: 2.0 }, { head: 50, flow: 1.5 }, { head: 80, flow: 1.0 }
    ],
    equipment: [
      { name: "Redbud SDC Pump", quantity: 1, unit: "Piece", price: 24000 },
      { name: "Brushless Controller", quantity: 1, unit: "Piece", price: 6500 },
      { name: "Solar Panels 330W", quantity: 4, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://redbudpumps.com/product/sdc-brushless-solar-pump/"
  },
  {
    model: "SPC Brushless Solar Pump",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "120W-1200W",
    voltage: "DC 24V-110V",
    description: "Zhejiang Redbud SPC Series stainless steel impeller solar submersible pump. Features robust design, corrosion-resistant plastic/SS options.",
    image: "/uploads/submersible-pump.jpg",
    performanceData: [
      { head: 25, flow: 3.0 }, { head: 45, flow: 2.0 }, { head: 65, flow: 1.2 }
    ],
    equipment: [
      { name: "Redbud SPC Pump", quantity: 1, unit: "Piece", price: 26000 },
      { name: "SPC Pump Controller", quantity: 1, unit: "Piece", price: 6500 },
      { name: "Solar Panels 330W", quantity: 4, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://redbudpumps.com/product/spc-brushless-solar-pump/"
  },
  {
    model: "SDC-A/D(80V-400V) Brushless Solar Pump",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "2200W-3000W",
    voltage: "AC/DC 80V-400V",
    description: "High voltage AC/DC hybrid solar pump. Runs on either solar power or AC generator/utility power seamlessly.",
    image: "/uploads/submersible-pump.jpg",
    performanceData: [
      { head: 80, flow: 5.0 }, { head: 120, flow: 3.8 }, { head: 160, flow: 2.0 }
    ],
    equipment: [
      { name: "Redbud Hybrid Pump 2200W", quantity: 1, unit: "Piece", price: 42000 },
      { name: "AC/DC Smart Controller", quantity: 1, unit: "Piece", price: 12000 },
      { name: "Solar Panels 330W", quantity: 8, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://redbudpumps.com/product/sdc-a-d80v-400v-brushless-solar-pump/"
  },
  {
    model: "3RDPI DC Screw/impeller Solar Pump",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "Deep Well Submersible Pump",
    power: "250W-750W",
    voltage: "DC 36V-72V",
    description: "3-inch stainless steel DC screw/impeller solar pump for high head and low flow requirements.",
    image: "/uploads/submersible-pump.jpg",
    performanceData: [
      { head: 40, flow: 1.5 }, { head: 70, flow: 1.0 }, { head: 110, flow: 0.5 }
    ],
    equipment: [
      { name: "3RDPI DC Pump", quantity: 1, unit: "Piece", price: 18000 },
      { name: "Pump Controller", quantity: 1, unit: "Piece", price: 4500 },
      { name: "Solar Panels 270W", quantity: 2, unit: "Piece", price: 6500 }
    ],
    sourceUrl: "https://redbudpumps.com/product/3rdpi-dc-screw-impeller-solar-pump/"
  }
];

async function main() {
  console.log("Seeding solar pump products...");
  
  for (const pump of pumps) {
    await prisma.pumpProduct.create({
      data: {
        model: pump.model,
        brand: pump.brand,
        status: pump.status,
        firstCategory: pump.firstCategory,
        secondCategory: pump.secondCategory,
        power: pump.power,
        voltage: pump.voltage,
        description: pump.description,
        image: pump.image,
        controllerImage: pump.controllerImage || null,
        panelImage: pump.panelImage || null,
        introductionTitle: pump.introductionTitle || null,
        technicalDataTitle: pump.technicalDataTitle || null,
        hydraulicCurveTitle: pump.hydraulicCurveTitle || null,
        hydraulicCurveImage: pump.hydraulicCurveImage || null,
        technicalData: pump.technicalData ? JSON.parse(JSON.stringify(pump.technicalData)) : null,
        performanceData: pump.performanceData ? JSON.parse(JSON.stringify(pump.performanceData)) : null,
        equipment: pump.equipment ? JSON.parse(JSON.stringify(pump.equipment)) : null,
        sourceUrl: pump.sourceUrl,
      }
    });
  }
  
  console.log("Successfully seeded", pumps.length, "pump products from DIFFUL & Redbud!");
}

main()
  .catch((e) => {
    console.error("Error seeding pumps:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
