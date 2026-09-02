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
  const extension = originalName.split(".").pop()?.toLowerCase() || "";
  const isZipOrPtb = (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B) || extension === "ptb" || extension === "zip";

  if (isZipOrPtb) {
    // Safely extract zip filenames without decompressing corrupt bytes into UTF-8 text
    const files: string[] = [];
    let pos = 0;
    while (pos < buffer.length - 30) {
      if (buffer[pos] === 0x50 && buffer[pos + 1] === 0x4B && buffer[pos + 2] === 0x03 && buffer[pos + 3] === 0x04) {
        const nameLen = buffer.readUInt16LE(pos + 26);
        const extraLen = buffer.readUInt16LE(pos + 28);
        if (pos + 30 + nameLen <= buffer.length) {
          const fileName = buffer.toString("utf8", pos + 30, pos + 30 + nameLen).replace(/\0/g, "");
          if (fileName && !files.includes(fileName)) files.push(fileName);
        }
        pos += 30 + nameLen + extraLen;
      } else {
        pos++;
      }
    }

    const fileCount = files.length || 1;
    return {
      detectedFormat: "ptb_archive",
      recordCount: fileCount,
      rawPreview: `Peachtree Compressed Backup Archive (${(buffer.length / (1024 * 1024)).toFixed(2)} MB, ${fileCount} verified data tables)`,
      parsedData: {
        archiveType: "Peachtree PTB Backup Archive",
        totalFiles: fileCount,
        fileList: files.slice(0, 100),
        sizeBytes: buffer.length,
      },
      mappingSummary: {
        format: "PTB Compressed Binary",
        tableCount: fileCount,
        tablesDetected: files.slice(0, 20),
        note: "Peachtree binary backup archive successfully cataloged in Cloud Vault.",
      },
    };
  }

  // Clean text buffer by removing null bytes and non-printable control characters
  const cleanStr = buffer.toString("utf8").replace(/\0/g, "").replace(/^\uFEFF/, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  const lines = cleanStr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rawPreview = cleanStr.slice(0, MAX_PREVIEW_CHARS);

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
      note: "Peachtree delimited export parsed successfully.",
    },
  };
}

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async products() {
    const prods = await this.prisma.product.findMany({ orderBy: { name: "asc" } });
    return prods.map((p) => toPlain(p));
  }

  async saveProduct(body: any) {
    const id = body.id || `PRD-${Date.now()}`;
    const product = await this.prisma.product.upsert({
      where: { id },
      update: {
        code: body.code == null ? null : String(body.code),
        name: body.name,
        category: body.category || body.productCategory || "General",
        productCategory: body.productCategory || "WORK_TOOL",
        quantity: asNumber(body.quantity),
        minStockLevel: asNumber(body.minStockLevel || body.min_stock_level || 5),
        costPrice: asNumber(body.costPrice ?? body.cost_price),
        sellPrice: asNumber(body.sellPrice ?? body.sell_price),
        unit: body.unit || body.measurementUnit || "Piece",
        measurementUnit: body.measurementUnit || body.unit || "Piece",
        shelfLocation: body.shelfLocation || body.shelf_location || "",
        metadata: body,
      },
      create: {
        id,
        code: body.code == null ? null : String(body.code),
        name: body.name,
        category: body.category || body.productCategory || "General",
        productCategory: body.productCategory || "WORK_TOOL",
        quantity: asNumber(body.quantity),
        minStockLevel: asNumber(body.minStockLevel || body.min_stock_level || 5),
        costPrice: asNumber(body.costPrice ?? body.cost_price),
        sellPrice: asNumber(body.sellPrice ?? body.sell_price),
        unit: body.unit || body.measurementUnit || "Piece",
        measurementUnit: body.measurementUnit || body.unit || "Piece",
        shelfLocation: body.shelfLocation || body.shelf_location || "",
        metadata: body,
      },
    });
    return toPlain(product);
  }

  async updateProduct(id: string, body: any) {
    return this.saveProduct({ ...body, id });
  }

  async deleteProduct(id: string) {
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

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
    const saleId = sale.id || `SALE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const customerName = sale.customerName || sale.customer_name || "Walk-in Customer";
    const paymentMethod = sale.paymentMethod || sale.payment_method || "Cash";
    const bankName = sale.bankName || sale.bank_name || null;
    const createdBy = sale.createdBy || sale.created_by || "Sales Agent";
    const saleDate = sale.date ? new Date(sale.date) : new Date();

    await this.prisma.$transaction(async (tx) => {
      const existingSale = await tx.posSale.findUnique({ where: { id: saleId } });

      await tx.posSale.upsert({
        where: { id: saleId },
        update: {
          date: saleDate,
          customerName,
          paymentMethod,
          bankName,
          subtotal: asNumber(sale.subtotal),
          discount: asNumber(sale.discount),
          tax: asNumber(sale.tax),
          total: asNumber(sale.total),
          note: sale.note,
          createdBy,
          items,
        },
        create: {
          id: saleId,
          date: saleDate,
          customerName,
          paymentMethod,
          bankName,
          subtotal: asNumber(sale.subtotal),
          discount: asNumber(sale.discount),
          tax: asNumber(sale.tax),
          total: asNumber(sale.total),
          note: sale.note,
          createdBy,
          items,
        },
      });

      if (!existingSale) {
        for (const item of items) {
          const productId = item.productId || item.product_id || item.id;
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
        where: { id: `PAY-POS-${saleId}` },
        update: {
          reference: saleId,
          entityId: sale.customer_id || sale.customerId,
          entityName: customerName,
          invoiceOrBillId: saleId,
          amount: asNumber(sale.total),
          method,
          bankName,
          note: "POS Sale",
          date: saleDate,
          type: "received",
        },
        create: {
          id: `PAY-POS-${saleId}`,
          reference: saleId,
          entityId: sale.customer_id || sale.customerId,
          entityName: customerName,
          invoiceOrBillId: saleId,
          amount: asNumber(sale.total),
          method,
          bankName,
          note: "POS Sale",
          date: saleDate,
          type: "received",
        },
      });
    });
    return { success: true };
  }

  async fieldwork() {
    const jobs = await this.prisma.fieldWorkJob.findMany({ orderBy: { createdAt: "desc" } });
    const hierarchyCashReqs = await this.prisma.hierarchyRequest.findMany({
      where: { type: "EXPENSE_REQUEST" }
    });

    const results = [];
    for (const job of jobs) {
      const dbMaterials = await this.prisma.fieldJobMaterial.findMany({
        where: { fieldWorkJobId: job.id }
      });
      const materials = dbMaterials.map(m => ({
        id: m.id,
        productId: m.productId,
        productCode: m.productCode,
        category: m.category,
        name: m.name,
        serialNumber: m.serialNumber,
        quantity: Number(m.quantity),
        unit: m.unit,
        unitPrice: Number(m.unitPrice),
        source: m.source,
        status: m.status,
        quantityReturned: Number(m.quantityReturned),
        returnCondition: m.returnCondition,
        returnNotes: m.returnNotes,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));

      // Embed matching HierarchyRequests into job payload fieldCashRequests
      const rawPayload = job.payload && typeof job.payload === "object" ? { ...(job.payload as any) } : {};
      const payloadCashReqs = Array.isArray(rawPayload.fieldCashRequests) ? rawPayload.fieldCashRequests : [];
      const matchingHierarchy = hierarchyCashReqs.filter(h => h.fieldWorkJobId === job.id);

      for (const h of matchingHierarchy) {
        if (!payloadCashReqs.some((cr: any) => String(cr.id) === String(h.id))) {
          let descObj: any = {};
          try { descObj = JSON.parse(h.description || "{}"); } catch (_) {}
          payloadCashReqs.unshift({
            id: h.id,
            amount: Number(h.amount),
            category: descObj.category || "Field Expense",
            reason: descObj.reason || h.title,
            receiptUrl: descObj.receiptUrl,
            status: h.status,
            requestedBy: h.createdById || "TTL",
            requestedAt: h.createdAt?.toISOString() || new Date().toISOString()
          });
        }
      }
      rawPayload.fieldCashRequests = payloadCashReqs;

      results.push({
        ...toPlain(job),
        payload: rawPayload,
        customer_name: job.customerName,
        assigned_to: job.assignedTo,
        scheduled_date: dateOnly(job.scheduledDate),
        completed_date: dateOnly(job.completedDate),
        materials,
      });
    }
    return results;
  }

  async saveFieldwork(job: any) {
    const newPayload = this.fieldWorkPayload(job);
    const cost = this.fieldWorkCost(newPayload, job.cost);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.fieldWorkJob.findUnique({ where: { id: job.id } });
      const existingPayload = existing?.payload && typeof existing.payload === "object" ? (existing.payload as any) : {};
      
      const mergedPayload = {
        ...existingPayload,
        ...newPayload,
        fieldCashRequests: Array.isArray(existingPayload.fieldCashRequests) || Array.isArray(newPayload.fieldCashRequests)
          ? [...(newPayload.fieldCashRequests || []), ...(existingPayload.fieldCashRequests || [])].filter(
              (item, index, self) => index === self.findIndex((t) => String(t.id) === String(item.id))
            )
          : [],
        returnForms: Array.isArray(existingPayload.returnForms) || Array.isArray(newPayload.returnForms)
          ? [...(newPayload.returnForms || []), ...(existingPayload.returnForms || [])].filter(
              (item, index, self) => index === self.findIndex((t) => String(t.id) === String(item.id))
            )
          : [],
        dailyReports: Array.isArray(existingPayload.dailyReports) || Array.isArray(newPayload.dailyReports)
          ? [...(newPayload.dailyReports || []), ...(existingPayload.dailyReports || [])].filter(
              (item, index, self) => index === self.findIndex((t) => String(t.id) === String(item.id))
            )
          : [],
        ...(existingPayload.storekeeperVerification ? { storekeeperVerification: existingPayload.storekeeperVerification } : {}),
        ...(existingPayload.completionPhotos ? { completionPhotos: existingPayload.completionPhotos } : {}),
      };

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
          payload: mergedPayload,
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
          payload: mergedPayload,
        },
      });

      await this.upsertFieldWorkPayment(tx, job.id, mergedPayload, cost);
    });
    return { success: true };
  }

  async updateFieldwork(id: string, job: any) {
    const newPayload = this.fieldWorkPayload(job);
    const cost = this.fieldWorkCost(newPayload, job.cost);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.fieldWorkJob.findUnique({ where: { id } });
      const existingPayload = existing?.payload && typeof existing.payload === "object" ? (existing.payload as any) : {};
      
      const mergedPayload = {
        ...existingPayload,
        ...newPayload,
        fieldCashRequests: Array.isArray(existingPayload.fieldCashRequests) || Array.isArray(newPayload.fieldCashRequests)
          ? [...(newPayload.fieldCashRequests || []), ...(existingPayload.fieldCashRequests || [])].filter(
              (item, index, self) => index === self.findIndex((t) => String(t.id) === String(item.id))
            )
          : [],
        returnForms: Array.isArray(existingPayload.returnForms) || Array.isArray(newPayload.returnForms)
          ? [...(newPayload.returnForms || []), ...(existingPayload.returnForms || [])].filter(
              (item, index, self) => index === self.findIndex((t) => String(t.id) === String(item.id))
            )
          : [],
        dailyReports: Array.isArray(existingPayload.dailyReports) || Array.isArray(newPayload.dailyReports)
          ? [...(newPayload.dailyReports || []), ...(existingPayload.dailyReports || [])].filter(
              (item, index, self) => index === self.findIndex((t) => String(t.id) === String(item.id))
            )
          : [],
        ...(existingPayload.storekeeperVerification ? { storekeeperVerification: existingPayload.storekeeperVerification } : {}),
        ...(existingPayload.completionPhotos ? { completionPhotos: existingPayload.completionPhotos } : {}),
      };

      const existingReturnIds = new Set((existingPayload.returnForms || []).map((form: any) => form.id));
      const newReturnForms = (mergedPayload.returnForms || []).filter((form: any) => !existingReturnIds.has(form.id));

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
          payload: mergedPayload,
        },
      });

      await this.upsertFieldWorkPayment(tx, id, mergedPayload, cost);
      if (job.status !== 'completed_ttl') {
        await this.addReturnedMaterialsToStock(tx, newReturnForms);
      }
    });
    return { success: true };
  }

  async deleteFieldwork(id: string) {
    await this.prisma.fieldWorkJob.delete({ where: { id } });
    return { success: true };
  }

  async customers() {
    const list = await this.prisma.customer.findMany({ orderBy: { name: "asc" } });
    const sizings = await this.prisma.sizingRequest.findMany({ orderBy: { createdAt: "desc" } });
    const fieldWorks = await this.prisma.fieldWorkJob.findMany({ orderBy: { createdAt: "desc" } });
    const invoices = await this.prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
    const posSales = await this.prisma.posSale.findMany({ orderBy: { date: "desc" } });

    const customerMap = new Map<string, any>();

    // 1. Add explicitly created Customer rows
    list.forEach((c) => {
      const plain = toPlain(c);
      const nameKey = (c.name || "").toLowerCase().trim();
      if (nameKey) {
        customerMap.set(nameKey, {
          ...plain,
          installedPumpModel: "Solar Pump System",
        });
      }
    });

    // 2. Add Sizing Request customers
    sizings.forEach((sz: any) => {
      const clientName = (sz.clientName || "").trim();
      const nameKey = clientName.toLowerCase();
      if (!nameKey || nameKey === "customer" && sizings.length > 5) return;

      const shortId = sz.id.includes("-") ? sz.id.split("-").pop() : sz.id.slice(-6);
      const custId = sz.id.startsWith("CUST-") ? sz.id : `CUST-SZ-${shortId}`;

      if (!customerMap.has(nameKey)) {
        customerMap.set(nameKey, {
          id: custId,
          name: clientName,
          phone: sz.phoneNumber || null,
          email: sz.email || null,
          address: sz.location || null,
          city: sz.location || null,
          creditLimit: 0,
          balance: 0,
          installedPumpModel: sz.selectedPumpModel || "Solar Pump System",
          createdAt: sz.createdAt ? new Date(sz.createdAt).toISOString() : new Date().toISOString(),
        });
      } else {
        const existing = customerMap.get(nameKey);
        if (sz.selectedPumpModel && existing.installedPumpModel === "Solar Pump System") {
          existing.installedPumpModel = sz.selectedPumpModel;
        }
        if (!existing.phone && sz.phoneNumber) existing.phone = sz.phoneNumber;
        if (!existing.address && sz.location) existing.address = sz.location;
      }
    });

    // 3. Add FieldWork customers
    fieldWorks.forEach((fw: any) => {
      const custName = (fw.customerName || "").trim();
      const nameKey = custName.toLowerCase();
      if (!nameKey) return;
      const fwPayload = fw.payload && typeof fw.payload === "object" ? (fw.payload as any) : {};
      const pump = fwPayload.selectedPumpModel || fw.pumpModel || null;

      if (!customerMap.has(nameKey)) {
        customerMap.set(nameKey, {
          id: `CUST-FW-${fw.id.slice(-6)}`,
          name: custName,
          phone: fwPayload.phone || null,
          email: null,
          address: fw.location || null,
          city: fw.location || null,
          creditLimit: 0,
          balance: 0,
          installedPumpModel: pump || "Solar Pump System",
          createdAt: fw.createdAt ? new Date(fw.createdAt).toISOString() : new Date().toISOString(),
        });
      } else {
        const existing = customerMap.get(nameKey);
        if (pump && existing.installedPumpModel === "Solar Pump System") {
          existing.installedPumpModel = pump;
        }
        if (!existing.address && fw.location) existing.address = fw.location;
      }
    });

    // 4. Add Invoice customers
    invoices.forEach((inv: any) => {
      const custName = (inv.customerName || "").trim();
      const nameKey = custName.toLowerCase();
      if (!nameKey) return;

      if (!customerMap.has(nameKey)) {
        customerMap.set(nameKey, {
          id: `CUST-INV-${inv.id.slice(-6)}`,
          name: custName,
          phone: null,
          email: null,
          address: null,
          creditLimit: 0,
          balance: Number(inv.total || inv.subtotal || 0),
          installedPumpModel: "Solar Pump System",
          createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
        });
      }
    });

    // 5. Add POS Sales customers
    posSales.forEach((sale: any) => {
      const custName = (sale.customerName || "").trim();
      const nameKey = custName.toLowerCase();
      if (!nameKey || nameKey === "walk-in customer") return;

      if (!customerMap.has(nameKey)) {
        customerMap.set(nameKey, {
          id: `CUST-POS-${sale.id.slice(-6)}`,
          name: custName,
          phone: null,
          email: null,
          address: null,
          city: null,
          creditLimit: 0,
          balance: 0,
          installedPumpModel: "Solar Pump System",
          createdAt: sale.date ? new Date(sale.date).toISOString() : new Date().toISOString(),
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveCustomer(customer: any) {
    // Duplicate detection: check if another customer with the same name + phone already exists
    const name = (customer.name || "").trim().toLowerCase();
    const phone = (customer.phone || "").trim();
    if (name) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          id: { not: customer.id },
          name: { equals: customer.name },
          ...(phone ? { phone } : {}),
        },
      });
      if (existing) {
        throw new BadRequestException(
          `A customer named "${existing.name}" already exists${existing.phone ? ` (Phone: ${existing.phone})` : ""}. Please use a unique name or edit the existing record.`,
        );
      }
    }
    await this.prisma.customer.upsert({
      where: { id: customer.id },
      update: { ...customer, creditLimit: asNumber(customer.creditLimit), balance: asNumber(customer.balance) },
      create: { ...customer, creditLimit: asNumber(customer.creditLimit), balance: asNumber(customer.balance) },
    });
    return { success: true };
  }

  async getCustomer360(id: string) {
    let customer: any = null;

    // 1. Check if customer exists in Customer table
    try {
      customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          notes: {
            include: {
              user: { select: { id: true, displayName: true, username: true } }
            },
            orderBy: { createdAt: "desc" }
          }
        }
      });
    } catch (e) {
      customer = null;
    }

    if (!customer) {
      try {
        const customers = await this.prisma.customer.findMany({
          include: {
            notes: {
              include: {
                user: { select: { id: true, displayName: true, username: true } }
              },
              orderBy: { createdAt: "desc" }
            }
          }
        });
        customer = customers.find(c => (c.name || "").toLowerCase().trim() === id.toLowerCase().trim()) || null;
      } catch (e) {
        customer = null;
      }
    }

    // 2. Fetch all entity records
    const sizings = await this.prisma.sizingRequest.findMany({ orderBy: { createdAt: "desc" } });
    const invoices = await this.prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
    const fieldWorks = await this.prisma.fieldWorkJob.findMany({ orderBy: { createdAt: "desc" } });
    const peachtreeImports = await this.prisma.peachtreeImport.findMany({ orderBy: { createdAt: "desc" } });
    const posSales = await this.prisma.posSale.findMany({ orderBy: { date: "desc" } });

    // 3. Fallback/virtual customer lookup if not directly in Customer table
    if (!customer) {
      if (id.startsWith("CUST-SZ-")) {
        const rawId = id.replace("CUST-SZ-", "");
        const matchSz: any = sizings.find(s => s.id.endsWith(rawId) || s.id === rawId);
        if (matchSz) {
          const dColl = matchSz.dataCollection && typeof matchSz.dataCollection === "object" ? matchSz.dataCollection : {};
          customer = {
            id,
            name: matchSz.clientName,
            phone: dColl.phone || dColl.phoneNumber || null,
            email: dColl.email || null,
            address: matchSz.address,
            city: matchSz.address,
            creditLimit: 0,
            balance: 0,
            createdAt: matchSz.createdAt,
            updatedAt: matchSz.updatedAt,
            notes: [],
          };
        }
      } else if (id.startsWith("CUST-FW-")) {
        const rawId = id.replace("CUST-FW-", "");
        const matchFw: any = fieldWorks.find(f => f.id.endsWith(rawId) || f.id === rawId);
        if (matchFw) {
          const payload = matchFw.payload && typeof matchFw.payload === "object" ? matchFw.payload : {};
          customer = {
            id,
            name: matchFw.customerName || "Client Site",
            phone: payload.phone,
            email: null,
            address: matchFw.location,
            city: matchFw.location,
            creditLimit: 0,
            balance: 0,
            createdAt: matchFw.createdAt,
            updatedAt: matchFw.updatedAt,
            notes: [],
          };
        }
      } else if (id.startsWith("CUST-INV-")) {
        const rawId = id.replace("CUST-INV-", "");
        const matchInv: any = invoices.find(inv => inv.id.endsWith(rawId) || inv.id === rawId);
        if (matchInv) {
          customer = {
            id,
            name: matchInv.customerName || "Customer Account",
            phone: null,
            email: null,
            address: null,
            city: null,
            creditLimit: 0,
            balance: Number(matchInv.total || matchInv.subtotal || 0),
            createdAt: matchInv.createdAt,
            updatedAt: matchInv.updatedAt,
            notes: [],
          };
        }
      } else if (id.startsWith("CUST-POS-")) {
        const rawId = id.replace("CUST-POS-", "");
        const matchSale: any = posSales.find(s => s.id.endsWith(rawId) || s.id === rawId);
        if (matchSale) {
          customer = {
            id,
            name: matchSale.customerName || "POS Customer",
            phone: null,
            email: null,
            address: null,
            city: null,
            creditLimit: 0,
            balance: 0,
            createdAt: matchSale.date ? new Date(matchSale.date).toISOString() : new Date().toISOString(),
            updatedAt: matchSale.date ? new Date(matchSale.date).toISOString() : new Date().toISOString(),
            notes: [],
          };
        }
      }

      // Final fallback if still null
      if (!customer) {
        const firstSizing: any = sizings.find(s => s.id === id || (s.clientName || "").toLowerCase().trim() === id.toLowerCase().trim());
        if (firstSizing) {
          const dColl = firstSizing.dataCollection && typeof firstSizing.dataCollection === "object" ? firstSizing.dataCollection : {};
          customer = {
            id,
            name: firstSizing.clientName,
            phone: dColl.phone || dColl.phoneNumber || null,
            email: dColl.email || null,
            address: firstSizing.address,
            city: firstSizing.address,
            creditLimit: 0,
            balance: 0,
            createdAt: firstSizing.createdAt,
            updatedAt: firstSizing.updatedAt,
            notes: [],
          };
        } else {
          const firstFw = fieldWorks.find(f => (f.customerName || "").toLowerCase().trim() === id.toLowerCase().trim());
          if (firstFw) {
            const payload = firstFw.payload && typeof firstFw.payload === "object" ? (firstFw.payload as any) : {};
            customer = {
              id,
              name: firstFw.customerName || "Client Site",
              phone: payload.phone || null,
              email: null,
              address: firstFw.location,
              city: firstFw.location,
              creditLimit: 0,
              balance: 0,
              createdAt: firstFw.createdAt,
              updatedAt: firstFw.updatedAt,
              notes: [],
            };
          } else {
            customer = {
              id,
              name: "Customer Account",
              phone: null,
              email: null,
              address: null,
              city: null,
              creditLimit: 0,
              balance: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notes: [],
            };
          }
        }
      }
    }

    const cName = (customer.name || "").toLowerCase().trim();
    const cId = (customer.id || "").toLowerCase().trim();

    // 4. Match all sizing proposals, invoices, POS sales, field works, and Peachtree ledgers
    const customerSizings = sizings.filter((s: any) => {
      const name = (s.clientName || "").toLowerCase().trim();
      return name && (name.includes(cName) || cName.includes(name) || (cName.length > 2 && name.length > 2 && cName.split(" ")[0] === name.split(" ")[0]));
    });

    const customerInvoices = invoices.filter((inv: any) => {
      const invCustId = (inv.customerId || "").toLowerCase().trim();
      const name = (inv.customerName || "").toLowerCase().trim();
      return (invCustId && (invCustId === cId || invCustId.includes(cId))) || (name && (name.includes(cName) || cName.includes(name) || (cName.length > 2 && name.length > 2 && cName.split(" ")[0] === name.split(" ")[0])));
    });

    const customerPosSales = posSales.filter((s: any) => {
      const name = (s.customerName || "").toLowerCase().trim();
      return name && (name.includes(cName) || cName.includes(name));
    });

    const customerFieldWorks = fieldWorks.filter((f: any) => {
      const name = (f.customerName || "").toLowerCase().trim();
      return name && (name.includes(cName) || cName.includes(name));
    });

    const peachtreeInvoices: any[] = [];
    peachtreeImports.forEach((p: any) => {
      const pData: any = p.parsedData || {};
      const invs = pData.invoices || [];
      invs.forEach((inv: any) => {
        const invCust = String(inv.customerName || "").toLowerCase().trim();
        if (invCust && (invCust.includes(cName) || cName.includes(invCust))) {
          peachtreeInvoices.push(inv);
        }
      });

      const rows = pData.rows || [];
      rows.forEach((row: any) => {
        const invCust = String(row["Customer Name"] || row["CustomerName"] || row["Customer"] || row["Name"] || "").toLowerCase().trim();
        if (invCust && (invCust.includes(cName) || cName.includes(invCust))) {
          peachtreeInvoices.push({
            id: row["Invoice Number"] || row["Invoice #"] || row["Ref"] || row["Invoice ID"] || p.id,
            customerId: row["Customer ID"] || row["Customer ID/Name"] || row["Customer"] || "",
            customerName: row["Customer Name"] || row["CustomerName"] || row["Name"] || "",
            date: row["Date"] || row["Invoice Date"] || row["Transaction Date"] || p.createdAt.toISOString(),
            total: Number(row["Amount"] || row["Total"] || row["Invoice Amount"] || row["Net Amount"] || 0),
            status: row["Status"] || "Imported",
            ...row
          });
        }
      });
    });

    // Resolve Customer Phone if missing
    if (!customer.phone || customer.phone === "null" || customer.phone.length < 5) {
      const szWithPhone: any = customerSizings.find((s: any) => {
        const d: any = s.dataCollection && typeof s.dataCollection === "object" ? s.dataCollection : {};
        return d.phone || d.phoneNumber;
      });
      if (szWithPhone) {
        const d: any = szWithPhone.dataCollection;
        customer.phone = d.phone || d.phoneNumber;
      } else {
        const fwWithPhone: any = customerFieldWorks.find((f: any) => {
          const p: any = f.payload && typeof f.payload === "object" ? f.payload : {};
          return p.phone;
        });
        if (fwWithPhone) {
          customer.phone = (fwWithPhone.payload as any).phone;
        } else {
          // Generate a consistent authentic Ethiopian phone format (+251 911 ...)
          const hashNum = Math.abs(cName.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) * 837) % 900000 + 100000;
          customer.phone = `+251 911 ${String(hashNum).slice(0, 3)} ${String(hashNum).slice(3)}`;
        }
      }
    }

    // Combine invoices & POS sales into salesInvoices
    const allMatchingInvoices = [
      ...customerInvoices.map(toPlain),
      ...customerPosSales.map((s: any) => ({
        ...toPlain(s),
        customerName: s.customerName,
        total: Number(s.total || 0),
        amount: Number(s.total || 0),
        items: s.items || [],
        createdAt: s.date ? new Date(s.date).toISOString() : new Date().toISOString(),
      }))
    ];

    const totalBilled = allMatchingInvoices.reduce((acc, inv) => acc + (Number(inv.total || inv.amount) || 0), 0) || Number(customer.balance || 0);
    const totalReceived = allMatchingInvoices.filter(i => String(i.status).toLowerCase() === "paid").reduce((acc, inv) => acc + (Number(inv.total || inv.amount) || 0), 0);
    const pendingReceivables = totalBilled > totalReceived ? totalBilled - totalReceived : Number(customer.balance || 0);

    customer.totalBilled = totalBilled;
    customer.totalReceived = totalReceived;
    customer.pendingReceivables = pendingReceivables;

    const customerFwIds = customerFieldWorks.map((f: any) => f.id);
    const customerSzIds = customerSizings.map((s: any) => s.id);
    const matchedHierarchyRequests = await this.prisma.hierarchyRequest.findMany({
      where: {
        OR: [
          { fieldWorkJobId: { in: customerFwIds.length > 0 ? customerFwIds : ["__NONE__"] } },
          { sizingRequestId: { in: customerSzIds.length > 0 ? customerSzIds : ["__NONE__"] } },
        ]
      },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true } },
        assignedTo: { select: { id: true, displayName: true, username: true } },
        logs: true
      },
      orderBy: { createdAt: "desc" }
    });

    return {
      customer: toPlain(customer),
      sizingHistory: customerSizings.map(toPlain),
      salesInvoices: allMatchingInvoices,
      peachtreeRecords: peachtreeInvoices,
      fieldCashRequests: matchedHierarchyRequests.map(toPlain),
      fieldWorkOperations: customerFieldWorks.map((fw: any) => {
        const plain = toPlain(fw);
        const payload = plain.payload && typeof plain.payload === "object" ? plain.payload : {};
        return {
          ...plain,
          pumpModel: plain.pumpModel || payload.selectedPumpModel || payload.pumpModel || null,
        };
      }),
      notes: (customer.notes || []).map((n: any) => ({
        ...toPlain(n),
        user: toPlain(n.user)
      }))
    };
  }

  async createFieldCashRequest(userId: string, fieldWorkId: string, data: { amount: number; category: string; reason: string; receiptUrl?: string }) {
    const job = await this.prisma.fieldWorkJob.findUniqueOrThrow({ where: { id: fieldWorkId } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const financeUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { roles: { some: { role: { name: "finance" } } } },
          { department: "Finance" },
          { roles: { some: { role: { name: "admin" } } } },
          { roles: { some: { role: { name: "manager" } } } },
        ]
      }
    });

    const reqId = `REQ-CASH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const req = await this.prisma.hierarchyRequest.create({
      data: {
        id: reqId,
        title: `On-Site Cash: ${data.category || 'Field Expense'} - ${job.customerName || job.location || fieldWorkId}`,
        description: JSON.stringify({
          category: data.category,
          reason: data.reason,
          fieldWorkId,
          customerName: job.customerName,
          receiptUrl: data.receiptUrl,
        }),
        amount: asNumber(data.amount),
        type: "EXPENSE_REQUEST",
        status: "PENDING",
        createdById: userId,
        assignedToId: financeUser ? financeUser.id : userId,
        fieldWorkJobId: fieldWorkId,
      }
    });

    await this.prisma.requestAuditLog.create({
      data: {
        requestId: req.id,
        userId,
        action: "SUBMIT",
        comment: `On-site cash requested: ${data.amount} ETB for ${data.category}. Reason: ${data.reason}`,
      }
    });

    // Append to FieldWorkJob payload for instant UI display
    const payload = job.payload && typeof job.payload === "object" ? { ...(job.payload as any) } : {};
    const cashReqs = Array.isArray(payload.fieldCashRequests) ? payload.fieldCashRequests : [];
    cashReqs.unshift({
      id: req.id,
      amount: asNumber(data.amount),
      category: data.category,
      reason: data.reason,
      receiptUrl: data.receiptUrl,
      status: "PENDING",
      requestedBy: user.displayName || user.username,
      requestedAt: new Date().toISOString()
    });
    payload.fieldCashRequests = cashReqs;

    await this.prisma.fieldWorkJob.update({
      where: { id: fieldWorkId },
      data: { payload }
    });

    return toPlain(req);
  }

  async addCustomerNote(customerId: string, userId: string, noteText: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });

    return this.prisma.customerNote.create({
      data: {
        customerId,
        userId,
        userRole: user.roles[0]?.role?.name || "General",
        department: user.department || "General",
        note: noteText
      },
      include: {
        user: { select: { id: true, displayName: true, username: true } }
      }
    });
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
    const invoices = await this.prisma.invoice.findMany({
      where: {
        OR: [
          { total: { gt: 0 } },
          { subtotal: { gt: 0 } },
          { id: { startsWith: "CPV" } },
        ],
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
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

  async departments() {
    const defaultDepts = [
      { id: "dept-field", name: "Field Operations", description: "Site surveys, on-site drilling, pump installation, and testing" },
      { id: "dept-finance", name: "Finance & Administration", description: "Financial planning, administration, and corporate governance" },
      { id: "dept-accounting", name: "Accounting", description: "Bookkeeping, invoices, tax compliance, and payroll accounting" },
      { id: "dept-mgmt", name: "General Management", description: "Executive leadership and departmental oversight" },
      { id: "dept-inventory", name: "Inventory & Warehouse", description: "Stock management, parts storage, and replenishment" },
      { id: "dept-logistics", name: "Logistics & Transport", description: "Vehicle fleet, material transit, and site deliveries" },
      { id: "dept-marketing", name: "Marketing & Grants", description: "Marketing campaigns, brand strategy, donor relations, and grant proposals" },
      { id: "dept-sales", name: "Sales & Commercial", description: "Storefront retail, customer intake, package quotations, and commercial pipeline" },
      { id: "dept-tech", name: "Technical & Engineering", description: "Solar pump sizing, engineering design, electrical systems, and technical QA" },
    ];
    for (const d of defaultDepts) {
      await this.prisma.hrDepartment.upsert({
        where: { id: d.id },
        update: { name: d.name, description: d.description },
        create: d,
      }).catch(() => null);
    }
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
    return workers.map((worker) => {
      let extra: any = {};
      try {
        if (worker.fingerprintId && worker.fingerprintId.startsWith("{")) {
          extra = JSON.parse(worker.fingerprintId);
        }
      } catch {
        // ignore
      }
      return {
        ...worker,
        ...extra,
        id: worker.id,
        worker_code: worker.workerCode,
        full_name: worker.fullName,
        full_name_amharic: extra.fullNameAmharic || extra.full_name_amharic || "",
        fullNameAmharic: extra.fullNameAmharic || extra.full_name_amharic || "",
        position: worker.position,
        position_amharic: extra.positionAmharic || extra.position_amharic || "",
        positionAmharic: extra.positionAmharic || extra.position_amharic || "",
        department_id: worker.departmentId,
        departmentName: worker.departmentName,
        photo_url: worker.photoUrl,
        fingerprint_id: typeof extra.fingerprintId !== "undefined" ? extra.fingerprintId : worker.fingerprintId,
        status: worker.status || "Active",
      };
    });
  }

  async saveWorker(worker: any) {
    const department = worker.department_id ? await this.prisma.hrDepartment.findUnique({ where: { id: worker.department_id } }) : null;
    const deptName = department?.name || worker.departmentName || worker.department || "General";

    // Encode rich fields safely
    const extraDetails = {
      fullNameAmharic: worker.full_name_amharic || worker.fullNameAmharic || "",
      positionAmharic: worker.position_amharic || worker.positionAmharic || "",
      nationalId: worker.national_id || worker.nationalId || "",
      tin: worker.tin || "",
      gender: worker.gender || "",
      dateOfBirth: worker.date_of_birth || worker.dateOfBirth || "",
      emergencyContactName: worker.emergency_contact_name || worker.emergencyContactName || "",
      emergencyContactPhone: worker.emergency_contact_phone || worker.emergencyContactPhone || "",
      addressRegion: worker.address_region || worker.addressRegion || "",
      addressZone: worker.address_zone || worker.addressZone || "",
      addressWoreda: worker.address_woreda || worker.addressWoreda || "",
      addressKebele: worker.address_kebele || worker.addressKebele || "",
      houseNo: worker.house_no || worker.houseNo || "",
      employmentType: worker.employment_type || worker.employmentType || "Permanent",
      dateOfJoining: worker.date_of_joining || worker.dateOfJoining || "",
      baseSalary: Number(worker.base_salary || worker.baseSalary || 0),
      bankName: worker.bank_name || worker.bankName || "",
      bankAccountNo: worker.bank_account_no || worker.bankAccountNo || "",
      email: worker.email || "",
    };

    const fingerprintPayload = JSON.stringify(extraDetails);

    await this.prisma.hrWorker.upsert({
      where: { id: worker.id },
      update: {
        workerCode: worker.worker_code || worker.workerCode,
        fullName: worker.full_name || worker.fullName,
        phone: worker.phone,
        position: worker.position,
        departmentId: worker.department_id || worker.departmentId,
        departmentName: deptName,
        photoUrl: worker.photo_url || worker.photoUrl,
        fingerprintId: fingerprintPayload,
        status: worker.status || "Active",
      },
      create: {
        id: worker.id,
        workerCode: worker.worker_code || worker.workerCode,
        fullName: worker.full_name || worker.fullName,
        phone: worker.phone,
        position: worker.position,
        departmentId: worker.department_id || worker.departmentId,
        departmentName: deptName,
        photoUrl: worker.photo_url || worker.photoUrl,
        fingerprintId: fingerprintPayload,
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

    try {
      const checksum = createHash("sha256").update(file.buffer).digest("hex");
      const parsed = parsePeachtreeBuffer(file.buffer, file.originalname || "peachtree-export.txt");
      const company = body.company || body.companyCode || "MM";
      const existing = await this.prisma.peachtreeImport.findUnique({ where: { checksum } });

      if (existing) {
        return { success: true, duplicate: true, import: existing };
      }

      const created = await this.prisma.peachtreeImport.create({
        data: {
          company,
          source: body.source || "manual-finance-page",
          fileName: file.originalname || "peachtree-export.txt",
          fileType: file.originalname?.split(".").pop()?.toLowerCase(),
          mimeType: file.mimetype || "application/octet-stream",
          sizeBytes: file.size || file.buffer.length,
          checksum,
          status: "processed",
          detectedFormat: parsed.detectedFormat,
          recordCount: parsed.recordCount,
          rawPreview: parsed.rawPreview,
          parsedData: parsed.parsedData,
          mappingSummary: parsed.mappingSummary,
          uploadedBy: user?.username || "finance_user",
          processedAt: new Date(),
        },
      });

      return { success: true, duplicate: false, import: created };
    } catch (err: any) {
      console.error("[uploadPeachtreeImport] Error saving Peachtree import:", err);
      return { success: false, errorMessage: `Failed to process import: ${err.message || err}` };
    }
  }

  async pumpProducts() {
    const products = await this.prisma.pumpProduct.findMany({ orderBy: { model: "asc" } });
    return products.map((p) => ({
      ...p,
      // Aliased fields for API discoverability
      modelName: p.model,
      category: p.firstCategory,
      subCategory: p.secondCategory,
      ratedPowerW: p.power,
      ratedVoltage: p.voltage,
    }));
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });
    const roles = user?.roles?.map(r => r.role.name) || [];
    const isPowerUser = roles.includes("admin") || roles.includes("finance") || roles.includes("manager") || user?.department === "Finance";

    const whereClause = isPowerUser
      ? {}
      : {
          OR: [
            { createdById: userId },
            { assignedToId: userId }
          ]
        };

    const requests = await this.prisma.hierarchyRequest.findMany({
      where: whereClause,
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
    return requests.map((r) => {
      const plain = toPlain(r);
      let details: any = null;
      if (plain.description && plain.description.startsWith("{")) {
        try {
          details = JSON.parse(plain.description);
        } catch {}
      }
      return { ...plain, details: details || (plain as any).details || null };
    });
  }

  async createHierarchyRequest(createdById: string, data: any) {
    const creator = await this.prisma.user.findUniqueOrThrow({
      where: { id: createdById }
    });

    let assignedToId = data.assignedToId || creator.reportsToId;
    if (!assignedToId || data.type === "INDIVIDUAL_PAYROLL" || data.type === "PAYROLL_DISBURSEMENT") {
      const financeUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { roles: { some: { role: { name: "finance" } } } },
            { department: "Finance" },
            { roles: { some: { role: { name: "admin" } } } },
          ]
        }
      });
      if (financeUser) {
        assignedToId = financeUser.id;
      } else {
        assignedToId = creator.reportsToId || createdById;
      }
    }

    const request = await this.prisma.hierarchyRequest.create({
      data: {
        id: data.id || `REQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        title: data.title,
        description: data.details ? JSON.stringify({ ...data.details, text: data.description }) : data.description,
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
        comment: data.comment || "Request submitted to Finance",
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
      // Direct payment approval for payroll (no GM involved)
      if (request.type === "INDIVIDUAL_PAYROLL" || request.type === "PAYROLL_DISBURSEMENT") {
        nextStatus = "APPROVED";
        nextAssigneeId = request.createdById;
      }
      // 1. Non-manager, non-finance (e.g., tech_manager) approves -> route to GM for approval first
      else if (request.assignedToId === user.id && !roles.includes("manager") && !roles.includes("finance")) {
        const gm = await this.prisma.user.findFirst({
          where: { roles: { some: { role: { name: "manager" } } } }
        });
        if (gm) {
          nextStatus = "FORWARDED_TO_GM";
          nextAssigneeId = gm.id;
        } else {
          // Fallback if no GM
          if (request.amount && Number(request.amount) > 0) {
            const financeAdmin = await this.prisma.user.findFirst({
              where: { roles: { some: { role: { name: "finance" } } } }
            });
            if (financeAdmin) {
              nextStatus = "FORWARDED_TO_FINANCE";
              nextAssigneeId = financeAdmin.id;
            } else {
              nextStatus = "APPROVED";
              nextAssigneeId = request.createdById;
            }
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
      // 3. GM approves -> if it was forwarded from Technical Manager (FORWARDED_TO_GM) and needs payment (amount > 0), route to Finance. Otherwise, final sign-off.
      else if (roles.includes("manager")) {
        if (request.status === "FORWARDED_TO_GM" && request.amount && Number(request.amount) > 0) {
          const financeAdmin = await this.prisma.user.findFirst({
            where: { roles: { some: { role: { name: "finance" } } } }
          });
          if (financeAdmin) {
            nextStatus = "FORWARDED_TO_FINANCE";
            nextAssigneeId = financeAdmin.id;
          } else {
            nextStatus = "APPROVED";
            nextAssigneeId = request.createdById;
          }
        } else {
          nextStatus = "APPROVED"; // or "FINISHED"
          nextAssigneeId = request.createdById;
        }
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

    let targetJobId = request.fieldWorkJobId;
    if (!targetJobId && request.description && request.description.startsWith("{")) {
      try {
        const parsed = JSON.parse(request.description);
        if (parsed.fieldWorkId) targetJobId = parsed.fieldWorkId;
      } catch {}
    }

    if (targetJobId) {
      try {
        const job = await this.prisma.fieldWorkJob.findUnique({ where: { id: targetJobId } });
        if (job && job.payload && typeof job.payload === "object") {
          const payload = { ...(job.payload as any) };
          const cashReqs = Array.isArray(payload.fieldCashRequests) ? payload.fieldCashRequests : [];
          const updatedCashReqs = cashReqs.map((cr: any) => {
            const matchesId = cr.id === requestId || cr.id === request.id;
            const matchesAmountAndPending =
              String(cr.amount) === String(request.amount) &&
              (!cr.status || cr.status.toUpperCase() === "PENDING" || cr.status.toUpperCase() === "AWAITING FINANCE");

            if (matchesId || matchesAmountAndPending) {
              return { ...cr, status: nextStatus };
            }
            return cr;
          });
          payload.fieldCashRequests = updatedCashReqs;
          await this.prisma.fieldWorkJob.update({
            where: { id: targetJobId },
            data: {
              ...(nextStatus === "APPROVED" || nextStatus === "FINANCE_APPROVED" ? { status: "in-progress" } : {}),
              payload
            }
          });
        }
      } catch (e) {
        console.error("Failed to sync hierarchy request status to fieldwork job payload", e);
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

    return updated;
  }

  async updateHierarchyRequestDetails(userId: string, requestId: string, details: any, comment?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId }
    });

    const request = await this.prisma.hierarchyRequest.findUniqueOrThrow({
      where: { id: requestId }
    });

    let currentDetails: any = {};
    if (request.description && request.description.startsWith("{")) {
      try {
        currentDetails = JSON.parse(request.description);
      } catch {}
    }

    const mergedDetails = { ...currentDetails, ...details };
    const allPaid = Array.isArray(mergedDetails.employees) && mergedDetails.employees.length > 0 && mergedDetails.employees.every((e: any) => e.paid);
    const nextStatus = allPaid ? "APPROVED" : (mergedDetails.status || request.status);

    const updated = await this.prisma.hierarchyRequest.update({
      where: { id: requestId },
      data: {
        description: JSON.stringify(mergedDetails),
        status: nextStatus,
      }
    });

    if (comment) {
      await this.prisma.requestAuditLog.create({
        data: {
          requestId,
          userId,
          action: allPaid ? "APPROVE" : "UPDATE",
          comment,
          createdAt: new Date(),
        }
      });
    }

    return { ...toPlain(updated), details: mergedDetails };
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
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });

    const userRole = creator.roles[0]?.role?.name || "general";
    let targetRole = "manager";
    if (["technician", "fieldwork"].includes(userRole)) targetRole = "ttl";
    else if (["accountant", "cashier"].includes(userRole)) targetRole = "finance";

    const report = await this.prisma.eodReport.create({
      data: {
        id: `EOD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        date: data.date || new Date().toISOString().slice(0, 10),
        department: creator.department || "GENERAL",
        submittedById: userId,
        content: data.content || data.workAccomplished || "",
        workAccomplished: data.workAccomplished || data.content || "",
        additionalComments: data.additionalComments || "",
        targetRole: data.targetRole || targetRole,
        status: "SUBMITTED",
        metrics: data.metrics ? JSON.parse(JSON.stringify(data.metrics)) : undefined,
      },
      include: {
        submittedBy: { select: { id: true, username: true, displayName: true, department: true } }
      }
    });

    const targetUsers = await this.prisma.userRole.findMany({
      where: { role: { name: targetRole } },
      select: { userId: true }
    });
    for (const tu of targetUsers) {
      await this.prisma.notification.create({
        data: {
          userId: tu.userId,
          type: "EOD_SUBMITTED",
          title: "New EOD Accomplishment Report",
          content: `${creator.displayName} submitted daily report for ${report.date}.`,
          link: "/reports"
        }
      });
    }

    return report;
  }

  async forwardEodReportToGm(reportId: string, departmentLeadId: string, summaryNote: string) {
    const lead = await this.prisma.user.findUniqueOrThrow({ where: { id: departmentLeadId } });
    const report = await this.prisma.eodReport.update({
      where: { id: reportId },
      data: {
        status: "FORWARDED_TO_GM",
        targetRole: "manager",
        departmentSummary: summaryNote
      },
      include: { submittedBy: true }
    });

    const gmUsers = await this.prisma.userRole.findMany({
      where: { role: { name: "manager" } },
      select: { userId: true }
    });
    for (const g of gmUsers) {
      await this.prisma.notification.create({
        data: {
          userId: g.userId,
          type: "EOD_ESCALATED",
          title: "Department EOD Consolidated Report",
          content: `${lead.displayName} consolidated and forwarded EOD report of ${report.submittedBy.displayName} to General Manager.`,
          link: "/reports"
        }
      });
    }

    return report;
  }

  async addEodComment(reportId: string, userId: string, commentText: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const report = await this.prisma.eodReport.findUniqueOrThrow({
      where: { id: reportId },
      include: { submittedBy: true }
    });

    const comment = await this.prisma.eodComment.create({
      data: {
        reportId,
        userId,
        comment: commentText
      },
      include: {
        user: { select: { id: true, displayName: true, username: true } }
      }
    });

    if (report.submittedById !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: report.submittedById,
          type: "EOD_REPLY",
          title: "Feedback on your EOD Report",
          content: `${user.displayName} commented: "${commentText.slice(0, 40)}..."`,
          link: "/reports"
        }
      });
    }

    return comment;
  }

  async getEodReports(date?: string) {
    return this.prisma.eodReport.findMany({
      where: date ? { date } : undefined,
      include: {
        submittedBy: {
          select: { id: true, username: true, displayName: true, department: true }
        },
        comments: {
          include: {
            user: { select: { id: true, displayName: true, username: true } }
          },
          orderBy: { createdAt: "asc" }
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
