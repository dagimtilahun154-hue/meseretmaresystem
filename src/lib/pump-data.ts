export interface EquipmentItem {
  productId?: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface TechnicalDataRow {
  item: string;
  ratedFlow: number;
  ratedHead: number;
  maxFlow: number;
  maxHead: number;
  acVoltage: number;
  optimumDcVoltage: string;
  openCircuitVoltage: string;
  powerKw: number;
  outletInch: number;
  outletDiameterMm: number;
  cableM: number;
  pumpHeightMm: number;
  pumpWeightKg: number;
}

export interface PumpModel {
  id: string;
  model: string;
  brand: string;
  status: "Draft" | "Pending Review" | "Published";
  firstCategory: "Surface Pump" | "Submersible Pump" | "DIFFUL Series";
  secondCategory: string;

  power: string;
  voltage: string;
  description: string;
  image?: string;
  controllerImage?: string;
  panelImage?: string;

  performanceData: { head: number; flow: number }[];

  introductionTitle?: string;
  technicalDataTitle?: string;
  hydraulicCurveTitle?: string;
  technicalData?: TechnicalDataRow[];
  hydraulicCurveImage?: string;

  equipment: EquipmentItem[];
}

export interface PumpSubCategory {
  id: string;
  name: string;
  models: PumpModel[];
}

export interface PumpCategory {
  id: "surface" | "submersible" | "di-series";
  name: string;
  description: string;
  icon: string;
  subCategories: PumpSubCategory[];
}

export const pumpCategories: PumpCategory[] = [
  {
    id: "submersible",
    name: "Submersible Pump",
    description: "Deep well and solar submersible solutions for irrigation and water supply.",
    icon: "droplets",
    subCategories: [
      {
        id: "deep-well-submersible",
        name: "Deep Well Submersible Pump",
        models: [
          {
            id: "PM1",
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
              },
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
          },
          {
            id: "PM2",
            model: "4DGS3-100/5-2200-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "2200W",
            voltage: "DC 120V-500V",
            description: "High-efficiency solar pump for deeper wells.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-100/5-2200-A/D",
                ratedFlow: 3,
                ratedHead: 100,
                maxFlow: 8,
                maxHead: 117,
                acVoltage: 380,
                optimumDcVoltage: "520-750",
                openCircuitVoltage: "< 780",
                powerKw: 2.2,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 618,
                pumpWeightKg: 8.9,
              },
            ],
            performanceData: [
              { head: 111.38, flow: 1 }, { head: 106.28, flow: 2.01 }, { head: 99.75, flow: 3 },
              { head: 89.85, flow: 4.02 }, { head: 77.31, flow: 5.01 }, { head: 59.25, flow: 6 },
              { head: 41.81, flow: 7 }, { head: 17.94, flow: 8.01 }, { head: 8.66, flow: 8.38 },
            ],
            equipment: [
              { name: "Pump – 3000W", quantity: 1, unit: "Piece", price: 42000 },
              { name: "Pump Controller – 3000W", quantity: 1, unit: "Piece", price: 10000 },
              { name: "Solar Panels", quantity: 10, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 1, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 2 inch", quantity: 1, unit: "Roll", price: 4000 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 2 inch", quantity: 2, unit: "Piece", price: 350 },
              { name: "HDPE Socket – 2 inch", quantity: 2, unit: "Piece", price: 250 },
              { name: "GS Union – 4 inch", quantity: 1, unit: "Piece", price: 900 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
          {
            id: "PM3",
            model: "4DGS3-137/7-3000-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "3000W",
            voltage: "DC 200V-600V",
            description: "Powerful solar pump designed for agricultural irrigation.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-137/7-3000-A/D",
                ratedFlow: 3,
                ratedHead: 137,
                maxFlow: 8,
                maxHead: 156,
                acVoltage: 220,
                optimumDcVoltage: "300-400",
                openCircuitVoltage: "< 430",
                powerKw: 3,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 702,
                pumpWeightKg: 10.4,
              },
            ],
            performanceData: [
              { head: 175, flow: 1.0 }, { head: 160, flow: 2.0 },
              { head: 142, flow: 3.0 }, { head: 118, flow: 4.0 },
            ],
            equipment: [
              { name: "Pump – 4000W", quantity: 1, unit: "Piece", price: 52000 },
              { name: "Pump Controller – 4000W", quantity: 1, unit: "Piece", price: 14000 },
              { name: "Solar Panels", quantity: 14, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 2, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 2 inch", quantity: 2, unit: "Roll", price: 4000 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 3 inch", quantity: 2, unit: "Piece", price: 500 },
              { name: "HDPE Socket – 3 inch", quantity: 2, unit: "Piece", price: 400 },
              { name: "GS Union – 4 inch", quantity: 2, unit: "Piece", price: 900 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
          {
            id: "PM4",
            model: "4DGS3-175/9-4000-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "4000W",
            voltage: "DC 300V-780V",
            description: "Heavy-duty solar pump for deep well applications.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-175/9-4000S-A/D",
                ratedFlow: 3,
                ratedHead: 175,
                maxFlow: 8,
                maxHead: 206,
                acVoltage: 220,
                optimumDcVoltage: "300-400",
                openCircuitVoltage: "< 430",
                powerKw: 4,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 779,
                pumpWeightKg: 12.1,
              },
            ],
            performanceData: [
              { head: 251, flow: 1.0 }, { head: 230, flow: 2.0 },
              { head: 200, flow: 3.0 }, { head: 165, flow: 4.0 },
            ],
            equipment: [
              { name: "Pump – 5500W", quantity: 1, unit: "Piece", price: 65000 },
              { name: "Pump Controller – 5500W", quantity: 1, unit: "Piece", price: 18000 },
              { name: "Solar Panels", quantity: 18, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 2, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 3 inch", quantity: 2, unit: "Roll", price: 5500 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 3 inch", quantity: 2, unit: "Piece", price: 500 },
              { name: "HDPE Socket – 3 inch", quantity: 2, unit: "Piece", price: 400 },
              { name: "GS Union – 4 inch", quantity: 2, unit: "Piece", price: 900 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
          {
            id: "PM5",
            model: "4DGS3-251/13-5500-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "5500W",
            voltage: "DC 300V-780V",
            description: "Premium solar pump system for high-demand installations.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-251/13-5500-A/D",
                ratedFlow: 3,
                ratedHead: 251,
                maxFlow: 8,
                maxHead: 294,
                acVoltage: 380,
                optimumDcVoltage: "520-750",
                openCircuitVoltage: "< 780",
                powerKw: 5.5,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 919,
                pumpWeightKg: 14.0,
              },
            ],
            performanceData: [
              { head: 335, flow: 1.0 }, { head: 310, flow: 2.0 },
              { head: 275, flow: 3.0 }, { head: 230, flow: 4.0 },
            ],
            equipment: [
              { name: "Pump – 7500W", quantity: 1, unit: "Piece", price: 78000 },
              { name: "Pump Controller – 7500W", quantity: 1, unit: "Piece", price: 22000 },
              { name: "Solar Panels", quantity: 24, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 3, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 3 inch", quantity: 3, unit: "Roll", price: 5500 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 4 inch", quantity: 2, unit: "Piece", price: 650 },
              { name: "HDPE Socket – 4 inch", quantity: 2, unit: "Piece", price: 550 },
              { name: "GS Union – 4 inch", quantity: 2, unit: "Piece", price: 900 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
          {
            id: "PM6",
            model: "4DGS3-335/16-7500-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "7500W",
            voltage: "DC 400V-850V",
            description: "Industrial-grade solar pump for the deepest wells.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-335/16-7500-A/D",
                ratedFlow: 3,
                ratedHead: 335,
                maxFlow: 8,
                maxHead: 385,
                acVoltage: 380,
                optimumDcVoltage: "520-750",
                openCircuitVoltage: "< 780",
                powerKw: 7.5,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 1121,
                pumpWeightKg: 18.2,
              },
            ],
            performanceData: [
              { head: 400, flow: 1.0 }, { head: 370, flow: 2.0 },
              { head: 330, flow: 3.0 }, { head: 280, flow: 4.0 },
            ],
            equipment: [
              { name: "Pump – 11000W", quantity: 1, unit: "Piece", price: 95000 },
              { name: "Pump Controller – 11000W", quantity: 1, unit: "Piece", price: 28000 },
              { name: "Solar Panels", quantity: 34, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 4, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 4 inch", quantity: 3, unit: "Roll", price: 7000 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 4 inch", quantity: 2, unit: "Piece", price: 650 },
              { name: "HDPE Socket – 4 inch", quantity: 2, unit: "Piece", price: 550 },
              { name: "GS Union – 4 inch", quantity: 2, unit: "Piece", price: 900 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
          {
            id: "PM7",
            model: "4DGS3-400/20-11000-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "11000W",
            voltage: "DC 500V-950V",
            description: "Maximum capacity solar pump for commercial systems.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-400/20-11000-A/D",
                ratedFlow: 3,
                ratedHead: 400,
                maxFlow: 8,
                maxHead: 473,
                acVoltage: 380,
                optimumDcVoltage: "520-750",
                openCircuitVoltage: "< 780",
                powerKw: 11,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 1292,
                pumpWeightKg: 21.9,
              },
            ],
            performanceData: [
              { head: 450, flow: 1.0 }, { head: 420, flow: 2.0 },
              { head: 380, flow: 3.0 }, { head: 320, flow: 4.0 },
            ],
            equipment: [
              { name: "Pump – 15000W", quantity: 1, unit: "Piece", price: 120000 },
              { name: "Pump Controller – 15000W", quantity: 1, unit: "Piece", price: 35000 },
              { name: "Solar Panels", quantity: 46, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 5, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 4 inch", quantity: 4, unit: "Roll", price: 7000 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 4 inch", quantity: 3, unit: "Piece", price: 650 },
              { name: "HDPE Socket – 4 inch", quantity: 3, unit: "Piece", price: 550 },
              { name: "GS Union – 4 inch", quantity: 3, unit: "Piece", price: 900 },
              { name: "Flexible Hose – 4 inch", quantity: 1, unit: "Piece", price: 1500 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
          {
            id: "PM8",
            model: "4DGS3-540/26-13000-A/D",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Submersible Pump",
            secondCategory: "Deep Well Submersible Pump",
            power: "13000W",
            voltage: "DC 500V-950V",
            description: "Ultra high-head solar submersible pump for demanding deep well systems.",
            image: "/uploads/submersible-pump.jpg",
            controllerImage: "/uploads/submersible-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow",
            technicalDataTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Technical Data",
            hydraulicCurveTitle: "6000rpm High Speed Deep Well Pump with 3m³/h Rated Flow Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/4dgs3-hydraulic-curve.jpg",
            technicalData: [
              {
                item: "4DGS3-540/26-13000-A/D",
                ratedFlow: 3,
                ratedHead: 540,
                maxFlow: 8,
                maxHead: 621,
                acVoltage: 380,
                optimumDcVoltage: "520-750",
                openCircuitVoltage: "< 780",
                powerKw: 13,
                outletInch: 1.25,
                outletDiameterMm: 100,
                cableM: 2,
                pumpHeightMm: 1539.1,
                pumpWeightKg: 25.1,
              },
            ],
            performanceData: [
              { head: 621, flow: 1.0 }, { head: 592, flow: 2.0 }, { head: 540, flow: 3.0 },
              { head: 460, flow: 4.0 }, { head: 365, flow: 5.0 }, { head: 255, flow: 6.0 },
              { head: 135, flow: 7.0 }, { head: 28, flow: 8.0 },
            ],
            equipment: [
              { name: "Pump – 13000W", quantity: 1, unit: "Piece", price: 135000 },
              { name: "Pump Controller – 13000W", quantity: 1, unit: "Piece", price: 39000 },
              { name: "Solar Panels", quantity: 54, unit: "Piece", price: 6500 },
              { name: "Solar Panel Rod", quantity: 6, unit: "Pack", price: 2500 },
              { name: "HDPE Pipe – 4 inch", quantity: 4, unit: "Roll", price: 7000 },
              { name: "Foot Valve – 4 inch", quantity: 1, unit: "Piece", price: 800 },
              { name: "HDPE Elbow – 4 inch", quantity: 3, unit: "Piece", price: 650 },
              { name: "HDPE Socket – 4 inch", quantity: 3, unit: "Piece", price: 550 },
              { name: "GS Union – 4 inch", quantity: 3, unit: "Piece", price: 900 },
              { name: "Flexible Hose – 4 inch", quantity: 1, unit: "Piece", price: 1500 },
              { name: "Float Switch", quantity: 1, unit: "Piece", price: 600 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "di-series",
    name: "DIFFUL Series",
    description: "Solar pump factory outlet solar submersible pump with plastic impeller 4inch solar powered pump for irrigation.",
    icon: "sparkles",
    subCategories: [
      {
        id: "plastic-impeller-submersible",
        name: "Plastic Impeller Submersible Pump",
        models: [
          {
            id: "DPC1",
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
              { head: 54.26, flow: 0.03 },
              { head: 50.99, flow: 0.52 },
              { head: 49.36, flow: 1.01 },
              { head: 47.01, flow: 1.54 },
              { head: 45.28, flow: 2.02 },
              { head: 41.91, flow: 2.52 },
              { head: 38.45, flow: 3.01 },
              { head: 33.45, flow: 3.55 },
              { head: 29.78, flow: 4.1 },
              { head: 26.31, flow: 4.52 },
              { head: 21.62, flow: 4.97 },
              { head: 17.74, flow: 5.53 },
              { head: 12.03, flow: 6.01 },
              { head: 6.83, flow: 6.39 },
            ],
            equipment: [
              { name: "Pump – 750W", quantity: 1, unit: "Piece", price: 12000 },
              { name: "Pump Controller – 750W", quantity: 1, unit: "Piece", price: 4500 },
              { name: "Solar Panels 330W", quantity: 3, unit: "Piece", price: 6500 },
              { name: "Cable (per m)", quantity: 30, unit: "Meter", price: 150 },
            ],
          },
          {
            id: "DPC2",
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
              { head: 50.99, flow: 1.08 },
              { head: 50.07, flow: 2.04 },
              { head: 48.03, flow: 3.05 },
              { head: 42.73, flow: 4.05 },
              { head: 33.96, flow: 5.08 },
              { head: 26.82, flow: 6.0 },
              { head: 18.86, flow: 7.05 },
              { head: 10.91, flow: 8.07 },
              { head: 2.03, flow: 9.04 },
            ],
            equipment: [
              { name: "Pump – 750W High Flow", quantity: 1, unit: "Piece", price: 13500 },
              { name: "Pump Controller – 750W", quantity: 1, unit: "Piece", price: 4500 },
              { name: "Solar Panels 330W", quantity: 3, unit: "Piece", price: 6500 },
              { name: "Cable (per m)", quantity: 30, unit: "Meter", price: 150 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "surface",
    name: "Surface Pump",
    description: "Centrifugal and solar surface pumps for domestic and agricultural use.",
    icon: "sun",
    subCategories: [
      {
        id: "dc-surface",
        name: "DC Surface Pump",
        models: [
          {
            id: "CSP1",
            model: "DCPM6-24-48-550",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Surface Pump",
            secondCategory: "DC Surface Pump",
            power: "550W",
            voltage: "DC 48V",
            description: "Domestic centrifugal surface pump with solar power.",
            image: "/uploads/surface-pump.jpg",
            controllerImage: "/uploads/surface-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "Centrifugal Surface Pump Introduction",
            technicalDataTitle: "Centrifugal Surface Pump Technical Data",
            hydraulicCurveTitle: "Centrifugal Surface Pump Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/surface-pump-hydraulic-curve.jpg",
            technicalData: [],
            performanceData: [
              { head: 24.47, flow: 0.51 }, { head: 22.23, flow: 1.04 }, { head: 20.9, flow: 1.52 },
              { head: 19.27, flow: 2.01 }, { head: 17.84, flow: 2.48 }, { head: 16.31, flow: 3.04 },
              { head: 15.19, flow: 3.47 }, { head: 12.03, flow: 4.46 }, { head: 9.48, flow: 4.99 },
              { head: 7.34, flow: 5.45 }, { head: 5.3, flow: 5.88 },
            ],
            equipment: [
              { name: "Surface Pump", quantity: 1, unit: "Piece", price: 18000 },
              { name: "Pump Controller", quantity: 1, unit: "Piece", price: 6000 },
              { name: "Solar Panel", quantity: 2, unit: "Piece", price: 6500 },
              { name: "Cable", quantity: 1, unit: "Roll", price: 2500 },
              { name: "Pipe", quantity: 1, unit: "Roll", price: 3000 },
              { name: "Accessories", quantity: 1, unit: "Set", price: 2000 },
            ],
          },
          {
            id: "CSP2",
            model: "DCPM21-14-72-750",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Surface Pump",
            secondCategory: "DC Surface Pump",
            power: "750W",
            voltage: "DC 72V",
            description: "Domestic centrifugal surface pump with solar power.",
            image: "/uploads/surface-pump.jpg",
            controllerImage: "/uploads/surface-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "Centrifugal Surface Pump Introduction",
            technicalDataTitle: "Centrifugal Surface Pump Technical Data",
            hydraulicCurveTitle: "Centrifugal Surface Pump Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/surface-pump-hydraulic-curve.jpg",
            technicalData: [],
            performanceData: [
              { head: 24.47, flow: 0.51 }, { head: 22.23, flow: 1.04 }, { head: 20.9, flow: 1.52 },
              { head: 19.27, flow: 2.01 }, { head: 17.84, flow: 2.48 }, { head: 16.31, flow: 3.04 },
              { head: 15.19, flow: 3.47 }, { head: 12.03, flow: 4.46 }, { head: 9.48, flow: 4.99 },
              { head: 7.34, flow: 5.45 }, { head: 5.3, flow: 5.88 },
            ],
            equipment: [
              { name: "Surface Pump", quantity: 1, unit: "Piece", price: 21000 },
              { name: "Pump Controller", quantity: 1, unit: "Piece", price: 7000 },
              { name: "Solar Panel", quantity: 3, unit: "Piece", price: 6500 },
              { name: "Cable", quantity: 1, unit: "Roll", price: 2500 },
              { name: "Pipe", quantity: 1, unit: "Roll", price: 3000 },
              { name: "Accessories", quantity: 1, unit: "Set", price: 2000 },
            ],
          },
          {
            id: "CSP3",
            model: "DCPM26-15-72-1100",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Surface Pump",
            secondCategory: "DC Surface Pump",
            power: "1100W",
            voltage: "DC 72V",
            description: "Domestic centrifugal surface pump with solar power.",
            image: "/uploads/surface-pump.jpg",
            controllerImage: "/uploads/surface-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "Centrifugal Surface Pump Introduction",
            technicalDataTitle: "Centrifugal Surface Pump Technical Data",
            hydraulicCurveTitle: "Centrifugal Surface Pump Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/surface-pump-hydraulic-curve.jpg",
            technicalData: [],
            performanceData: [
              { head: 24.47, flow: 0.51 }, { head: 22.23, flow: 1.04 }, { head: 20.9, flow: 1.52 },
              { head: 19.27, flow: 2.01 }, { head: 17.84, flow: 2.48 }, { head: 16.31, flow: 3.04 },
              { head: 15.19, flow: 3.47 }, { head: 12.03, flow: 4.46 }, { head: 9.48, flow: 4.99 },
              { head: 7.34, flow: 5.45 }, { head: 5.3, flow: 5.88 },
            ],
            equipment: [
              { name: "Surface Pump", quantity: 1, unit: "Piece", price: 25000 },
              { name: "Pump Controller", quantity: 1, unit: "Piece", price: 8000 },
              { name: "Solar Panel", quantity: 4, unit: "Piece", price: 6500 },
              { name: "Cable", quantity: 1, unit: "Roll", price: 2500 },
              { name: "Pipe", quantity: 1, unit: "Roll", price: 3000 },
              { name: "Accessories", quantity: 1, unit: "Set", price: 2000 },
            ],
          },
          {
            id: "CSP4",
            model: "DCPM50-17-110-1500",
            brand: "DIFFUL",
            status: "Published",
            firstCategory: "Surface Pump",
            secondCategory: "DC Surface Pump",
            power: "1500W",
            voltage: "DC 110V",
            description: "Domestic centrifugal surface pump with solar power.",
            image: "/uploads/surface-pump.jpg",
            controllerImage: "/uploads/surface-controller.jpg",
            panelImage: "/uploads/solar-panel.jpg",
            introductionTitle: "Centrifugal Surface Pump Introduction",
            technicalDataTitle: "Centrifugal Surface Pump Technical Data",
            hydraulicCurveTitle: "Centrifugal Surface Pump Hydraulic Performance Curves",
            hydraulicCurveImage: "/uploads/surface-pump-hydraulic-curve.jpg",
            technicalData: [],
            performanceData: [
              { head: 24.47, flow: 0.51 }, { head: 22.23, flow: 1.04 }, { head: 20.9, flow: 1.52 },
              { head: 19.27, flow: 2.01 }, { head: 17.84, flow: 2.48 }, { head: 16.31, flow: 3.04 },
              { head: 15.19, flow: 3.47 }, { head: 12.03, flow: 4.46 }, { head: 9.48, flow: 4.99 },
              { head: 7.34, flow: 5.45 }, { head: 5.3, flow: 5.88 },
            ],
            equipment: [
              { name: "Surface Pump", quantity: 1, unit: "Piece", price: 29000 },
              { name: "Pump Controller", quantity: 1, unit: "Piece", price: 9500 },
              { name: "Solar Panel", quantity: 5, unit: "Piece", price: 6500 },
              { name: "Cable", quantity: 1, unit: "Roll", price: 2500 },
              { name: "Pipe", quantity: 1, unit: "Roll", price: 3000 },
              { name: "Accessories", quantity: 1, unit: "Set", price: 2000 },
            ],
          },
        ],
      },
      {
        id: "ac-surface",
        name: "AC Surface Pump",
        models: [],
      },
    ],
  },
];

export function getAllPumpModels(): PumpModel[] {
  return pumpCategories.flatMap((category) =>
    category.subCategories.flatMap((sub) => sub.models)
  );
}

export function getPumpModel(id: string): PumpModel | undefined {
  return getAllPumpModels().find((model) => model.id === id);
}

export function getEquipmentTotal(equipment: EquipmentItem[]): number {
  return equipment.reduce((sum, item) => sum + item.price * item.quantity, 0);
}