import { Product } from "./data";

export type WaterSource = "Borehole" | "River" | "Pond" | "Shallow Well" | "Storage Tank";
export type PowerSourceMode = "FULL_SOLAR" | "PUMP_ONLY";
export type SurveyStatus = "Draft" | "Recommended" | "Manager Approved" | "Quotation Sent" | "Converted to Sale";

export interface PerformancePoint {
  head: number; // meters
  flow: number; // m3/h or L/min
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
  powerMode: PowerSourceMode;
  purpose: string;
  dailyWaterNeed: number; // m3/day or Liters
  
  // Detailed Borehole & Hydraulic Parameters
  staticWaterLevel?: number; // meters from surface
  dynamicDrawdown?: number;   // meters drawdown when pumping
  tankHeight: number;         // elevation to tank inlet (meters)
  pipeDistance: number;       // total pipe run (meters)
  pipeSize: string;           // pipe diameter (inches)
  
  landSize?: string;
  employeeName: string;
  surveyDate: string;
  notes?: string;
  photosAvailable: boolean;
  photoReason?: string;
  status: SurveyStatus;
  
  // Results
  calculatedTDH?: number;
  frictionHead?: number;
  requiredFlowM3h?: number;
  recommendedPumpId?: string;
  selectionReason?: string;
  
  // Solar Array Sizing Results
  solarArrayWatt?: number;
  panelCount?: number;
  panelUnitWatt?: number;
  stringConfig?: string;
}

export const PIPE_SIZES = ["1\"", "1.25\"", "1.5\"", "2\"", "2.5\"", "3\"", "4\""];

/**
 * Calculates friction loss (meters) per 100m of pipe based on diameter and nominal flow.
 */
export function getFrictionLossPer100m(diameterInch: number): number {
  if (diameterInch <= 1.0) return 5.0;
  if (diameterInch <= 1.25) return 3.2;
  if (diameterInch <= 1.5) return 2.0;
  if (diameterInch <= 2.0) return 1.0;
  if (diameterInch <= 3.0) return 0.4;
  return 0.2; // 4" or higher
}

/**
 * Total Dynamic Head (TDH) calculation (Industrial Standard)
 * TDH = Static Water Level + Dynamic Drawdown + Tank Elevation + Piping Friction Loss
 */
export function calculateTDH(survey: {
  staticWaterLevel?: number;
  dynamicDrawdown?: number;
  tankHeight?: number;
  pipeDistance?: number;
  pipeDiameterInch?: number;
  waterSource?: string;
}): { tdh: number; staticLift: number; frictionLoss: number } {
  const staticLevel = Number(survey.staticWaterLevel) || 0;
  const drawdown = Number(survey.dynamicDrawdown) || 0;
  const tankElevation = Number(survey.tankHeight) || 0;
  const pipeLen = Number(survey.pipeDistance) || 0;
  const diameter = Number(survey.pipeDiameterInch) || 1.25;

  const staticLift = staticLevel + drawdown + tankElevation;
  const frictionPer100 = getFrictionLossPer100m(diameter);
  const frictionLoss = Number(((pipeLen / 100) * frictionPer100).toFixed(2));
  const tdh = Number((staticLift + frictionLoss).toFixed(2));

  return { tdh: Math.max(1, tdh), staticLift, frictionLoss };
}

/**
 * Required Hourly Flow Rate (m3/h) based on daily demand and local Peak Sun Hours (PSH)
 */
export function calculateRequiredFlow(dailyNeedM3: number, peakSunHours: number = 5.5): number {
  if (dailyNeedM3 <= 0 || peakSunHours <= 0) return 0;
  return Number((dailyNeedM3 / peakSunHours).toFixed(2));
}

/**
 * Dynamic Solar PV Array Sizing (Engineered standard: 1.25x - 1.35x pump power)
 * Intelligently suggests optimal module wattage (550W / 650W) based on pump motor size.
 */
