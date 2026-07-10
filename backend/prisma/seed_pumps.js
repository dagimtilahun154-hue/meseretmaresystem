const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const pumps = [
  // ===== 10 DIFFUL PRODUCTS =====
  {
    model: "4DPC6-56-110-750",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "750W",
    voltage: "DC 110V",
    description: "4-inch DC solar submersible pump with plastic impeller. Ideal for deep well irrigation, livestock watering, and rural water supply. Max head 56m, max flow 6m³/h.",
    image: "https://icdn.tradew.com/file/202206/2329780/jpg/21700613.jpg",
    technicalData: [{ item: "4DPC6-56-110-750", ratedFlow: 6, ratedHead: 56, maxFlow: 9, maxHead: 65, powerKw: 0.75, outletInch: 1.25, voltage: "DC 110V" }],
    performanceData: [{ head: 54, flow: 0.5 }, { head: 50, flow: 1.0 }, { head: 47, flow: 2.0 }, { head: 42, flow: 3.0 }, { head: 38, flow: 4.0 }, { head: 30, flow: 5.0 }, { head: 18, flow: 6.0 }],
    equipment: [{ name: "Pump 750W", quantity: 1, unit: "Piece", price: 12000 }, { name: "Controller 750W", quantity: 1, unit: "Piece", price: 4500 }, { name: "Solar Panel 250W", quantity: 3, unit: "Piece", price: 5500 }, { name: "Cable 2.5mm²", quantity: 30, unit: "Meter", price: 120 }],
    sourceUrl: "https://www.diffulpump.com/products2098937/DC-SOLAR-SUBMERSIBLE-PUMP.htm"
  },
  {
    model: "4DPC9-35-110-750",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "750W",
    voltage: "DC 110V",
    description: "High-flow 4-inch DC solar submersible pump. Plastic impeller design for corrosion resistance. Max head 35m, max flow 9m³/h. Perfect for medium-depth wells.",
    image: "https://icdn.tradew.com/file/202206/2329780/jpg/21700613.jpg",
    technicalData: [{ item: "4DPC9-35-110-750", ratedFlow: 9, ratedHead: 35, maxFlow: 12, maxHead: 45, powerKw: 0.75, outletInch: 1.25, voltage: "DC 110V" }],
    performanceData: [{ head: 45, flow: 1.0 }, { head: 40, flow: 3.0 }, { head: 35, flow: 5.0 }, { head: 28, flow: 7.0 }, { head: 18, flow: 9.0 }, { head: 5, flow: 11.0 }],
    equipment: [{ name: "Pump 750W High Flow", quantity: 1, unit: "Piece", price: 13500 }, { name: "Controller 750W", quantity: 1, unit: "Piece", price: 4500 }, { name: "Solar Panel 250W", quantity: 3, unit: "Piece", price: 5500 }],
    sourceUrl: "https://www.diffulpump.com/products2098937/DC-SOLAR-SUBMERSIBLE-PUMP.htm"
  },
  {
    model: "4DGS3-100/5-2200S-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "High Speed Deep Well Pump",
    power: "2200W",
    voltage: "AC/DC 80V-420V",
    description: "6000rpm high speed AC/DC solar deep well pump. Stainless steel impeller, 3m³/h rated flow, 100m rated head. Runs on solar panels or AC power.",
    image: "https://icdn.tradew.com/file/202209/2329780/jpg/22591513.jpg",
    technicalData: [{ item: "4DGS3-100/5-2200S-A/D", ratedFlow: 3, ratedHead: 100, maxFlow: 8, maxHead: 117, acVoltage: 220, optimumDcVoltage: "300-400", powerKw: 2.2, outletInch: 1.25 }],
    performanceData: [{ head: 111, flow: 1.0 }, { head: 106, flow: 2.0 }, { head: 100, flow: 3.0 }, { head: 90, flow: 4.0 }, { head: 77, flow: 5.0 }, { head: 59, flow: 6.0 }, { head: 42, flow: 7.0 }, { head: 18, flow: 8.0 }],
    equipment: [{ name: "Pump 2200W", quantity: 1, unit: "Piece", price: 35000 }, { name: "AC/DC Controller 2200W", quantity: 1, unit: "Piece", price: 8000 }, { name: "Solar Panel 330W", quantity: 8, unit: "Piece", price: 6500 }, { name: "Panel Mounting Frame", quantity: 1, unit: "Set", price: 4500 }, { name: "HDPE Pipe 1.5\"", quantity: 100, unit: "Meter", price: 45 }, { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 }],
    sourceUrl: "https://www.diffulpump.com/products2130465/HIGH-SPEED-DEEP-WELL-PUMP.htm"
  },
  {
    model: "4DGS8-40/2-2200S-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "High Speed Deep Well Pump",
    power: "2200W",
    voltage: "AC/DC 80V-420V",
    description: "6000rpm high speed AC/DC pump for shallow to medium wells. 8m³/h rated flow, 40m rated head. Dual power mode: solar direct or AC mains backup.",
    image: "https://icdn.tradew.com/file/202209/2329780/jpg/22591513.jpg",
    technicalData: [{ item: "4DGS8-40/2-2200S-A/D", ratedFlow: 8, ratedHead: 40, maxFlow: 14, maxHead: 52, acVoltage: 220, optimumDcVoltage: "300-400", powerKw: 2.2, outletInch: 2.0 }],
    performanceData: [{ head: 52, flow: 1.0 }, { head: 48, flow: 4.0 }, { head: 40, flow: 8.0 }, { head: 30, flow: 10.0 }, { head: 20, flow: 12.0 }, { head: 5, flow: 14.0 }],
    equipment: [{ name: "Pump 2200W High Flow", quantity: 1, unit: "Piece", price: 38000 }, { name: "AC/DC Controller 2200W", quantity: 1, unit: "Piece", price: 8000 }, { name: "Solar Panel 330W", quantity: 8, unit: "Piece", price: 6500 }, { name: "HDPE Pipe 2\"", quantity: 50, unit: "Meter", price: 65 }],
    sourceUrl: "https://www.diffulpump.com/products2130465/HIGH-SPEED-DEEP-WELL-PUMP.htm"
  },
  {
    model: "4DGS15-31/2-3000-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "High Speed Deep Well Pump",
    power: "3000W",
    voltage: "AC/DC 120V-500V",
    description: "3kW high-power AC/DC solar deep well pump. 15m³/h rated flow for large-scale irrigation. Compatible with 380V AC or high-voltage solar arrays.",
    image: "https://icdn.tradew.com/file/202209/2329780/jpg/22591513.jpg",
    technicalData: [{ item: "4DGS15-31/2-3000-A/D", ratedFlow: 15, ratedHead: 31, maxFlow: 22, maxHead: 42, acVoltage: 380, optimumDcVoltage: "520-750", powerKw: 3.0, outletInch: 2.0 }],
    performanceData: [{ head: 42, flow: 1.0 }, { head: 38, flow: 8.0 }, { head: 31, flow: 15.0 }, { head: 22, flow: 18.0 }, { head: 10, flow: 22.0 }],
    equipment: [{ name: "Pump 3000W", quantity: 1, unit: "Piece", price: 45000 }, { name: "AC/DC Controller 3000W", quantity: 1, unit: "Piece", price: 12000 }, { name: "Solar Panel 450W", quantity: 8, unit: "Piece", price: 8500 }, { name: "Panel Frame 8-slot", quantity: 1, unit: "Set", price: 6000 }],
    sourceUrl: "https://www.diffulpump.com/products2130465/HIGH-SPEED-DEEP-WELL-PUMP.htm"
  },
  {
    model: "4DFS2.5-200-110-1500",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "AC/DC Solar Submersible Pump",
    power: "1500W",
    voltage: "AC/DC 110V-220V",
    description: "4-inch AC/DC solar submersible pump with stainless steel impeller. 200m max head for ultra-deep wells. Automatic AC/DC switching with MPPT tracking.",
    image: "https://icdn.tradew.com/file/202201/2329780/jpg/21061027.jpg",
    technicalData: [{ item: "4DFS2.5-200-110-1500", ratedFlow: 2.5, ratedHead: 200, maxFlow: 5, maxHead: 230, powerKw: 1.5, outletInch: 1.25, voltage: "AC/DC 110-220V" }],
    performanceData: [{ head: 230, flow: 0.5 }, { head: 210, flow: 1.0 }, { head: 200, flow: 1.5 }, { head: 180, flow: 2.0 }, { head: 150, flow: 2.5 }, { head: 100, flow: 3.5 }, { head: 50, flow: 4.5 }],
    equipment: [{ name: "Pump 1500W Deep", quantity: 1, unit: "Piece", price: 28000 }, { name: "AC/DC Controller 1500W", quantity: 1, unit: "Piece", price: 7500 }, { name: "Solar Panel 330W", quantity: 5, unit: "Piece", price: 6500 }],
    sourceUrl: "https://www.diffulpump.com/products2098950/AC-DC-SOLAR-SUBMERSIBLE-PUMP.htm"
  },
  {
    model: "DCPM6-24-48-550",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Surface Pump",
    secondCategory: "DC Surface Solar Pump",
    power: "550W",
    voltage: "DC 48V",
    description: "DC solar centrifugal surface pump for domestic and garden use. 6m³/h flow, 24m head. Low-voltage design runs on just 2 solar panels.",
    image: "https://icdn.tradew.com/file/202206/2329780/jpg/21700619.jpg",
    technicalData: [{ item: "DCPM6-24-48-550", ratedFlow: 6, ratedHead: 24, maxFlow: 9, maxHead: 28, powerKw: 0.55, voltage: "DC 48V" }],
    performanceData: [{ head: 24, flow: 0.5 }, { head: 22, flow: 1.0 }, { head: 21, flow: 1.5 }, { head: 19, flow: 2.0 }, { head: 18, flow: 2.5 }, { head: 16, flow: 3.0 }, { head: 12, flow: 4.5 }, { head: 9, flow: 5.0 }],
    equipment: [{ name: "Surface Pump 550W", quantity: 1, unit: "Piece", price: 18000 }, { name: "Controller 48V", quantity: 1, unit: "Piece", price: 5500 }, { name: "Solar Panel 270W", quantity: 2, unit: "Piece", price: 5800 }],
    sourceUrl: "https://www.diffulpump.com/products2098939/DC-SURFACE-SOLAR-PUMP.htm"
  },
  {
    model: "DCPM21-14-72-750",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Surface Pump",
    secondCategory: "DC Surface Solar Pump",
    power: "750W",
    voltage: "DC 72V",
    description: "High-capacity DC solar surface pump. 21m³/h flow for agricultural water transfer, pond filling, and drip irrigation systems.",
    image: "https://icdn.tradew.com/file/202206/2329780/jpg/21700619.jpg",
    technicalData: [{ item: "DCPM21-14-72-750", ratedFlow: 21, ratedHead: 14, maxFlow: 28, maxHead: 18, powerKw: 0.75, voltage: "DC 72V" }],
    performanceData: [{ head: 18, flow: 2.0 }, { head: 16, flow: 5.0 }, { head: 14, flow: 10.0 }, { head: 12, flow: 15.0 }, { head: 8, flow: 21.0 }, { head: 3, flow: 28.0 }],
    equipment: [{ name: "Surface Pump 750W", quantity: 1, unit: "Piece", price: 21000 }, { name: "Controller 72V", quantity: 1, unit: "Piece", price: 6500 }, { name: "Solar Panel 330W", quantity: 3, unit: "Piece", price: 6500 }],
    sourceUrl: "https://www.diffulpump.com/products2098939/DC-SURFACE-SOLAR-PUMP.htm"
  },
  {
    model: "DLP-1100-DC-48V",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Surface Pump",
    secondCategory: "DC Solar Pool Pump",
    power: "1100W",
    voltage: "DC 48V-72V",
    description: "Solar-powered swimming pool circulation pump. 19m³/h flow rate with built-in MPPT controller. Saves electricity costs for pool filtration.",
    image: "https://icdn.tradew.com/file/202206/2329780/jpg/21700621.jpg",
    technicalData: [{ item: "DLP-1100-DC-48V", ratedFlow: 19, ratedHead: 13, maxFlow: 25, maxHead: 17, powerKw: 1.1, voltage: "DC 48-72V" }],
    performanceData: [{ head: 17, flow: 3.0 }, { head: 15, flow: 8.0 }, { head: 13, flow: 12.0 }, { head: 10, flow: 16.0 }, { head: 7, flow: 19.0 }, { head: 3, flow: 23.0 }],
    equipment: [{ name: "Pool Pump 1100W", quantity: 1, unit: "Piece", price: 25000 }, { name: "MPPT Controller", quantity: 1, unit: "Piece", price: 8000 }, { name: "Solar Panel 370W", quantity: 3, unit: "Piece", price: 7000 }],
    sourceUrl: "https://www.diffulpump.com/products2098938/DC-SOLAR-POOL-PUMP.htm"
  },
  {
    model: "4DFS6-80-110-1100-A/D",
    brand: "DIFFUL",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "AC/DC Solar Submersible Pump",
    power: "1100W",
    voltage: "AC/DC 110V-220V",
    description: "Versatile AC/DC submersible pump for 80m deep wells. 6m³/h flow with automatic power source switching. Built-in MPPT for maximum solar efficiency.",
    image: "https://icdn.tradew.com/file/202201/2329780/jpg/21061027.jpg",
    technicalData: [{ item: "4DFS6-80-110-1100-A/D", ratedFlow: 6, ratedHead: 80, maxFlow: 10, maxHead: 95, powerKw: 1.1, outletInch: 1.25, voltage: "AC/DC 110-220V" }],
    performanceData: [{ head: 95, flow: 0.5 }, { head: 88, flow: 2.0 }, { head: 80, flow: 4.0 }, { head: 70, flow: 5.0 }, { head: 55, flow: 6.0 }, { head: 35, flow: 8.0 }, { head: 10, flow: 10.0 }],
    equipment: [{ name: "Pump 1100W", quantity: 1, unit: "Piece", price: 22000 }, { name: "AC/DC Controller 1100W", quantity: 1, unit: "Piece", price: 6500 }, { name: "Solar Panel 330W", quantity: 4, unit: "Piece", price: 6500 }, { name: "HDPE Pipe 1.25\"", quantity: 80, unit: "Meter", price: 40 }],
    sourceUrl: "https://www.diffulpump.com/products2098950/AC-DC-SOLAR-SUBMERSIBLE-PUMP.htm"
  },

  // ===== 10 REDBUD PRODUCTS =====
  {
    model: "3SDC2.5/80-D36/500",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "500W",
    voltage: "DC 36V",
    description: "Zhejiang Redbud 3-inch SDC series brushless DC solar submersible pump. SS304 impeller, 80m max head. Ideal for 3-inch boreholes in rural areas.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/SDC-pump.jpg",
    technicalData: [{ item: "3SDC2.5/80-D36/500", ratedFlow: 2.5, ratedHead: 80, maxFlow: 4, maxHead: 95, powerKw: 0.5, outletInch: 1.25, voltage: "DC 36V" }],
    performanceData: [{ head: 95, flow: 0.3 }, { head: 85, flow: 1.0 }, { head: 80, flow: 1.5 }, { head: 70, flow: 2.0 }, { head: 55, flow: 2.5 }, { head: 30, flow: 3.5 }],
    equipment: [{ name: "SDC Pump 500W", quantity: 1, unit: "Piece", price: 15000 }, { name: "Brushless Controller", quantity: 1, unit: "Piece", price: 5000 }, { name: "Solar Panel 270W", quantity: 2, unit: "Piece", price: 5800 }],
    sourceUrl: "https://redbudpumps.com/product/sdc-brushless-solar-pump/"
  },
  {
    model: "4SDC6/50-D72/750",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "750W",
    voltage: "DC 72V",
    description: "Redbud 4-inch SDC brushless DC solar pump. 6m³/h flow, 50m head. Features dry-run protection, soft start, and MPPT solar tracking.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/SDC-pump.jpg",
    technicalData: [{ item: "4SDC6/50-D72/750", ratedFlow: 6, ratedHead: 50, maxFlow: 9, maxHead: 60, powerKw: 0.75, outletInch: 1.25, voltage: "DC 72V" }],
    performanceData: [{ head: 60, flow: 1.0 }, { head: 55, flow: 2.0 }, { head: 50, flow: 3.5 }, { head: 42, flow: 5.0 }, { head: 30, flow: 6.0 }, { head: 15, flow: 8.0 }],
    equipment: [{ name: "SDC Pump 750W", quantity: 1, unit: "Piece", price: 18000 }, { name: "Brushless Controller", quantity: 1, unit: "Piece", price: 5500 }, { name: "Solar Panel 330W", quantity: 3, unit: "Piece", price: 6500 }],
    sourceUrl: "https://redbudpumps.com/product/sdc-brushless-solar-pump/"
  },
  {
    model: "4SPC5/62-D110/1100",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "1100W",
    voltage: "DC 110V",
    description: "Redbud 4-inch SPC brushless pump with SS304 impeller and shaft. 62m head for medium-deep wells. Built-in over-voltage and under-voltage protection.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/SPC-pump.jpg",
    technicalData: [{ item: "4SPC5/62-D110/1100", ratedFlow: 5, ratedHead: 62, maxFlow: 8, maxHead: 75, powerKw: 1.1, outletInch: 1.25, voltage: "DC 110V" }],
    performanceData: [{ head: 75, flow: 0.5 }, { head: 68, flow: 2.0 }, { head: 62, flow: 3.5 }, { head: 52, flow: 5.0 }, { head: 38, flow: 6.5 }, { head: 15, flow: 8.0 }],
    equipment: [{ name: "SPC Pump 1100W", quantity: 1, unit: "Piece", price: 22000 }, { name: "SPC Controller", quantity: 1, unit: "Piece", price: 6500 }, { name: "Solar Panel 330W", quantity: 4, unit: "Piece", price: 6500 }],
    sourceUrl: "https://redbudpumps.com/product/spc-brushless-solar-pump/"
  },
  {
    model: "4SPC10/30-D110/1500",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "1500W",
    voltage: "DC 110V",
    description: "High-flow Redbud SPC brushless solar pump. 10m³/h for large irrigation projects. Corrosion-resistant stainless steel construction throughout.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/SPC-pump.jpg",
    technicalData: [{ item: "4SPC10/30-D110/1500", ratedFlow: 10, ratedHead: 30, maxFlow: 15, maxHead: 38, powerKw: 1.5, outletInch: 2.0, voltage: "DC 110V" }],
    performanceData: [{ head: 38, flow: 2.0 }, { head: 35, flow: 4.0 }, { head: 30, flow: 7.0 }, { head: 24, flow: 10.0 }, { head: 15, flow: 13.0 }, { head: 5, flow: 15.0 }],
    equipment: [{ name: "SPC Pump 1500W", quantity: 1, unit: "Piece", price: 26000 }, { name: "SPC Controller 1500W", quantity: 1, unit: "Piece", price: 7000 }, { name: "Solar Panel 330W", quantity: 5, unit: "Piece", price: 6500 }],
    sourceUrl: "https://redbudpumps.com/product/spc-brushless-solar-pump/"
  },
  {
    model: "4SDC5/100-AD/2200",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "High Speed Deep Well Pump",
    power: "2200W",
    voltage: "AC/DC 80V-400V",
    description: "Redbud SDC-A/D hybrid AC/DC solar deep well pump. 100m head for deep boreholes. Seamless switching between solar and AC grid power.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/SDC-AD-pump.jpg",
    technicalData: [{ item: "4SDC5/100-AD/2200", ratedFlow: 5, ratedHead: 100, maxFlow: 9, maxHead: 120, powerKw: 2.2, outletInch: 1.25, voltage: "AC/DC 80-400V" }],
    performanceData: [{ head: 120, flow: 0.5 }, { head: 110, flow: 2.0 }, { head: 100, flow: 3.5 }, { head: 85, flow: 5.0 }, { head: 60, flow: 7.0 }, { head: 25, flow: 9.0 }],
    equipment: [{ name: "SDC-A/D Pump 2200W", quantity: 1, unit: "Piece", price: 42000 }, { name: "AC/DC Smart Controller", quantity: 1, unit: "Piece", price: 12000 }, { name: "Solar Panel 450W", quantity: 6, unit: "Piece", price: 8500 }],
    sourceUrl: "https://redbudpumps.com/product/sdc-a-d80v-400v-brushless-solar-pump/"
  },
  {
    model: "4SPC8/60-AD/3000",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "High Speed Deep Well Pump",
    power: "3000W",
    voltage: "AC/DC 80V-400V",
    description: "Redbud SPC-A/D 3kW hybrid solar deep well pump. 8m³/h rated flow, 60m head. Three-phase AC or high-voltage DC solar input.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/SPC-AD-pump.jpg",
    technicalData: [{ item: "4SPC8/60-AD/3000", ratedFlow: 8, ratedHead: 60, maxFlow: 14, maxHead: 75, powerKw: 3.0, outletInch: 2.0, voltage: "AC/DC 80-400V" }],
    performanceData: [{ head: 75, flow: 1.0 }, { head: 68, flow: 3.0 }, { head: 60, flow: 5.5 }, { head: 48, flow: 8.0 }, { head: 32, flow: 11.0 }, { head: 10, flow: 14.0 }],
    equipment: [{ name: "SPC-A/D Pump 3000W", quantity: 1, unit: "Piece", price: 48000 }, { name: "AC/DC Controller 3000W", quantity: 1, unit: "Piece", price: 14000 }, { name: "Solar Panel 450W", quantity: 8, unit: "Piece", price: 8500 }],
    sourceUrl: "https://redbudpumps.com/product/spc-a-d80v-400v-brushless-solar-pump/"
  },
  {
    model: "3RDPI1.8/120-D72/750",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "750W",
    voltage: "DC 72V",
    description: "Redbud 3-inch DC screw/impeller solar pump. 120m max head for deep narrow boreholes. Helical rotor design for high-pressure low-flow applications.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/3RDPI-pump.jpg",
    technicalData: [{ item: "3RDPI1.8/120-D72/750", ratedFlow: 1.8, ratedHead: 120, maxFlow: 3, maxHead: 145, powerKw: 0.75, outletInch: 1.0, voltage: "DC 72V" }],
    performanceData: [{ head: 145, flow: 0.2 }, { head: 130, flow: 0.5 }, { head: 120, flow: 1.0 }, { head: 100, flow: 1.5 }, { head: 75, flow: 1.8 }, { head: 40, flow: 2.5 }],
    equipment: [{ name: "3RDPI Screw Pump", quantity: 1, unit: "Piece", price: 19000 }, { name: "Controller 72V", quantity: 1, unit: "Piece", price: 5500 }, { name: "Solar Panel 330W", quantity: 3, unit: "Piece", price: 6500 }],
    sourceUrl: "https://redbudpumps.com/product/3rdpi-dc-screw-impeller-solar-pump/"
  },
  {
    model: "2RSS1.5/100-D48/400",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "DC Solar Submersible Pump",
    power: "400W",
    voltage: "DC 48V",
    description: "Redbud 2-inch RSS DC screw solar pump for narrow boreholes. 100m head from only 400W. Perfect for remote domestic water supply.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/2RSS-pump.jpg",
    technicalData: [{ item: "2RSS1.5/100-D48/400", ratedFlow: 1.5, ratedHead: 100, maxFlow: 2.5, maxHead: 120, powerKw: 0.4, outletInch: 1.0, voltage: "DC 48V" }],
    performanceData: [{ head: 120, flow: 0.2 }, { head: 110, flow: 0.5 }, { head: 100, flow: 0.8 }, { head: 85, flow: 1.0 }, { head: 65, flow: 1.5 }, { head: 30, flow: 2.0 }],
    equipment: [{ name: "2RSS Screw Pump", quantity: 1, unit: "Piece", price: 14000 }, { name: "Controller 48V", quantity: 1, unit: "Piece", price: 4000 }, { name: "Solar Panel 200W", quantity: 2, unit: "Piece", price: 4500 }],
    sourceUrl: "https://redbudpumps.com/product/2rss-dc-screw-impeller-solar-pump/"
  },
  {
    model: "4SDC-SS8/45-D110/1100",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "AC/DC Solar Submersible Pump",
    power: "1100W",
    voltage: "DC 110V",
    description: "Redbud 4SDC full stainless steel impeller solar pump. 8m³/h flow, 45m head. Premium 304SS construction for corrosive water conditions.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/4SDC-SS-pump.jpg",
    technicalData: [{ item: "4SDC-SS8/45-D110/1100", ratedFlow: 8, ratedHead: 45, maxFlow: 12, maxHead: 55, powerKw: 1.1, outletInch: 2.0, voltage: "DC 110V" }],
    performanceData: [{ head: 55, flow: 1.0 }, { head: 50, flow: 3.0 }, { head: 45, flow: 5.0 }, { head: 38, flow: 8.0 }, { head: 25, flow: 10.0 }, { head: 8, flow: 12.0 }],
    equipment: [{ name: "4SDC-SS Pump 1100W", quantity: 1, unit: "Piece", price: 24000 }, { name: "SS Controller 1100W", quantity: 1, unit: "Piece", price: 6800 }, { name: "Solar Panel 330W", quantity: 4, unit: "Piece", price: 6500 }],
    sourceUrl: "https://redbudpumps.com/product/4sdc-dc-ss-impeller-solar-pump/"
  },
  {
    model: "6SPC25/20-AD/3000",
    brand: "Redbud",
    status: "Published",
    firstCategory: "Submersible Pump",
    secondCategory: "High Speed Deep Well Pump",
    power: "3000W",
    voltage: "AC/DC 220V-380V",
    description: "Redbud 6-inch SPC-A/D heavy-duty solar pump. 25m³/h ultra-high flow for large-scale agricultural irrigation and community water projects.",
    image: "https://redbudpumps.com/wp-content/uploads/2023/03/6SPC-AD-pump.jpg",
    technicalData: [{ item: "6SPC25/20-AD/3000", ratedFlow: 25, ratedHead: 20, maxFlow: 35, maxHead: 28, powerKw: 3.0, outletInch: 3.0, voltage: "AC/DC 220-380V" }],
    performanceData: [{ head: 28, flow: 5.0 }, { head: 25, flow: 10.0 }, { head: 20, flow: 18.0 }, { head: 15, flow: 25.0 }, { head: 8, flow: 30.0 }, { head: 3, flow: 35.0 }],
    equipment: [{ name: "6SPC-A/D Pump 3000W", quantity: 1, unit: "Piece", price: 52000 }, { name: "AC/DC Controller 3000W", quantity: 1, unit: "Piece", price: 15000 }, { name: "Solar Panel 450W", quantity: 8, unit: "Piece", price: 8500 }, { name: "Heavy-duty Frame", quantity: 1, unit: "Set", price: 8000 }],
    sourceUrl: "https://redbudpumps.com/product/6spc-a-d-brushless-solar-pump/"
  }
];

async function main() {
  // Clear existing pump products
  const deleted = await p.pumpProduct.deleteMany({});
  console.log("Cleared", deleted.count, "existing pump products");

  // Insert all 20 new products
  for (const pump of pumps) {
    await p.pumpProduct.create({ data: pump });
    console.log("  +", pump.brand, pump.model);
  }
  
  console.log("\nDone! Seeded", pumps.length, "pump products (10 DIFFUL + 10 Redbud)");
  await p["$disconnect"]();
}

main().catch(e => { console.error(e); process.exit(1); });
