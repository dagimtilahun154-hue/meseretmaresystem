import { Product } from "./data";

export type WaterSource = "Borehole" | "River" | "Pond";
export type SurveyStatus = "Draft" | "Recommended" | "Manager Approved" | "Quotation Sent" | "Converted to Sale";

export interface PerformancePoint {
  head: number; // meters
  flow: number; // L/min
}

export interface PumpProduct extends Product {
  brand: string;
  model: string;
  productCode: string;
  pumpType: "Submersible" | "Surface";
  suitableSources: WaterSource[];
  maxHead: number;
  maxFlow: number;
  powerWatt: number;
  voltage: string;
  controllerType: string;
  recommendedSolarPanelWatt: number;
  outletSize: string;
  performanceTable: PerformancePoint[];
}

export interface SiteSurvey {
  id: string;
  customerName: string;
  phoneNumber: string;
  location: string;
  gps?: string;
  waterSource: WaterSource;
  purpose: string;
  dailyWaterNeed: number; // Liters
  boreholeDepth?: number;
  staticWaterLevel?: number;
  tankHeight: number;
  pipeDistance: number;
  pipeSize: string;
  landSize: string;
  employeeName: string;
  surveyDate: string;
  notes?: string;
  photosAvailable: boolean;
  photoReason?: string;
  status: SurveyStatus;
  
  // Results
  calculatedTDH?: number;
  requiredFlowMin?: number;
  recommendedPumpId?: string;
  selectionReason?: string;
}

export const PIPE_SIZES = ["1\"", "1.25\"", "1.5\"", "2\"", "2.5\"", "3\"", "4\""];

export function calculateTDH(survey: Partial<SiteSurvey>): number {
  const lift = Number(survey.tankHeight) || 0;
  const staticLevel = survey.waterSource === "Borehole" ? (Number(survey.staticWaterLevel) || 0) : 0;
  const frictionLoss = (Number(survey.pipeDistance) || 0) * 0.03; 
  return Number((lift + staticLevel + frictionLoss).toFixed(1));
}

export function calculateRequiredFlow(dailyNeed: number, sunHours: number = 5): number {
  if (dailyNeed <= 0) return 0;
  const hourly = dailyNeed / sunHours;
  return Number((hourly / 60).toFixed(1));
}

export function getFlowAtHead(pump: PumpProduct, head: number): number {
  const table = pump.performanceTable;
  const sorted = [...table].sort((a, b) => a.head - b.head);
  if (head <= sorted[0].head) return sorted[0].flow;
  if (head >= sorted[sorted.length - 1].head) return 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i+1];
    if (head >= p1.head && head <= p2.head) {
      const flow = p1.flow + ((head - p1.head) * (p2.flow - p1.flow) / (p2.head - p1.head));
      return Number(flow.toFixed(1));
    }
  }
  return 0;
}

export type MatchResult = {
  pump: PumpProduct;
  flowAtHead: number;
  suitability: "Suitable" | "Oversized" | "Low Capacity" | "Out of Stock";
  reason: string;
};

export function findSuitablePumps(survey: Partial<SiteSurvey>, pumps: PumpProduct[] = []): MatchResult[] {
  const tdh = calculateTDH(survey);
  const reqFlow = calculateRequiredFlow(Number(survey.dailyWaterNeed) || 0);
  const results: MatchResult[] = [];
  pumps.forEach(pump => {
    if (survey.waterSource && !pump.suitableSources.includes(survey.waterSource)) return;
    const flowAtHead = getFlowAtHead(pump, tdh);
    let suitability: MatchResult["suitability"] = "Suitable";
    let reason = "This pump meets the head and flow requirements.";
    if (pump.quantity <= 0) {
      suitability = "Out of Stock";
      reason = "Suitable capacity but currently out of stock.";
    } else if (flowAtHead < reqFlow) {
      suitability = "Low Capacity";
      reason = `Flow at ${tdh}m is ${flowAtHead} L/min, which is below required ${reqFlow} L/min.`;
    } else if (flowAtHead > reqFlow * 2.5) {
      suitability = "Oversized";
      reason = "Capacity is much higher than needed.";
    }
    results.push({ pump, flowAtHead, suitability, reason });
  });
  return results.sort((a, b) => {
    if (a.pump.quantity > 0 && b.pump.quantity <= 0) return -1;
    if (a.pump.quantity <= 0 && b.pump.quantity > 0) return 1;
    const rank = { Suitable: 0, Oversized: 1, "Low Capacity": 2, "Out of Stock": 3 };
    if (rank[a.suitability] !== rank[b.suitability]) return rank[a.suitability] - rank[b.suitability];
    return Math.abs(a.flowAtHead - reqFlow) - Math.abs(b.flowAtHead - reqFlow);
  });
}