export function calculateSolarArrayRequirements(
  pumpPowerWatt: number,
  panelUnitWatt?: number,
  deratingFactor: number = 1.30
): {
  totalArrayWatt: number;
  panelCount: number;
  moduleWattage: number;
  stringConfig: string;
  estimatedVoc: number;
  estimatedVmp: number;
  isVoltageSafe: boolean;
} {
  const effectivePanelWatt = panelUnitWatt && panelUnitWatt > 0 
    ? panelUnitWatt 
    : (pumpPowerWatt >= 3500 ? 650 : 550);

  if (pumpPowerWatt <= 0) {
    return {
      totalArrayWatt: 0,
      panelCount: 0,
      moduleWattage: effectivePanelWatt,
      stringConfig: "None",
      estimatedVoc: 0,
      estimatedVmp: 0,
      isVoltageSafe: true
    };
  }

  const rawArrayWatt = pumpPowerWatt * deratingFactor;
  const panelCount = Math.max(2, Math.ceil(rawArrayWatt / effectivePanelWatt));
  const totalArrayWatt = panelCount * effectivePanelWatt;

  // Typical Tier-1 550W/650W Module: Voc ~ 49.8V/55.2V, Vmp ~ 41.5V/46.0V
  const moduleVoc = effectivePanelWatt >= 600 ? 55.2 : 49.8;
  const moduleVmp = effectivePanelWatt >= 600 ? 46.0 : 41.5;

  let stringConfig = `${panelCount} in series (1S × ${panelCount}P)`;
  let estimatedVoc = panelCount * moduleVoc;
  let estimatedVmp = panelCount * moduleVmp;

  // If Voc exceeds typical DC controller limit (430V), split into parallel strings
  if (estimatedVoc > 420 && panelCount >= 4 && panelCount % 2 === 0) {
    const panelsPerString = panelCount / 2;
    estimatedVoc = panelsPerString * moduleVoc;
    estimatedVmp = panelsPerString * moduleVmp;
    stringConfig = `2 parallel strings of ${panelsPerString} panels (${panelsPerString}S × 2P)`;
  }

  const isVoltageSafe = estimatedVoc <= 430;

  return {
    totalArrayWatt,
    panelCount,
    moduleWattage: effectivePanelWatt,
    stringConfig,
    estimatedVoc: Number(estimatedVoc.toFixed(1)),
    estimatedVmp: Number(estimatedVmp.toFixed(1)),
    isVoltageSafe
  };
}


/**
 * Submersible Cable Sizer to keep voltage drop under 3%
 */
export function sizeSubmersibleCable(
  motorPowerWatt: number,
  motorVoltage: number,
  cableLengthMeters: number
): { recommendedSizeMm2: string; voltageDropPercent: number } {
  const currentAmp = motorPowerWatt / (motorVoltage || 220);
  const copperResistivity = 0.0175; // Ohm * mm2 / m

  // Test standard sizes: 2.5mm2, 4.0mm2, 6.0mm2, 10.0mm2
  const sizes = [2.5, 4.0, 6.0, 10.0, 16.0];
  for (const size of sizes) {
    const loopResistance = (2 * cableLengthMeters * copperResistivity) / size;
    const vDrop = currentAmp * loopResistance;
    const vDropPercent = (vDrop / (motorVoltage || 220)) * 100;
    if (vDropPercent <= 3.0 || size === 16.0) {
      return {
        recommendedSizeMm2: `${size} mm²`,
        voltageDropPercent: Number(vDropPercent.toFixed(2))
      };
    }
  }

  return { recommendedSizeMm2: "4.0 mm²", voltageDropPercent: 2.1 };
}

export function getFlowAtHead(pump: PumpProduct, head: number): number {
  const table = pump.performanceTable;
  if (!table || table.length === 0) return 0;
  
  const sorted = [...table].sort((a, b) => a.head - b.head);
  if (head <= sorted[0].head) return sorted[0].flow;
  if (head >= sorted[sorted.length - 1].head) return 0;

  let low = 0;
  let high = sorted.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (sorted[mid].head <= head) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const p1 = sorted[low];
  const p2 = sorted[high];
  const flow = p1.flow + ((head - p1.head) * (p2.flow - p1.flow) / (p2.head - p1.head || 1));
  return Number(flow.toFixed(2));
}

export type MatchResult = {
  pump: PumpProduct;
  flowAtHead: number;
  suitability: "Suitable" | "Oversized" | "Low Capacity" | "Out of Stock";
  reason: string;
};

export function findSuitablePumps(survey: Partial<SiteSurvey>, pumps: PumpProduct[] = []): MatchResult[] {
  const { tdh } = calculateTDH({
    staticWaterLevel: survey.staticWaterLevel,
    dynamicDrawdown: survey.dynamicDrawdown,
    tankHeight: survey.tankHeight,
    pipeDistance: survey.pipeDistance,
    pipeDiameterInch: Number(survey.pipeSize?.replace('"', '')) || 1.25,
    waterSource: survey.waterSource
  });

  const reqFlow = calculateRequiredFlow(Number(survey.dailyWaterNeed) || 0);
  const results: MatchResult[] = [];
  
  pumps.forEach(pump => {
    if (survey.waterSource && !pump.suitableSources?.includes(survey.waterSource)) return;
    const flowAtHead = getFlowAtHead(pump, tdh);
    let suitability: MatchResult["suitability"] = "Suitable";
    let reason = "This pump meets the head and flow requirements.";
    if (pump.quantity <= 0) {
      suitability = "Out of Stock";
      reason = "Suitable capacity but currently out of stock.";
    } else if (flowAtHead < reqFlow) {
      suitability = "Low Capacity";
      reason = `Flow at ${tdh}m is ${flowAtHead} m³/h, which is below required ${reqFlow} m³/h.`;
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

