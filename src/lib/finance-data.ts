export type RequestStatus = "pending" | "approved" | "rejected";

export interface CostRequest {
  id: string;
  title: string;
  source: "inventory" | "fieldwork" | "vat" | "other";
  amount: number;
  note: string;
  requestedBy: string;
  status: RequestStatus;
  date: string;
}

export interface BankReconciliationRecord {
  id: string;
  entity: "FZ" | "MM";
  bankName: string;
  accountNo: string;
  currency: string;
  reconciliationPeriod: string;
  preparedBy: string;
  reviewedBy: string;
  date: string;
  bankStatementBalance: number;
  depositInTransit: number;
  outstandingCheque: number;
  companyCashBook: number;
  bankCredits: number;
  bankCharges: number;
}

export interface ExpenseRequest {
  id: string;
  workerName: string;
  amount: number;
  note: string;
  requestedBy: string;
  status: RequestStatus;
  date: string;
}

export interface BuildingRentRecord {
  id: string;
  entity: "FZ" | "MM";
  month: string;
  floor: "Ground" | "1st Floor" | "2nd Floor" | "3rd Floor" | "4th Floor";
  roomNo: string;
  collection: string;
  rentPrice: number;
  amount: number;
  remark?: string;
  status: "paid" | "pending";
}

export interface BudgetRecord {
  id: string;
  entity?: "FZ" | "MM";
  type: "daily" | "monthly" | "yearly";
  amount: number;
  label: string;
  date: string;
}

export interface PayrollWorker {
  id: string;
  name: string;
  monthlySalary: number;
  history: PayrollEntry[];
}

export interface PayrollEntry {
  id: string;
  month: string;
  grossSalary: number;
  incomeTax: number;
  employeePension: number;
  employerPension: number;
  netSalary: number;
  status: "paid" | "pending";
  paidDate?: string;
}

export interface VATRecord {
  id: string;
  customerName: string;
  receiptNumber: string;
  vatAmount: number;
  note: string;
  date: string;
}

// --- Loan Management ---
export interface LoanRecord {
  id: string;
  entity: "FZ" | "MM";
  bankName: string;
  loanAmount: number;
  interestRate: number;
  remainingBalance: number;
  remainingAccrualInterest?: number;
  monthlyPayment: number;
  amountDue?: number;
  startDate: string;
  endDate: string;
  nextPaymentDate: string;
  repaymentScheduleDate?: string;
  remark?: string;
  followUp?: string;
  status: "active" | "completed" | "past_due";
  payments: LoanPayment[];
}

export interface LoanPayment {
  id: string;
  date: string;
  amount: number;
  note: string;
}

// --- Cash Flow ---
export interface CashFlowEntry {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  status?: RequestStatus;
}

// --- Bank Balance ---
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  lastUpdated: string;
}

// --- Petty Cash ---
export interface PettyCashEntry {
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  amount: number;
}

export interface PettyCashRecord {
  id: string;
  entity: "FZ" | "MM";
  beginningBalance: number;
  chequeNo: string;
  period: string;
  entries: PettyCashEntry[];
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  date: string;
}

// Ethiopian income tax calculation (2024 brackets)
export function calculateIncomeTax(grossSalary: number): number {
  if (grossSalary <= 600) return 0;
  if (grossSalary <= 1650) return (grossSalary - 600) * 0.10;
  if (grossSalary <= 3200) return 105 + (grossSalary - 1650) * 0.15;
  if (grossSalary <= 5250) return 337.5 + (grossSalary - 3200) * 0.20;
  if (grossSalary <= 7800) return 747.5 + (grossSalary - 5250) * 0.25;
  if (grossSalary <= 10900) return 1385 + (grossSalary - 7800) * 0.30;
  return 2315 + (grossSalary - 10900) * 0.35;
}

export const EMPLOYEE_PENSION_RATE = 0.07;
export const EMPLOYER_PENSION_RATE = 0.11;

export function calculatePayroll(grossSalary: number) {
  const incomeTax = calculateIncomeTax(grossSalary);
  const employeePension = grossSalary * EMPLOYEE_PENSION_RATE;
  const employerPension = grossSalary * EMPLOYER_PENSION_RATE;
  const netSalary = grossSalary - incomeTax - employeePension;
  return { incomeTax, employeePension, employerPension, netSalary };
}
