import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

const toDate = (value?: string | Date | null) => (value ? new Date(value) : undefined);
const dateOnly = (value?: Date | null) => (value ? value.toISOString().slice(0, 10) : undefined);
const asNumber = (value: unknown) => Number(value || 0);

/**
 * Convert Prisma Decimal fields to plain JS numbers.
 * Prisma returns Decimal columns as Prisma.Decimal objects which serialize
 * to strings in JSON, causing string concatenation instead of addition
 * on the frontend (e.g. "4700" + "4700" = "47004700" instead of 9400).
 */
function toPlain<T>(record: T): T {
  if (record === null || record === undefined) return record;
  if (Array.isArray(record)) return record.map(toPlain) as unknown as T;
  if (typeof record !== "object") return record;
  // Prisma.Decimal has a toNumber() method
  if (typeof (record as any).toNumber === "function") return (record as any).toNumber();
  const result: any = {};
  for (const [key, value] of Object.entries(record as any)) {
    if (value !== null && typeof value === "object" && typeof (value as any).toNumber === "function") {
      result[key] = (value as any).toNumber();
    } else if (value instanceof Date) {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value;
    } else if (typeof value === "object" && value !== null) {
      // Only recurse for plain objects, not for nested JSON blobs
      result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

const MAX_PREVIEW_CHARS = 12000;
const MAX_PARSED_ROWS = 500;

function detectDelimiter(line: string) {
  const candidates = [",", "\t", ";", "|"];
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parsePeachtreeBuffer(buffer: Buffer, originalName: string) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extension = originalName.split(".").pop()?.toLowerCase() || "";
  const rawPreview = text.slice(0, MAX_PREVIEW_CHARS);

  if (!lines.length) {
    return {
      detectedFormat: extension || "empty",
      recordCount: 0,
      rawPreview,
      parsedData: { columns: [], rows: [] },
      mappingSummary: { message: "File is empty." },
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = parseDelimitedLine(lines[0], delimiter);
  const hasHeader = header.some((cell) => Number.isNaN(Number(cell)));
  const columns = hasHeader ? header : header.map((_, index) => `Column ${index + 1}`);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = dataLines.slice(0, MAX_PARSED_ROWS).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    return Object.fromEntries(columns.map((column, index) => [column || `Column ${index + 1}`, cells[index] ?? ""]));
  });

  return {
    detectedFormat: delimiter === "\t" ? "tsv" : extension || "delimited",
    recordCount: dataLines.length,
    rawPreview,
    parsedData: {
      delimiter,
      columns,
      rows,
      truncated: dataLines.length > MAX_PARSED_ROWS,
    },
    mappingSummary: {
      columns,
      rowsParsed: rows.length,
      rowsAvailable: dataLines.length,
      note: "Generic Peachtree export parse. Final account/customer/vendor mappings will be added after sample export files are confirmed.",
    },
  };
}

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  private fieldWorkPayload(job: any) {
    return job?.payload && typeof job.payload === "object" ? job.payload : job;
  }

  private fieldWorkCost(payload: any, fallbackCost?: unknown) {
    if (!Array.isArray(payload?.workers)) return asNumber(fallbackCost);
    const start = payload.startDate ? new Date(payload.startDate) : null;
    const end = payload.endDate ? new Date(payload.endDate) : null;
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = start && end ? Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / msPerDay) + 1) : 1;
    return payload.workers.reduce((sum: number, worker: any) => sum + asNumber(worker.perDiem) * days, 0);
  }

  private async upsertFieldWorkPayment(tx: any, fieldWorkId: string, payload: any, amount: number) {
    if (amount <= 0) return;
    await tx.payment.upsert({
      where: { id: `PAY-FW-${fieldWorkId}` },
      update: {
        reference: fieldWorkId,
        entityId: fieldWorkId,
        entityName: `Field Work - ${payload.location || payload.pumpModel || fieldWorkId}`,
        invoiceOrBillId: fieldWorkId,
        amount,
        method: "Cash",
        bankName: null,
        note: `Per-diem for ${(payload.workers || []).length} worker(s)`,
        date: new Date(payload.startDate || new Date()),
        type: "made",
      },
      create: {
        id: `PAY-FW-${fieldWorkId}`,
        reference: fieldWorkId,
        entityId: fieldWorkId,
        entityName: `Field Work - ${payload.location || payload.pumpModel || fieldWorkId}`,
        invoiceOrBillId: fieldWorkId,
        amount,
        method: "Cash",
        bankName: null,
        note: `Per-diem for ${(payload.workers || []).length} worker(s)`,
        date: new Date(payload.startDate || new Date()),
        type: "made",
      },
    });
  }

  private async addReturnedMaterialsToStock(tx: any, returnForms: any[]) {
    for (const form of returnForms) {
      for (const material of form.returnedMaterials || []) {
        const quantity = asNumber(material.quantity);
        const condition = String(material.condition || "").toLowerCase();
        if (quantity <= 0 || condition === "lost") continue;

        const product = material.productId
          ? await tx.product.findUnique({ where: { id: String(material.productId) } })
          : await tx.product.findFirst({ where: { name: String(material.name || "") } });

        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: { quantity: asNumber(product.quantity) + quantity },
          });
        } else if (material.name) {
          const id = `RET-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await tx.product.create({
            data: {
              id,
              code: id,
              name: String(material.name),
              category: "Returned Material",
              quantity,
              costPrice: 0,
              sellPrice: 0,
              unit: "Piece",
              measurementUnit: "Piece",
              metadata: { source: "fieldwork-return", returnFormId: form.id },
            },
          });
        }
      }
    }
  }

  async products() {
    const rows = await this.prisma.product.findMany({ orderBy: { name: "asc" } });
    return rows.map(toPlain);
  }

  async saveProduct(product: any) {
    return this.prisma.product.upsert({
      where: { id: product.id },
      update: {
        code: product.code == null ? null : String(product.code),
        name: product.name,
        category: product.category,
        quantity: asNumber(product.quantity),
        costPrice: asNumber(product.costPrice ?? product.cost_price),
        sellPrice: asNumber(product.sellPrice ?? product.sell_price),
        unit: product.unit,
        measurementUnit: product.measurementUnit ?? product.measurement_unit,
        metadata: product,
      },
      create: {
        id: product.id,
        code: product.code == null ? null : String(product.code),
        name: product.name,
        category: product.category,
        quantity: asNumber(product.quantity),
        costPrice: asNumber(product.costPrice ?? product.cost_price),
        sellPrice: asNumber(product.sellPrice ?? product.sell_price),
        unit: product.unit,
        measurementUnit: product.measurementUnit ?? product.measurement_unit,
        metadata: product,
      },
    });
  }

  async updateProduct(id: string, product: any) {
    return this.saveProduct({ ...product, id });
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  async sales() {
    const sales = await this.prisma.posSale.findMany({ orderBy: { date: "desc" } });
    return sales.map((sale) => ({
      ...toPlain(sale),
      date: dateOnly(sale.date),
      customer_name: sale.customerName,
      payment_method: sale.paymentMethod,
      bank_name: sale.bankName,
      items: sale.items || [],
    }));
  }

  async saveSale(sale: any) {
    const items = Array.isArray(sale.items) ? sale.items : [];
    await this.prisma.$transaction(async (tx) => {
      const existingSale = await tx.posSale.findUnique({ where: { id: sale.id } });

      await tx.posSale.upsert({
        where: { id: sale.id },
        update: {
          date: new Date(sale.date),
          customerName: sale.customer_name,
          paymentMethod: sale.payment_method,
          bankName: sale.bank_name,
          subtotal: asNumber(sale.subtotal),
          discount: asNumber(sale.discount),
          tax: asNumber(sale.tax),
          total: asNumber(sale.total),
          note: sale.note,
          createdBy: sale.created_by,
          items,
        },
        create: {
          id: sale.id,
          date: new Date(sale.date),
          customerName: sale.customer_name,
          paymentMethod: sale.payment_method,
          bankName: sale.bank_name,
          subtotal: asNumber(sale.subtotal),
          discount: asNumber(sale.discount),
          tax: asNumber(sale.tax),
          total: asNumber(sale.total),
          note: sale.note,
          createdBy: sale.created_by,
          items,
        },
      });

      if (!existingSale) {
        for (const item of items) {
          const productId = item.productId || item.product_id;
          const quantity = asNumber(item.quantity);
          if (!productId || quantity <= 0) continue;

          const product = await tx.product.findUnique({ where: { id: productId } });
          if (!product) {
            throw new BadRequestException(`Product ${item.productName || productId} was not found`);
          }

          const currentQuantity = asNumber(product.quantity);
          if (currentQuantity < quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Only ${currentQuantity} available.`,
            );
          }

          await tx.product.update({
            where: { id: productId },
            data: {
              quantity: currentQuantity - quantity,
            },
          });
        }
      }

      const method =
        sale.payment_method === "Bank"
          ? "Bank Transfer"
          : sale.payment_method === "Telebirr"
            ? "Mobile Money"
            : sale.payment_method || "Cash";

      await tx.payment.upsert({
        where: { id: `PAY-POS-${sale.id}` },
        update: {
          reference: sale.id,
          entityId: sale.customer_id || sale.customerId,
          entityName: sale.customer_name,
          invoiceOrBillId: sale.id,
          amount: asNumber(sale.total),
          method,
          bankName: sale.bank_name,
          note: "POS Sale",
          date: new Date(sale.date),
          type: "received",
        },
        create: {
          id: `PAY-POS-${sale.id}`,
          reference: sale.id,
          entityId: sale.customer_id || sale.customerId,
          entityName: sale.customer_name,
          invoiceOrBillId: sale.id,
          amount: asNumber(sale.total),
          method,
          bankName: sale.bank_name,
          note: "POS Sale",
          date: new Date(sale.date),
          type: "received",
        },
      });
    });
    return { success: true };
  }

  async fieldwork() {
    const jobs = await this.prisma.fieldWorkJob.findMany({ orderBy: { createdAt: "desc" } });
    return jobs.map((job) => ({
      ...toPlain(job),
      customer_name: job.customerName,
      assigned_to: job.assignedTo,
      scheduled_date: dateOnly(job.scheduledDate),
      completed_date: dateOnly(job.completedDate),
    }));
  }

  async saveFieldwork(job: any) {
    const payload = this.fieldWorkPayload(job);
    const cost = this.fieldWorkCost(payload, job.cost);

    await this.prisma.$transaction(async (tx) => {
      await tx.fieldWorkJob.upsert({
        where: { id: job.id },
        update: {
          title: job.title,
          description: job.description,
          customerName: job.customer_name,
          location: job.location,
          assignedTo: job.assigned_to,
          status: job.status || "pending",
          priority: job.priority || "medium",
          scheduledDate: toDate(job.scheduled_date),
          completedDate: toDate(job.completed_date),
          cost,
          notes: job.notes,
          payload,
        },
        create: {
          id: job.id,
          title: job.title,
          description: job.description,
          customerName: job.customer_name,
          location: job.location,
          assignedTo: job.assigned_to,
          status: job.status || "pending",
          priority: job.priority || "medium",
          scheduledDate: toDate(job.scheduled_date),
          completedDate: toDate(job.completed_date),
          cost,
          notes: job.notes,
          payload,
        },
      });

      await this.upsertFieldWorkPayment(tx, job.id, payload, cost);
    });
    return { success: true };
  }

  async updateFieldwork(id: string, job: any) {
    const payload = this.fieldWorkPayload(job);
    const cost = this.fieldWorkCost(payload, job.cost);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.fieldWorkJob.findUnique({ where: { id } });
      const existingPayload = existing?.payload && typeof existing.payload === "object" ? existing.payload as any : {};
      const existingReturnIds = new Set((existingPayload.returnForms || []).map((form: any) => form.id));
      const newReturnForms = (payload.returnForms || []).filter((form: any) => !existingReturnIds.has(form.id));

      await tx.fieldWorkJob.update({
        where: { id },
        data: {
          title: job.title,
          description: job.description,
          customerName: job.customer_name,
          location: job.location,
          assignedTo: job.assigned_to,
          status: job.status || "pending",
          priority: job.priority || "medium",
          scheduledDate: toDate(job.scheduled_date),
          completedDate: toDate(job.completed_date),
          cost,
          notes: job.notes,
          payload,
        },
      });

      await this.upsertFieldWorkPayment(tx, id, payload, cost);
      await this.addReturnedMaterialsToStock(tx, newReturnForms);
    });
    return { success: true };
  }

  async deleteFieldwork(id: string) {
    await this.prisma.fieldWorkJob.delete({ where: { id } });
    return { success: true };
  }

  async customers() {
    const list = await this.prisma.customer.findMany({ orderBy: { name: "asc" } });
    return list.map(toPlain);
  }

  async saveCustomer(customer: any) {
    await this.prisma.customer.upsert({
      where: { id: customer.id },
      update: { ...customer, creditLimit: asNumber(customer.creditLimit), balance: asNumber(customer.balance) },
      create: { ...customer, creditLimit: asNumber(customer.creditLimit), balance: asNumber(customer.balance) },
    });
    return { success: true };
  }

  async deleteCustomer(id: string) {
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }

  async vendors() {
    const list = await this.prisma.vendor.findMany({ orderBy: { name: "asc" } });
    return list.map(toPlain);
  }

  async saveVendor(vendor: any) {
    await this.prisma.vendor.upsert({
      where: { id: vendor.id },
      update: { ...vendor, balance: asNumber(vendor.balance) },
      create: { ...vendor, balance: asNumber(vendor.balance) },
    });
    return { success: true };
  }

  async deleteVendor(id: string) {
    await this.prisma.vendor.delete({ where: { id } });
    return { success: true };
  }

  async accounts() {
    const list = await this.prisma.account.findMany({ orderBy: { name: "asc" } });
    return list.map(toPlain);
  }

  async saveAccount(account: any) {
    await this.prisma.account.upsert({
      where: { id: account.id },
      update: { ...account, openingBalance: asNumber(account.openingBalance) },
      create: { ...account, openingBalance: asNumber(account.openingBalance) },
    });
    return { success: true };
  }

  async deleteAccount(id: string) {
    await this.prisma.account.delete({ where: { id } });
    return { success: true };
  }

  async invoices() {
    const invoices = await this.prisma.invoice.findMany({ orderBy: { date: "desc" } });
    return invoices.map((invoice) => ({ ...toPlain(invoice), date: dateOnly(invoice.date), dueDate: dateOnly(invoice.dueDate), items: invoice.items || [] }));
  }

  async saveInvoice(invoice: any) {
    await this.prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        date: new Date(invoice.date),
        dueDate: toDate(invoice.dueDate),
        items: invoice.items || [],
        subtotal: asNumber(invoice.subtotal),
        totalVat: asNumber(invoice.totalVat),
        total: asNumber(invoice.total),
        status: invoice.status || "Draft",
      },
      create: {
        id: invoice.id,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        date: new Date(invoice.date),
        dueDate: toDate(invoice.dueDate),
        items: invoice.items || [],
        subtotal: asNumber(invoice.subtotal),
        totalVat: asNumber(invoice.totalVat),
        total: asNumber(invoice.total),
        status: invoice.status || "Draft",
      },
    });
    return { success: true };
  }

  async bills() {
    const bills = await this.prisma.bill.findMany({ orderBy: { date: "desc" } });
    return bills.map((bill) => ({ ...toPlain(bill), date: dateOnly(bill.date), items: bill.items || [] }));
  }

  async saveBill(bill: any) {
    await this.prisma.bill.upsert({
      where: { id: bill.id },
      update: {
        vendorId: bill.vendorId,
        vendorName: bill.vendorName,
        date: new Date(bill.date),
        items: bill.items || [],
        total: asNumber(bill.total),
        status: bill.status || "Pending",
      },
      create: {
        id: bill.id,
        vendorId: bill.vendorId,
        vendorName: bill.vendorName,
        date: new Date(bill.date),
        items: bill.items || [],
        total: asNumber(bill.total),
        status: bill.status || "Pending",
      },
    });
    return { success: true };
  }

  async payments() {
    const payments = await this.prisma.payment.findMany({ orderBy: { date: "desc" } });
    return payments.map((payment) => ({ ...toPlain(payment), date: dateOnly(payment.date) }));
  }

  async savePayment(payment: any) {
    await this.prisma.payment.upsert({
      where: { id: payment.id },
      update: { ...payment, amount: asNumber(payment.amount), date: new Date(payment.date) },
      create: { ...payment, amount: asNumber(payment.amount), date: new Date(payment.date) },
    });
    return { success: true };
  }

  async expenses() {
    const expenses = await this.prisma.expense.findMany({ orderBy: { date: "desc" } });
    return expenses.map((expense) => ({ ...toPlain(expense), date: dateOnly(expense.date) }));
  }

  async saveExpense(expense: any) {
    await this.prisma.expense.upsert({
      where: { id: expense.id },
      update: { ...expense, amount: asNumber(expense.amount), date: new Date(expense.date) },
      create: { ...expense, amount: asNumber(expense.amount), date: new Date(expense.date) },
    });
    return { success: true };
  }

  async deleteExpense(id: string) {
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  async journal() {
    const entries = await this.prisma.financeJournalEntry.findMany({ orderBy: { date: "desc" } });
    return entries.map((entry) => ({ ...toPlain(entry), date: dateOnly(entry.date) }));
  }

  async saveJournal(entry: any) {
    await this.prisma.financeJournalEntry.upsert({
      where: { id: entry.id },
      update: { ...entry, amount: asNumber(entry.amount), date: new Date(entry.date), lines: entry.lines || null },
      create: { ...entry, amount: asNumber(entry.amount), date: new Date(entry.date), lines: entry.lines || null },
    });
    return { success: true };
  }

  departments() {
    return this.prisma.hrDepartment.findMany({ orderBy: { name: "asc" } });
  }

  async saveDepartment(dept: any) {
    await this.prisma.hrDepartment.upsert({
      where: { id: dept.id },
      update: { name: dept.name, description: dept.description },
      create: { id: dept.id, name: dept.name, description: dept.description },
    });
    return { success: true };
  }

  async workers() {
    const workers = await this.prisma.hrWorker.findMany({ orderBy: { fullName: "asc" } });
    return workers.map((worker) => ({
      ...worker,
      worker_code: worker.workerCode,
      full_name: worker.fullName,
      department_id: worker.departmentId,
      departmentName: worker.departmentName,
      photo_url: worker.photoUrl,
      fingerprint_id: worker.fingerprintId,
    }));
  }

  async saveWorker(worker: any) {
    const department = worker.department_id ? await this.prisma.hrDepartment.findUnique({ where: { id: worker.department_id } }) : null;
    await this.prisma.hrWorker.upsert({
      where: { id: worker.id },
      update: {
        workerCode: worker.worker_code || worker.workerCode,
        fullName: worker.full_name || worker.fullName,
        phone: worker.phone,
        position: worker.position,
        departmentId: worker.department_id || worker.departmentId,
        departmentName: department?.name,
        photoUrl: worker.photo_url || worker.photoUrl,
        fingerprintId: worker.fingerprint_id || worker.fingerprintId,
        status: worker.status || "Active",
      },
      create: {
        id: worker.id,
        workerCode: worker.worker_code || worker.workerCode,
        fullName: worker.full_name || worker.fullName,
        phone: worker.phone,
        position: worker.position,
        departmentId: worker.department_id || worker.departmentId,
        departmentName: department?.name,
        photoUrl: worker.photo_url || worker.photoUrl,
        fingerprintId: worker.fingerprint_id || worker.fingerprintId,
        status: worker.status || "Active",
      },
    });
    return { success: true };
  }

  async deleteWorker(id: string) {
    await this.prisma.hrWorker.delete({ where: { id } });
    return { success: true };
  }

  async deleteDepartment(id: string) {
    await this.prisma.hrDepartment.delete({ where: { id } });
    return { success: true };
  }

  async settings() {
    const settings = await this.prisma.hrSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return {
      ...settings,
      work_start_time: settings.workStartTime,
      work_end_time: settings.workEndTime,
      grace_period_minutes: settings.gracePeriodMinutes,
    };
  }

  async saveSettings(settings: any) {
    await this.prisma.hrSetting.upsert({
      where: { id: settings.id || "default" },
      update: {
        workStartTime: settings.work_start_time || settings.workStartTime,
        workEndTime: settings.work_end_time || settings.workEndTime,
        gracePeriodMinutes: Number(settings.grace_period_minutes ?? settings.gracePeriodMinutes ?? 15),
      },
      create: {
        id: settings.id || "default",
        workStartTime: settings.work_start_time || settings.workStartTime || "08:00",
        workEndTime: settings.work_end_time || settings.workEndTime || "17:00",
        gracePeriodMinutes: Number(settings.grace_period_minutes ?? settings.gracePeriodMinutes ?? 15),
      },
    });
    return { success: true };
  }

  async scanAttendance(fingerprintId: string) {
    const worker = await this.prisma.hrWorker.findFirst({ where: { fingerprintId } });
    if (!worker) throw new NotFoundException("Worker not found or fingerprint not registered.");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const existing = await this.prisma.attendanceLog.findFirst({ where: { workerId: worker.id, date: today } });
    if (!existing) {
      await this.prisma.attendanceLog.create({ data: { workerId: worker.id, workerName: worker.fullName, date: today, checkInTime: now, status: "Present" } });
      return { message: "Check-in successful", type: "check-in", worker: { ...worker, full_name: worker.fullName } };
    }
    if (!existing.checkOutTime) {
      const hours = existing.checkInTime ? (now.getTime() - existing.checkInTime.getTime()) / 3600000 : 0;
      await this.prisma.attendanceLog.update({ where: { id: existing.id }, data: { checkOutTime: now, totalHours: hours } });
      return { message: "Check-out successful", type: "check-out", worker: { ...worker, full_name: worker.fullName } };
    }
    return { message: "Attendance already completed for today.", worker: { ...worker, full_name: worker.fullName } };
  }

  async attendanceLogs(filters: any) {
    const logs = await this.prisma.attendanceLog.findMany({ orderBy: { date: "desc" } });
    return logs.map((log) => ({
      ...toPlain(log),
      workerName: log.workerName,
      date: dateOnly(log.date),
      check_in_time: log.checkInTime,
      check_out_time: log.checkOutTime,
      total_hours: log.totalHours ? toPlain(log.totalHours) : 0,
    }));
  }

  async inventoryRequests() {
    const requests = await this.prisma.inventoryRequest.findMany({ orderBy: { createdAt: "desc" } });
    return requests.map((request) => ({
      ...toPlain(request),
      quantity: asNumber(request.quantity),
      price: asNumber(request.price),
      note: request.reason || "",
      approvedDate: dateOnly(request.approvedDate),
    }));
  }

  async saveInventoryRequest(request: any) {
    const reason = request.reason ?? request.note;
    const status = request.status || "pending";
    const quantity = asNumber(request.quantity);
    const price = asNumber(request.price);
    const productId = request.productId ? String(request.productId) : null;
    const productCode = request.productCode == null ? null : String(request.productCode);

    await this.prisma.$transaction(async (tx) => {
      const existingRequest = await tx.inventoryRequest.findUnique({ where: { id: request.id } });
      const wasApproved = existingRequest?.status === "approved";

      await tx.inventoryRequest.upsert({
        where: { id: request.id },
        update: {
          productId,
          productName: request.productName,
          productCode,
          category: request.category,
          quantity,
          price,
          requestedBy: request.requestedBy,
          reason,
          status,
          approvedBy: request.approvedBy,
          approvedDate: toDate(request.approvedDate),
        },
        create: {
          id: request.id,
          productId,
          productName: request.productName,
          productCode,
          category: request.category,
          quantity,
          price,
          requestedBy: request.requestedBy,
          reason,
          status,
          approvedBy: request.approvedBy,
          approvedDate: toDate(request.approvedDate),
        },
      });

      if (status !== "approved" || wasApproved) return;

      const productFilters = [
        productCode ? { code: productCode } : null,
        request.productName ? { name: request.productName } : null,
      ].filter((filter): filter is { code: string } | { name: string } => Boolean(filter));

      const existingProduct = productId
        ? await tx.product.findUnique({ where: { id: productId } })
        : productFilters.length > 0
          ? await tx.product.findFirst({ where: { OR: productFilters } })
          : null;

      const totalAmount = quantity * price;
      if (existingProduct) {
        await tx.product.update({
          where: { id: existingProduct.id },
          data: {
            quantity: asNumber(existingProduct.quantity) + quantity,
            costPrice: price || existingProduct.costPrice,
          },
        });
      } else {
        const newProductId = productId || `P-${request.id}`;
        await tx.product.create({
          data: {
            id: newProductId,
            code: productCode,
            name: request.productName,
            category: request.category || "Inventory",
            quantity,
            costPrice: price,
            sellPrice: price,
            unit: "Piece",
            measurementUnit: "Piece",
            metadata: { source: "inventory-request", requestId: request.id },
          },
        });
      }

      if (totalAmount > 0) {
        await tx.payment.upsert({
          where: { id: `PAY-INV-${request.id}` },
          update: {
            reference: request.id,
            entityId: request.id,
            entityName: request.productName,
            invoiceOrBillId: request.id,
            amount: totalAmount,
            method: "Cash",
            bankName: null,
            note: `Inventory request approved by ${request.approvedBy || "Finance"}`,
            date: toDate(request.approvedDate) || new Date(),
            type: "made",
          },
          create: {
            id: `PAY-INV-${request.id}`,
            reference: request.id,
            entityId: request.id,
            entityName: request.productName,
            invoiceOrBillId: request.id,
            amount: totalAmount,
            method: "Cash",
            bankName: null,
            note: `Inventory request approved by ${request.approvedBy || "Finance"}`,
            date: toDate(request.approvedDate) || new Date(),
            type: "made",
          },
        });
      }

      // Sync hierarchy request status if this is approved/rejected
      if (status === "approved" || status === "rejected") {
        try {
          const submitLog = await tx.requestAuditLog.findFirst({
            where: {
              action: "SUBMIT",
              comment: `Inventory Request ID: ${request.id}`
            }
          });
          if (submitLog) {
            await tx.hierarchyRequest.update({
              where: { id: submitLog.requestId },
              data: {
                status: status === "approved" ? "APPROVED" : "REJECTED"
              }
            });
            
            // Resolve userId for the audit log
            let actorUserId = "1";
            if (request.approvedBy) {
              const matchedUser = await tx.user.findFirst({
                where: { displayName: request.approvedBy }
              });
              if (matchedUser) actorUserId = matchedUser.id;
            }

            // Add a log entry for the action
            await tx.requestAuditLog.create({
              data: {
                requestId: submitLog.requestId,
                userId: actorUserId,
                action: status === "approved" ? "APPROVE" : "REJECT",
                comment: `Updated status to ${status} from Inventory Page`
              }
            });
          }
        } catch (e) {
          console.error("Failed to sync inventory request status to hierarchy request:", e);
        }
      }
    });

    return { success: true };
  }

  pumpCategories() {
    return this.prisma.pumpCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  async savePumpCategory(data: any) {
    if (!data.name?.trim()) throw new BadRequestException("Category name is required.");
    const category = await this.prisma.pumpCategory.create({
      data: {
        name: data.name.trim(),
        description: data.description,
        icon: data.icon || "droplets",
        sortOrder: Number(data.sortOrder || 0),
      },
    });
    if (data.originalName && data.originalName !== category.name) {
      await this.prisma.pumpProduct.updateMany({
        where: { firstCategory: data.originalName },
        data: { firstCategory: category.name },
      });
    }
    return category;
  }

  async updatePumpCategory(id: string, data: any) {
    if (!data.name?.trim()) throw new BadRequestException("Category name is required.");
    const existing = await this.prisma.pumpCategory.findUniqueOrThrow({ where: { id } });
    const updated = await this.prisma.pumpCategory.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description,
        icon: data.icon || "droplets",
        sortOrder: Number(data.sortOrder || 0),
      },
    });
    if (existing.name !== updated.name) {
      await this.prisma.pumpProduct.updateMany({
        where: { firstCategory: existing.name },
        data: { firstCategory: updated.name },
      });
    }
    return updated;
  }

  async deletePumpCategory(id: string) {
    const category = await this.prisma.pumpCategory.findUniqueOrThrow({ where: { id } });
    const count = await this.prisma.pumpProduct.count({ where: { firstCategory: category.name } });
    if (count > 0) throw new BadRequestException("Move or delete products before deleting this category.");
    await this.prisma.pumpCategory.delete({ where: { id } });
    return { success: true };
  }

  async financeCenter(type: string) {
    const rows = await this.prisma.financeCenterRecord.findMany({ where: { type }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => row.payload);
  }

  async saveFinanceCenter(type: string, payload: any) {
    await this.prisma.financeCenterRecord.upsert({
      where: { id: payload.id },
      update: { type, company: payload.entity || payload.company, payload },
      create: { id: payload.id, type, company: payload.entity || payload.company, payload },
    });
    return { success: true };
  }

  peachtreeImports(query: any) {
    return this.prisma.peachtreeImport.findMany({
      where: query.company ? { company: query.company } : undefined,
      orderBy: { uploadedAt: "desc" },
      take: 50,
    });
  }

  peachtreeImport(id: string) {
    return this.prisma.peachtreeImport.findUniqueOrThrow({ where: { id } });
  }

  async uploadPeachtreeImport(file: any, body: any, user: any) {
    if (!file?.buffer) {
      throw new BadRequestException("Peachtree export file is required.");
    }

    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const parsed = parsePeachtreeBuffer(file.buffer, file.originalname || "peachtree-export.txt");
    const company = body.company || body.companyCode;
    const existing = await this.prisma.peachtreeImport.findUnique({ where: { checksum } });

    if (existing) {
      return { success: true, duplicate: true, import: existing };
    }

    const created = await this.prisma.peachtreeImport.create({
      data: {
        company,
        source: body.source || "desktop-agent",
        fileName: file.originalname || "peachtree-export.txt",
        fileType: file.originalname?.split(".").pop()?.toLowerCase(),
        mimeType: file.mimetype,
        sizeBytes: file.size || file.buffer.length,
        checksum,
        status: "processed",
        detectedFormat: parsed.detectedFormat,
        recordCount: parsed.recordCount,
        rawPreview: parsed.rawPreview,
        parsedData: parsed.parsedData,
        mappingSummary: parsed.mappingSummary,
        uploadedBy: user?.username,
        processedAt: new Date(),
      },
    });

    return { success: true, duplicate: false, import: created };
  }

  pumpProducts() {
    return this.prisma.pumpProduct.findMany({ orderBy: { model: "asc" } });
  }

  pumpProduct(id: string) {
    return this.prisma.pumpProduct.findUniqueOrThrow({ where: { id } });
  }

  async savePumpProduct(data: any) {
    const id = data.id;
    const rest = this.toPumpProductData(data);
    if (id) {
      return this.prisma.pumpProduct.upsert({
        where: { id },
        update: rest,
        create: { id, ...rest },
      });
    } else {
      return this.prisma.pumpProduct.create({
        data: rest,
      });
    }
  }

  async updatePumpProduct(id: string, data: any) {
    const rest = this.toPumpProductData(data);
    return this.prisma.pumpProduct.update({
      where: { id },
      data: rest,
    });
  }

  async deletePumpProduct(id: string) {
    await this.prisma.pumpProduct.delete({ where: { id } });
    return { success: true };
  }

  private toPumpProductData(data: any) {
    return {
      model: data.model || "Untitled Pump",
      brand: data.brand || "DIFFUL",
      status: data.status || "Draft",
      firstCategory: data.firstCategory || "Uncategorized",
      secondCategory: data.secondCategory || "General",
      power: data.power || "",
      voltage: data.voltage || "",
      description: data.description,
      image: data.image,
      controllerImage: data.controllerImage,
      panelImage: data.panelImage,
      introductionTitle: data.introductionTitle,
      technicalDataTitle: data.technicalDataTitle,
      hydraulicCurveTitle: data.hydraulicCurveTitle,
      hydraulicCurveImage: data.hydraulicCurveImage,
      sourceUrl: data.sourceUrl,
      technicalData: data.technicalData ? JSON.parse(JSON.stringify(data.technicalData)) : undefined,
      performanceData: data.performanceData ? JSON.parse(JSON.stringify(data.performanceData)) : undefined,
      equipment: data.equipment ? JSON.parse(JSON.stringify(data.equipment)) : undefined,
    };
  }

  async getHierarchyRequests(userId: string) {
    await this.updateUserPresence(userId);
    const requests = await this.prisma.hierarchyRequest.findMany({
      where: {
        OR: [
          { createdById: userId },
          { assignedToId: userId }
        ]
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, department: true }
        },
        assignedTo: {
          select: { id: true, username: true, displayName: true, department: true }
        },
        logs: {
          include: {
            user: { select: { id: true, displayName: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    return requests.map(toPlain);
  }

  async createHierarchyRequest(createdById: string, data: any) {
    const creator = await this.prisma.user.findUniqueOrThrow({
      where: { id: createdById }
    });

    let assignedToId = creator.reportsToId;
    if (!assignedToId) {
      assignedToId = createdById;
    }

    const request = await this.prisma.hierarchyRequest.create({
      data: {
        id: data.id || `REQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        title: data.title,
        description: data.description,
        amount: data.amount ? Number(data.amount) : null,
        type: data.type || "GENERAL",
        status: "PENDING",
        createdById,
        assignedToId,
        fieldWorkJobId: data.fieldWorkJobId || null,
      }
    });

    await this.prisma.requestAuditLog.create({
      data: {
        requestId: request.id,
        userId: createdById,
        action: "SUBMIT",
        comment: data.comment || "Request submitted",
      }
    });

    return request;
  }

  async handleHierarchyRequestAction(userId: string, requestId: string, action: string, comment?: string) {
    const request = await this.prisma.hierarchyRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { createdBy: true }
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });

    const roles = user.roles.map(r => r.role.name);
    let nextStatus = request.status;
    let nextAssigneeId = request.assignedToId;

    if (action === "REJECT") {
      nextStatus = "REJECTED";
      nextAssigneeId = request.createdById;
    } else if (action === "APPROVE") {
      // 1. Non-manager, non-finance (e.g., tech_manager) approves -> if has amount, route to Finance. Else route to GM.
      if (request.assignedToId === user.id && !roles.includes("manager") && !roles.includes("finance")) {
        if (request.amount && Number(request.amount) > 0) {
          const financeAdmin = await this.prisma.user.findFirst({
            where: { roles: { some: { role: { name: "finance" } } } }
          });
          if (financeAdmin) {
            nextStatus = "FORWARDED_TO_FINANCE";
            nextAssigneeId = financeAdmin.id;
          }
        } else {
          const gm = await this.prisma.user.findFirst({
            where: { roles: { some: { role: { name: "manager" } } } }
          });
          if (gm) {
            nextStatus = "FORWARDED_TO_GM";
            nextAssigneeId = gm.id;
          } else {
            nextStatus = "APPROVED";
            nextAssigneeId = request.createdById;
          }
        }
      }
      // 2. Finance approves -> route to GM for final sign-off
      else if (roles.includes("finance")) {
        const gm = await this.prisma.user.findFirst({
          where: { roles: { some: { role: { name: "manager" } } } }
        });
        if (gm) {
          nextStatus = "FINANCE_APPROVED";
          nextAssigneeId = gm.id;
        } else {
          nextStatus = "APPROVED";
          nextAssigneeId = request.createdById;
        }
      }
      // 3. GM approves -> final sign-off
      else if (roles.includes("manager")) {
        nextStatus = "APPROVED"; // or "FINISHED"
        nextAssigneeId = request.createdById;
      }
    } else if (action === "FORWARD") {
      if (comment === "finance") {
        const financeUser = await this.prisma.user.findFirst({
          where: { roles: { some: { role: { name: "finance" } } } }
        });
        if (financeUser) {
          nextStatus = "FORWARDED_TO_FINANCE";
          nextAssigneeId = financeUser.id;
        }
      } else if (comment === "manager") {
        const gmUser = await this.prisma.user.findFirst({
          where: { roles: { some: { role: { name: "manager" } } } }
        });
        if (gmUser) {
          nextStatus = "FORWARDED_TO_GM";
          nextAssigneeId = gmUser.id;
        }
      } else {
        const targetUser = await this.prisma.user.findFirst({
          where: { username: comment }
        });
        if (targetUser) {
          nextStatus = "FORWARDED";
          nextAssigneeId = targetUser.id;
        }
      }
    }

    const updated = await this.prisma.hierarchyRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        assignedToId: nextAssigneeId
      }
    });

    await this.prisma.requestAuditLog.create({
      data: {
        requestId,
        userId,
        action,
        comment: action === "FORWARD" ? `Forwarded to ${comment}` : comment || `Action: ${action}`,
        createdAt: new Date()
      }
    });

    if (nextStatus === "APPROVED") {
      // 1. Update FieldWorkJob if fieldWorkJobId is linked
      if (request.fieldWorkJobId) {
        try {
          await this.prisma.fieldWorkJob.update({
            where: { id: request.fieldWorkJobId },
            data: { status: "in-progress" }
          });
        } catch (e) {
          console.error("Failed to auto-approve linked fieldwork job:", e);
        }
      }

      // 2. Update InventoryRequest if created from Inventory Page
      try {
        const submitLog = await this.prisma.requestAuditLog.findFirst({
          where: { requestId: request.id, action: "SUBMIT" }
        });
        if (submitLog && submitLog.comment && submitLog.comment.includes("Inventory Request ID: ")) {
          const reqId = submitLog.comment.replace("Inventory Request ID: ", "").trim();
          await this.prisma.inventoryRequest.update({
            where: { id: reqId },
            data: { status: "approved", approvedBy: user.displayName }
          });
        }
      } catch (e) {
        console.error("Failed to auto-approve linked stock request:", e);
      }
    }

    return updated;
  }

  async updateUserPresence(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      });
    } catch (e) {
      console.error("Failed to update user presence:", e);
    }
  }

  async createEodReport(userId: string, data: any) {
    const creator = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId }
    });

    return this.prisma.eodReport.create({
      data: {
        id: `EOD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        date: data.date || new Date().toISOString().slice(0, 10),
        department: creator.department || "GENERAL",
        submittedById: userId,
        content: data.content,
        metrics: data.metrics ? JSON.parse(JSON.stringify(data.metrics)) : undefined,
      }
    });
  }

  async getEodReports(date?: string) {
    return this.prisma.eodReport.findMany({
      where: date ? { date } : undefined,
      include: {
        submittedBy: {
          select: { id: true, username: true, displayName: true, department: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getUsersPresence() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        department: true,
        lastSeen: true,
        roles: {
          include: {
            role: { select: { name: true } }
          }
        }
      }
    });

    const now = new Date();
    return users.map(user => {
      const isOnline = user.lastSeen ? (now.getTime() - new Date(user.lastSeen).getTime()) < 5 * 60 * 1000 : false;
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        department: user.department,
        lastSeen: user.lastSeen,
        isOnline,
        role: user.roles?.[0]?.role?.name || "user"
      };
    });
  }
}
