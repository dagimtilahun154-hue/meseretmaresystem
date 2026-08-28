import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const toNumber = (value: any) => Number(value || 0);
const dateOnly = (value?: Date | string | null) => (value ? new Date(value).toISOString().slice(0, 10) : "");

function payloadNumber(payload: any, key: string) {
  return Number(payload?.[key] || 0);
}

function groupByDate<T>(rows: T[], dateSelector: (row: T) => string, amountSelector: (row: T) => number) {
  const grouped: Record<string, number> = {};
  rows.forEach((row) => {
    const date = dateSelector(row);
    if (!date) return;
    grouped[date] = (grouped[date] || 0) + amountSelector(row);
  });
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, amount]) => ({ date: date.slice(5), amount }));
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dashboard(query: any) {
    try {
      const company = query?.company;
      const financeWhere = (type: string) => ({ type, ...(company ? { company } : {}) });

      const [
        products,
        sales,
        payments,
        fieldWorks,
        inventoryRequests,
        cashFlowRows,
        bankAccountRows,
        loanRows,
        peachtreeImports,
      ] = await Promise.all([
        this.prisma.product.findMany({ orderBy: { name: "asc" } }).catch(() => []),
        this.prisma.posSale.findMany({ orderBy: { date: "desc" }, take: 500 }).catch(() => []),
        this.prisma.payment.findMany({ orderBy: { date: "desc" }, take: 500 }).catch(() => []),
        this.prisma.fieldWorkJob.findMany({ orderBy: { createdAt: "desc" }, take: 200 }).catch(() => []),
        this.prisma.inventoryRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }).catch(() => []),
        this.prisma.financeCenterRecord.findMany({ where: financeWhere("cash-flow"), orderBy: { createdAt: "desc" }, take: 500 }).catch(() => []),
        this.prisma.financeCenterRecord.findMany({ where: financeWhere("bank-accounts"), orderBy: { createdAt: "desc" }, take: 200 }).catch(() => []),
        this.prisma.financeCenterRecord.findMany({ where: financeWhere("loans"), orderBy: { createdAt: "desc" }, take: 200 }).catch(() => []),
        this.prisma.peachtreeImport.findMany({ where: company ? { company } : undefined, orderBy: { uploadedAt: "desc" }, take: 10 }).catch(() => []),
      ]);

      const totalSales = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);
      const totalCost = sales.reduce((sum, sale) => sum + Math.max(0, toNumber(sale.subtotal) - toNumber(sale.discount)), 0);
      const totalProfit = totalSales - totalCost;
      const totalVat = sales.reduce((sum, sale) => sum + toNumber(sale.tax), 0);
      const uniqueCustomers = new Set(sales.map((sale) => sale.customerName).filter(Boolean)).size;
      const totalProducts = products.length;
      const lowStockCount = products.filter((product) => toNumber(product.quantity) > 0 && toNumber(product.quantity) <= 5).length;
      const outOfStockCount = products.filter((product) => toNumber(product.quantity) <= 0).length;
      const inventoryValue = products.reduce((sum, product) => sum + toNumber(product.quantity) * toNumber(product.sellPrice), 0);

      const paymentMethodBreakdown = {
        cash: payments.filter((payment) => payment.type === "received" && payment.method === "Cash").reduce((sum, payment) => sum + toNumber(payment.amount), 0),
        bank: payments.filter((payment) => payment.type === "received" && payment.method === "Bank Transfer").reduce((sum, payment) => sum + toNumber(payment.amount), 0),
        telebirr: payments.filter((payment) => payment.type === "received" && payment.method === "Mobile Money").reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      };

      const cashFlow = cashFlowRows.map((row) => (row.payload as any) || {});
      const cashFlowIncome = cashFlow.filter((row) => row.type === "income").reduce((sum, row) => sum + payloadNumber(row, "amount"), 0);
      const cashFlowExpense = cashFlow.filter((row) => row.type === "expense").reduce((sum, row) => sum + payloadNumber(row, "amount"), 0);
      const bankBalance = bankAccountRows.reduce((sum, row) => sum + payloadNumber(row.payload, "balance"), 0) + paymentMethodBreakdown.bank + paymentMethodBreakdown.telebirr;
      const loanOutstanding = loanRows.reduce((sum, row) => sum + payloadNumber(row.payload, "remainingBalance"), 0);
      const pendingRequests = inventoryRequests.filter((request) => request.status === "pending").length;
      const fieldWorkExpense = fieldWorks.reduce((sum, job) => sum + toNumber(job.cost), 0);
      const activeFieldWorks = fieldWorks.filter((job) => job.status === "in-progress" || job.status === "pending").length;
      const overdueFieldWorks = fieldWorks.filter((job) => {
        if (job.status !== "in-progress" || !job.completedDate) return false;
        try {
          return new Date(job.completedDate) < new Date();
        } catch {
          return false;
        }
      }).length;

      const peachtreeLastImport = peachtreeImports[0];

      return {
        company: company || "all",
        generatedAt: new Date().toISOString(),
        stats: {
          totalSales,
          totalProfit,
          totalVat,
          uniqueCustomers,
          totalProducts,
          lowStockCount,
          outOfStockCount,
          inventoryValue,
          bankBalance,
          netCashFlow: cashFlowIncome - cashFlowExpense + paymentMethodBreakdown.cash + paymentMethodBreakdown.bank + paymentMethodBreakdown.telebirr - fieldWorkExpense,
          pendingRequests,
          loanOutstanding,
          fieldWorkExpense,
          activeFieldWorks,
          overdueFieldWorks,
        },
        payments: {
          cashSales: paymentMethodBreakdown.cash,
          bankSales: paymentMethodBreakdown.bank,
          telebirrSales: paymentMethodBreakdown.telebirr,
        },
        charts: {
          salesTrend: groupByDate(sales, (sale) => dateOnly(sale.date), (sale) => toNumber(sale.total)),
          cashFlowTrend: groupByDate(cashFlow, (row) => row.date || "", (row) => (row.type === "expense" ? -payloadNumber(row, "amount") : payloadNumber(row, "amount"))),
        },
        peachtree: {
          lastSyncAt: peachtreeLastImport?.uploadedAt?.toISOString() || null,
          lastFileName: peachtreeLastImport?.fileName || null,
          lastStatus: peachtreeLastImport?.status || null,
          importedFiles: peachtreeImports.length,
          importedRows: peachtreeImports.reduce((sum, item) => sum + item.recordCount, 0),
        },
        sync: {
          queued: 0,
          applied: 0,
          failed: 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error generating dashboard analytics: ${error.message}`);
      return {
        company: query?.company || "all",
        generatedAt: new Date().toISOString(),
        stats: {
          totalSales: 0,
          totalProfit: 0,
          totalVat: 0,
          uniqueCustomers: 0,
          totalProducts: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          inventoryValue: 0,
          bankBalance: 0,
          netCashFlow: 0,
          pendingRequests: 0,
          loanOutstanding: 0,
          fieldWorkExpense: 0,
          activeFieldWorks: 0,
          overdueFieldWorks: 0,
        },
        payments: { cashSales: 0, bankSales: 0, telebirrSales: 0 },
        charts: { salesTrend: [], cashFlowTrend: [] },
        peachtree: { lastSyncAt: null, lastFileName: null, lastStatus: null, importedFiles: 0, importedRows: 0 },
        sync: { queued: 0, applied: 0, failed: 0 },
      };
    }
  }
}
