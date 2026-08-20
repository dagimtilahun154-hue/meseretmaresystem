import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Phone, MapPin, Droplets, Sun, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { ExecutiveDocumentPdfTemplate } from "@/components/pdf/ExecutiveDocumentPdfTemplate";

interface SizingProposalPdfModalProps {
  proposal: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SizingProposalPdfModal({ proposal, open, onOpenChange }: SizingProposalPdfModalProps) {
  if (!proposal) return null;

  const handlePrint = () => {
    window.print();
  };

  const clientName = proposal.clientName || proposal.customerName || "Valued Client";
  const phone = proposal.phoneNumber || proposal.phone || "+251 911 000 000";
  const location = proposal.location || "Ethiopia";
  const date = proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  const pumpModel = proposal.selectedPumpModel || proposal.pumpModel || "Solar Flow Premium Pump System";
  const dailyWater = proposal.dailyWaterNeed || proposal.waterRequirement || 50;
  const headLift = proposal.headLift || proposal.verticalLift || 100;
  const wattage = proposal.solarWattage || proposal.panelPower || 1200;
  const inverter = proposal.inverterRating || "3.0 KW MPPT Smart Inverter";
  const totalPrice = proposal.totalCost || proposal.totalPrice || 250000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-card border-border shadow-2xl rounded-2xl print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Solar Pump Technical & Commercial Proposal - {clientName}</DialogTitle>
          <DialogDescription>Official printable solar pump sizing proposal document</DialogDescription>
        </DialogHeader>

        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-slate-950 font-bold uppercase text-[10px]">
              OFFICIAL PROPOSAL PREVIEW
            </Badge>
            <span className="text-xs text-slate-300 font-mono">PROPOSAL #{proposal.id || "SZ-1001"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* Printable Executive PDF Component */}
        <div className="hidden print:block">
          <ExecutiveDocumentPdfTemplate
            data={{
              documentTitle: "Solar Pumping System Technical & Commercial Proposal",
              subtitle: "Meseret Mare Engineering Turnkey Proposal",
              refNumber: proposal.id || "SZ-1001",
              date,
              clientSection: {
                title: "CLIENT & SITE INFORMATION",
                fields: [
                  { label: "Client Full Name", value: clientName },
                  { label: "Contact Phone", value: phone },
                  { label: "Installation Site", value: location },
                  { label: "Application", value: "Agricultural & Rural Water Supply" },
                  { label: "Quote Validity", value: "15 Working Days" },
                ]
              },
              secondarySection: {
                title: "HYDRAULIC & WATER DEMAND SPECIFICATIONS",
                fields: [
                  { label: "Daily Water Demand", value: `${dailyWater} m³/day` },
                  { label: "Total Dynamic Lift", value: `${headLift} Meters` },
                  { label: "Peak Solar Hours", value: "5.5 Peak Hours/Day" },
                  { label: "Hourly Flow Demand", value: `${(dailyWater / 5.5).toFixed(1)} m³/hr` },
                  { label: "Pumping System", value: pumpModel },
                ]
              },
              tableData: {
                title: "EQUIPMENT BILL OF MATERIALS (BOM)",
                headers: ["EQUIPMENT ITEM", "SPECIFICATION", "QTY", "WARRANTY"],
                rows: [
                  ["Solar Pump & Motor Unit", pumpModel, "1 Unit", "2 Years Replacement"],
                  ["Solar PV Panel Array", `${wattage}W Monocrystalline PV`, "1 Array", "10 Years Performance"],
                  ["MPPT Smart Controller", inverter, "1 Unit", "2 Years Replacement"],
                  ["Mounting Structure & Cables", "Galvanized Frame & Submersible Cable", "1 Set", "1 Year Guarantee"],
                ]
              },
              financials: {
                totalFee: totalPrice,
                adjustments: 0,
                totalDue: totalPrice,
                payment1: totalPrice * 0.5,
                payment2: totalPrice * 0.5,
                balanceDue: totalPrice * 0.5,
              }
            }}
          />
        </div>

        {/* Printable Proposal Document Body (Web View) */}
        <div className="p-8 space-y-8 bg-white text-slate-900 font-sans print:hidden">
          {/* Header & Company Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950 text-base">
                  MM
                </div>
                <span className="text-2xl font-black tracking-wider text-slate-900 uppercase">MESERET MARE SOLAR ENGINEERING</span>
              </div>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Solar Water Pumping Systems & Rural Electrification Engineering
              </p>
              <p className="text-[11px] text-slate-500">
                HQ Address: Bole Sub-city, Addis Ababa, Ethiopia | Tell: +251 911 000 000 | Email: sales@meseretmare.et
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge className="bg-slate-900 text-amber-400 font-mono font-bold text-xs uppercase px-2.5 py-1">
                TECHNICAL PROPOSAL
              </Badge>
              <p className="text-xs font-mono font-bold text-slate-700 block pt-1">DATE: {date}</p>
              <p className="text-[11px] text-slate-500 font-mono block">REF ID: {proposal.id || "SZ-1001"}</p>
            </div>
          </div>

          {/* Client & Site Information Card */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">CLIENT INFORMATION</span>
              <p className="text-base font-bold text-slate-900">{clientName}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-amber-600" /> {phone}
              </p>
            </div>
            <div className="space-y-1.5 border-l border-slate-200 pl-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">INSTALLATION SITE</span>
              <p className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-amber-600" /> {location}
              </p>
              <p className="text-xs text-slate-600">Application: Agricultural & Rural Water Supply</p>
            </div>
          </div>

          {/* Hydraulic Site Calculation Analysis */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b pb-2">
              <Droplets className="h-4 w-4 text-sky-600" /> SECTION 1: HYDRAULIC & WATER DEMAND ANALYSIS
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                <span className="text-[10px] font-bold text-sky-700 uppercase block">Daily Water Need</span>
                <span className="text-xl font-black text-sky-950">{dailyWater} m³/day</span>
                <span className="text-[10px] text-sky-600 block">Required Discharge Volume</span>
              </div>
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                <span className="text-[10px] font-bold text-sky-700 uppercase block">Total Vertical Lift (Head)</span>
                <span className="text-xl font-black text-sky-950">{headLift} Meters</span>
                <span className="text-[10px] text-sky-600 block">Dynamic Pumping Head</span>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Peak Solar Irradiance</span>
                <span className="text-xl font-black text-amber-950">5.5 Peak Hours</span>
                <span className="text-[10px] text-amber-600 block">Average Solar Radiation</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Flow Rate Demand</span>
                <span className="text-xl font-black text-emerald-950">{(dailyWater / 5.5).toFixed(1)} m³/hr</span>
                <span className="text-[10px] text-emerald-600 block">Calculated hourly flow</span>
              </div>
            </div>
          </div>

          {/* Sized Equipment Technical Specifications Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b pb-2">
              <Sun className="h-4 w-4 text-amber-500" /> SECTION 2: RECOMMENDED SOLAR PUMP SYSTEM SPECIFICATIONS
            </h3>

            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-left">Equipment Component</th>
                  <th className="p-3 text-left">Technical Model / Rating</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Warranty Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50 font-bold">
                  <td className="p-3 text-slate-900">Solar Submersible / Surface Pump</td>
                  <td className="p-3 text-amber-700">{pumpModel}</td>
                  <td className="p-3 text-center">1 Unit</td>
                  <td className="p-3 text-right text-emerald-700">2 Years Full Replacement</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Solar PV Module Array</td>
                  <td className="p-3 text-slate-700">{wattage}W High-Efficiency Monocrystalline Panels</td>
                  <td className="p-3 text-center">1 Array Set</td>
                  <td className="p-3 text-right text-emerald-700">10 Years Performance</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">MPPT Solar Controller / Inverter</td>
                  <td className="p-3 text-slate-700">{inverter}</td>
                  <td className="p-3 text-center">1 Unit</td>
                  <td className="p-3 text-right text-emerald-700">2 Years Warranty</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Mounting Structure & Accessories</td>
                  <td className="p-3 text-slate-700">Galvanized Steel Frame, Submersible Cable, MC4 & Well Head</td>
                  <td className="p-3 text-center">1 Full Set</td>
                  <td className="p-3 text-right text-emerald-700">1 Year Installation Guarantee</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Commercial Financial Schedule */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b pb-2">
              <Zap className="h-4 w-4 text-emerald-600" /> SECTION 3: COMMERCIAL COST BREAKDOWN & INVESTMENT
            </h3>

            <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">TOTAL TURNKEY SYSTEM PRICE</span>
                <span className="text-2xl font-black text-amber-400">{formatCurrency(totalPrice)} ETB</span>
                <span className="text-[10px] text-slate-400 block pt-0.5">Includes Equipment Supply, Transport, Installation, & Testing</span>
              </div>
              <div className="text-right space-y-1">
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">INCLUDES ALL APPLICABLE TAXES</Badge>
                <p className="text-[10px] text-slate-300">Quote Validity: 15 Working Days</p>
              </div>
            </div>
          </div>

          {/* Sign-off & Approval Section */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div className="space-y-8">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">PREPARED BY (MESERET MARE TECHNICAL TEAM)</span>
              <div className="border-b border-slate-400 pb-1">
                <p className="text-xs font-bold text-slate-900">Eng. Technical Manager / Lead Sizing Specialist</p>
              </div>
              <p className="text-[10px] text-slate-500">Sign & Stamp: ______________________</p>
            </div>
            <div className="space-y-8">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">CLIENT ACCEPTANCE SIGNATURE</span>
              <div className="border-b border-slate-400 pb-1">
                <p className="text-xs font-bold text-slate-900">{clientName}</p>
              </div>
              <p className="text-[10px] text-slate-500">Sign & Date: ______________________</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
