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

export interface PipeFittings {
  elbows90?: number;     // 3.0m equivalent pipe length each (Page 210 standard)
  gateValves?: number;   // 0.6m equivalent pipe length each
  checkValves?: number;  // 5.2m equivalent pipe length each (Non-return valve)
}

export interface EnvironmentalConditions {
  altitudeM?: number;    // meters above sea level (Derating: 3.5% per 300m above 150m)
  ambientTempC?: number; // degrees Celsius (Derating: 2% per 5.5°C above 30°C)
  humidityPercent?: number;
}

export interface MonthlyProductionItem {
  month: string;
  monthIndex: number;
  psh: number;             // Peak Sun Hours (kWh/m2/day)
  dailyProductionM3: number; // m3/day
  monthlyTotalM3: number;   // m3/month
  weeklyYieldM3: number;    // m3/week
  requiredDailyM3: number;
  surplusDeficitM3: number; // Daily surplus (+) or deficit (-) compared to required
  status: "Surplus" | "Balanced" | "Deficit";
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
  groundElevation?: number;   // elevation difference from well head to tank base (meters)
  pipeDistance: number;       // total pipe run (meters)
  dropPipeLength?: number;    // submersible drop pipe inside borehole (meters)
  pipeSize: string;           // pipe diameter (inches)
  
  // Pipe Fittings (Page 210 standard)
  fittings?: PipeFittings;

  // Environmental conditions
  environment?: EnvironmentalConditions;
  
  landSize?: string;
  employeeName: string;
  surveyDate: string;
  notes?: string;
  photosAvailable: boolean;
  photoReason?: string;
  status: SurveyStatus;
  
