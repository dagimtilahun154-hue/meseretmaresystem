import { describe, it, expect } from "vitest";
import { generateVATExport, generatePayrollExport, generateCashFlowExport } from "../lib/export-utils";

describe("Export Utilities", () => {
  it("should generate VAT CSV content", () => {
    const records = [
      { date: "2026-03-10", customerName: "Test Customer", receiptNumber: "REC-001", vatAmount: 100, note: "Test note" }
    ];
    const csv = generateVATExport(records);
    expect(csv).toContain("Date,Customer Name,Receipt Number,VAT Amount,Note");
    expect(csv).toContain("2026-03-10,\"Test Customer\",\"REC-001\",100,\"Test note\"");
  });

  it("should generate Payroll CSV content", () => {
    const workers = [
      { id: "1", name: "John Doe", history: [
        { id: "h1", month: "2026-03", grossSalary: 5000, incomeTax: 500, employeePension: 350, employerPension: 550, netSalary: 4150, status: "pending" }
      ]}
    ];
    const csv = generatePayrollExport(workers);
    expect(csv).toContain("Worker Name,Month,Gross Salary,Income Tax,Emp. Pension,Empr. Pension,Net Salary,Status");
    expect(csv).toContain("\"John Doe\",2026-03,5000,500,350,550,4150,pending");
  });

  it("should generate Cash Flow CSV content", () => {
    const entries = [
      { date: "2026-03-15", type: "income", category: "Sales", amount: 1000, description: "Direct sale" }
    ];
    const csv = generateCashFlowExport(entries);
    expect(csv).toContain("Date,Type,Category,Amount,Description");
    expect(csv).toContain("2026-03-15,income,\"Sales\",1000,\"Direct sale\"");
  });
});
