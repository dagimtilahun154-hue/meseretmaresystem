/**
 * CSV Export Utility
 */

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function generateVATExport(records: any[]) {
  const headers = ["Date", "Customer Name", "Receipt Number", "VAT Amount", "Note"];
  const rows = records.map(r => [
    r.date,
    `"${r.customerName}"`,
    `"${r.receiptNumber}"`,
    r.vatAmount,
    `"${r.note}"`
  ]);
  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

export function generatePayrollExport(workers: any[]) {
  const headers = ["Worker Name", "Month", "Gross Salary", "Income Tax", "Emp. Pension", "Empr. Pension", "Net Salary", "Status"];
  const rows = workers.flatMap(w => 
    w.history.map((h: any) => [
      `"${w.name}"`,
      h.month,
      h.grossSalary,
      h.incomeTax,
      h.employeePension,
      h.employerPension,
      h.netSalary,
      h.status
    ])
  );
  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

export function generateCashFlowExport(entries: any[]) {
  const headers = ["Date", "Type", "Category", "Amount", "Description"];
  const rows = entries.map(e => [
    e.date,
    e.type,
    `"${e.category}"`,
    e.amount,
    `"${e.description}"`
  ]);
  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}