  // Results
  calculatedTDH?: number;
  staticLift?: number;
  frictionHead?: number;
  fittingsEquivalentLength?: number;
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
 * Standard Pipe Fittings Equivalent Pipe Lengths in meters (Page 210 / Annex A Standard)
 */
export const FITTINGS_EQUIVALENT_LENGTH = {
  elbow90: 3.0,     // 90 degree standard elbow = 3.0m
  gateValve: 0.6,   // Full-port gate valve = 0.6m
  checkValve: 5.2,  // Non-return / check valve = 5.2m
};

/**
 * Computes total equivalent straight pipe length (meters) introduced by pipe fittings
 */
export function calculateFittingsEquivalentLength(fittings?: PipeFittings): number {
  if (!fittings) return 0;
  const elbows = Number(fittings.elbows90) || 0;
  const gateValves = Number(fittings.gateValves) || 0;
  const checkValves = Number(fittings.checkValves) || 0;

  const eqLen = (elbows * FITTINGS_EQUIVALENT_LENGTH.elbow90) +
                (gateValves * FITTINGS_EQUIVALENT_LENGTH.gateValve) +
                (checkValves * FITTINGS_EQUIVALENT_LENGTH.checkValve);

  return Number(eqLen.toFixed(2));
}

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
 * Total Dynamic Head (TDH) calculation (Strict Page 210 / Annex A Standard)
 * TDH = Static Water Level + Dynamic Drawdown + Ground Elevation + Tank Height + (Effective Pipe Length * Friction Coefficient)
 */
export function calculateTDH(survey: {
  staticWaterLevel?: number;
  dynamicDrawdown?: number;
  tankHeight?: number;
  groundElevation?: number;
  pipeDistance?: number;
  dropPipeLength?: number;
  pipeDiameterInch?: number;
  waterSource?: string;
  fittings?: PipeFittings;
}): {
  tdh: number;
  staticLift: number;
  frictionLoss: number;
  fittingsEquivalentLength: number;
  effectiveTotalPipeLength: number;
} {
  const staticLevel = Number(survey.staticWaterLevel) || 0;
  const drawdown = Number(survey.dynamicDrawdown) || 0;
  const tankElevation = Number(survey.tankHeight) || 0;
  const groundElev = Number(survey.groundElevation) || 0;
  const pipeLen = Number(survey.pipeDistance) || 0;
  const dropPipe = Number(survey.dropPipeLength) || 0;
  const diameter = Number(survey.pipeDiameterInch) || 1.25;

  // 1. Static Lift (Vertical component)
  const staticLift = staticLevel + drawdown + groundElev + tankElevation;

  // 2. Pipe Fittings equivalent length (Page 210)
  const fittingsEqLen = calculateFittingsEquivalentLength(survey.fittings);

  // 3. Effective Total Pipe Length for friction
  const effectiveTotalPipeLength = pipeLen + dropPipe + fittingsEqLen;

  // 4. Friction Head Loss
  const frictionPer100 = getFrictionLossPer100m(diameter);
  const frictionLoss = Number(((effectiveTotalPipeLength / 100) * frictionPer100).toFixed(2));

  // 5. Total Dynamic Head
  const tdh = Number((staticLift + frictionLoss).toFixed(2));

  return {
    tdh: Math.max(1, tdh),
    staticLift: Number(staticLift.toFixed(2)),
    frictionLoss,
    fittingsEquivalentLength: fittingsEqLen,
    effectiveTotalPipeLength: Number(effectiveTotalPipeLength.toFixed(2)),
  };
}

/**
 * Environmental Derating Factors (Page 208 / Annex A Standard)
 */
export function calculateEnvironmentalDerating(env?: EnvironmentalConditions): {
  altitudeLossPercent: number;
  tempLossPercent: number;
  totalDeratingFactor: number;
  combinedMultiplier: number;
} {
  const alt = Number(env?.altitudeM) || 540; // Default ~540m if unspecified
  const temp = Number(env?.ambientTempC) || 30;

  // Altitude derating: 3.5% loss for every 300m above 150m sea level
  let altLoss = 0;
  if (alt > 150) {
    altLoss = ((alt - 150) / 300) * 3.5;
  }

  // Temperature derating: 2% loss for every 5.5°C above 30°C
  let tempLoss = 0;
  if (temp > 30) {
    tempLoss = ((temp - 30) / 5.5) * 2.0;
  }

  const totalLossPercent = Math.min(30, altLoss + tempLoss);
  const totalDeratingFactor = Number((1 - (totalLossPercent / 100)).toFixed(3));
  const combinedMultiplier = Number((1 / totalDeratingFactor).toFixed(3));

  return {
    altitudeLossPercent: Number(altLoss.toFixed(2)),
    tempLossPercent: Number(tempLoss.toFixed(2)),
    totalDeratingFactor,
    combinedMultiplier,
  };
}

/**
 * Required Hourly Flow Rate (m3/h) based on daily demand and local Peak Sun Hours (PSH)
 */
export function calculateRequiredFlow(dailyNeedM3: number, peakSunHours: number = 5.5): number {
  if (dailyNeedM3 <= 0 || peakSunHours <= 0) return 0;
  return Number((dailyNeedM3 / peakSunHours).toFixed(2));
}

/**
 * 12-Month & Weekly Water Production Engine (Standard Formula from pumpsacerage dialy production.xlsx)
 * Formula: Daily Water (m3/day) = [PumpPower(kW) * 0.65 * PSH * 0.85] / [0.0027525 * TDH]
 */
export const HYDRAULIC_ENERGY_CONSTANT = 0.0027525; // kWh / (m3 * m)
export const WIRE_TO_WATER_EFFICIENCY = 0.65;
export const PV_DERATING_FACTOR = 0.85;

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Standard Ethiopian Regional PSH Baseline (kWh/m2/day)
export const ETHIOPIAN_BASELINE_PSH = [5.95, 6.34, 6.49, 6.71, 6.45, 5.84, 5.35, 5.37, 5.94, 6.20, 6.08, 5.76];

export function calculateDailyWaterProductionM3(
  pumpPowerKw: number,
  tdh: number,
  psh: number,
  wireToWaterEff: number = WIRE_TO_WATER_EFFICIENCY,
  derating: number = PV_DERATING_FACTOR
): number {
  if (pumpPowerKw <= 0 || tdh <= 0 || psh <= 0) return 0;
  const numerator = pumpPowerKw * wireToWaterEff * psh * derating;
  const denominator = HYDRAULIC_ENERGY_CONSTANT * tdh;
  return Number((numerator / denominator).toFixed(2));
}

export function calculate12MonthProductionSchedule(
  pumpPowerKw: number,
  tdh: number,
  monthlyPshList?: number[],
  requiredDailyM3: number = 0
): {
  monthlySchedule: MonthlyProductionItem[];
  annualTotalM3: number;
  averageDailyProductionM3: number;
  minMonth: MonthlyProductionItem;
  maxMonth: MonthlyProductionItem;
} {
  const pshList = (monthlyPshList && monthlyPshList.length === 12) ? monthlyPshList : ETHIOPIAN_BASELINE_PSH;
  
  const monthlySchedule: MonthlyProductionItem[] = pshList.map((psh, idx) => {
    const dailyM3 = calculateDailyWaterProductionM3(pumpPowerKw, tdh, psh);
    const days = DAYS_IN_MONTH[idx];
    const monthlyTotalM3 = Number((dailyM3 * days).toFixed(1));
    const weeklyYieldM3 = Number((dailyM3 * 7).toFixed(1));
    const surplusDeficitM3 = Number((dailyM3 - requiredDailyM3).toFixed(2));
    
    let status: "Surplus" | "Balanced" | "Deficit" = "Balanced";
    if (requiredDailyM3 > 0) {
      if (surplusDeficitM3 > 0.5) status = "Surplus";
      else if (surplusDeficitM3 < -0.5) status = "Deficit";
    }

    return {
      month: MONTH_NAMES[idx],
      monthIndex: idx + 1,
      psh: Number(psh.toFixed(2)),
      dailyProductionM3: dailyM3,
      monthlyTotalM3,
      weeklyYieldM3,
      requiredDailyM3,
      surplusDeficitM3,
      status,
    };
  });

  const annualTotalM3 = Number(monthlySchedule.reduce((acc, m) => acc + m.monthlyTotalM3, 0).toFixed(1));
  const averageDailyProductionM3 = Number((annualTotalM3 / 365).toFixed(2));

  // Find min and max production months
  const sorted = [...monthlySchedule].sort((a, b) => a.dailyProductionM3 - b.dailyProductionM3);
  const minMonth = sorted[0];
  const maxMonth = sorted[sorted.length - 1];

  return {
    monthlySchedule,
    annualTotalM3,
    averageDailyProductionM3,
    minMonth,
    maxMonth,
  };
}

/**
 * Dynamic Solar PV Array Sizing (Engineered standard: 1.25x - 1.35x pump power)
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

  // Test standard sizes: 2.5mm2, 4.0mm2, 6.0mm2, 10.0mm2, 16.0mm2
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

/**
 * Strict bounded flow evaluation at given Head.
 * HARD-CLAMPED: If target head exceeds the manufacturer's maximum physical cutoff (maxHead), flow is strictly 0.
 */
export function getFlowAtHead(pump: PumpProduct, head: number): number {
  const table = pump.performanceTable;
  if (!table || table.length === 0) return 0;
  
  // Sort by head ascending
  const sorted = [...table].sort((a, b) => a.head - b.head);
  const minHead = sorted[0].head;
  const maxHead = pump.maxHead || sorted[sorted.length - 1].head;

  // Strict physical bounds
  if (head > maxHead) return 0;
  if (head <= minHead) return sorted[0].flow;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (head >= sorted[i].head && head <= sorted[i + 1].head) {
      const h1 = sorted[i].head;
      const h2 = sorted[i + 1].head;
      const f1 = sorted[i].flow;
      const f2 = sorted[i + 1].flow;
      const flow = f1 + ((head - h1) * (f2 - f1)) / (h2 - h1 || 1);
      return Number(flow.toFixed(2));
    }
  }

  return 0;
}

export type MatchResult = {
  pump: PumpProduct;
  flowAtHead: number;
  suitability: "Suitable" | "Oversized" | "Low Capacity" | "Out of Stock" | "Exceeds Head Limit";
  reason: string;
};

export function findSuitablePumps(survey: Partial<SiteSurvey>, pumps: PumpProduct[] = []): MatchResult[] {
  const { tdh } = calculateTDH({
    staticWaterLevel: survey.staticWaterLevel,
    dynamicDrawdown: survey.dynamicDrawdown,
    tankHeight: survey.tankHeight,
    groundElevation: survey.groundElevation,
    pipeDistance: survey.pipeDistance,
    dropPipeLength: survey.dropPipeLength,
    pipeDiameterInch: Number(survey.pipeSize?.replace('"', '')) || 1.25,
    waterSource: survey.waterSource,
    fittings: survey.fittings,
  });

  const reqFlow = calculateRequiredFlow(Number(survey.dailyWaterNeed) || 0);
  const results: MatchResult[] = [];
  
  pumps.forEach((pump) => {
    if (survey.waterSource && !pump.suitableSources?.includes(survey.waterSource)) return;
    
    // Check if TDH exceeds pump maximum head
    if (pump.maxHead && tdh > pump.maxHead) {
      results.push({
        pump,
        flowAtHead: 0,
        suitability: "Exceeds Head Limit",
        reason: `Target TDH of ${tdh}m exceeds pump's maximum head limit of ${pump.maxHead}m.`,
      });
      return;
    }

    const flowAtHead = getFlowAtHead(pump, tdh);
    let suitability: MatchResult["suitability"] = "Suitable";
    let reason = "This pump meets the head and flow requirements.";
    
    if (pump.quantity <= 0) {
      suitability = "Out of Stock";
      reason = "Suitable capacity but currently out of stock in warehouse.";
    } else if (flowAtHead <= 0) {
      suitability = "Exceeds Head Limit";
      reason = `At ${tdh}m head, this pump delivers 0 m³/h (cutoff exceeded).`;
    } else if (flowAtHead < reqFlow) {
      suitability = "Low Capacity";
      reason = `Flow at ${tdh}m is ${flowAtHead} m³/h, which is below required ${reqFlow} m³/h.`;
    } else if (flowAtHead > reqFlow * 2.5) {
      suitability = "Oversized";
      reason = `Capacity (${flowAtHead} m³/h) is significantly higher than required ${reqFlow} m³/h.`;
    }
    
    results.push({ pump, flowAtHead, suitability, reason });
  });

  return results.sort((a, b) => {
    if (a.pump.quantity > 0 && b.pump.quantity <= 0) return -1;
    if (a.pump.quantity <= 0 && b.pump.quantity > 0) return 1;
    const rank = { Suitable: 0, Oversized: 1, "Low Capacity": 2, "Out of Stock": 3, "Exceeds Head Limit": 4 };
    if (rank[a.suitability] !== rank[b.suitability]) return rank[a.suitability] - rank[b.suitability];
    return Math.abs(a.flowAtHead - reqFlow) - Math.abs(b.flowAtHead - reqFlow);
  });
}
