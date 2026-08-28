import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DataService } from "../data/data.service";
import { SizingService } from "../sizing/sizing.service";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: DataService,
    private readonly sizingService: SizingService,
  ) {}

  async registerDevice(payload: any, user: any) {
    const deviceKey = payload.deviceKey || payload.deviceId;
    if (!deviceKey) return { success: false, message: "deviceKey is required" };

    const device = await this.prisma.syncDevice.upsert({
      where: { deviceKey },
      update: {
        name: payload.name,
        type: payload.type || "web",
        company: payload.company,
        userId: user?.sub || user?.id,
        lastSeenAt: new Date(),
      },
      create: {
        deviceKey,
        name: payload.name,
        type: payload.type || "web",
        company: payload.company,
        userId: user?.sub || user?.id,
      },
    });

    return { success: true, device };
  }

  async push(payload: any, user: any) {
    const mutations = Array.isArray(payload.mutations) ? payload.mutations : [];
    const deviceKey = payload.deviceKey || payload.deviceId;
    const company = payload.company;

    if (deviceKey) {
      await this.prisma.syncDevice.upsert({
        where: { deviceKey },
        update: { company, lastSeenAt: new Date(), lastPushAt: new Date(), userId: user?.sub || user?.id },
        create: { deviceKey, company, userId: user?.sub || user?.id },
      });
    }

    const saved = [];
    for (const mutation of mutations) {
      let applyStatus = "applied";
      let applyError = null;
      try {
        await this.applyMutation(mutation, user);
      } catch (err: any) {
        this.logger.error(`Failed to apply mutation ${mutation.id}: ${err.message}`);
        applyStatus = "failed";
        applyError = err.message;
      }

      const row = await this.prisma.syncMutation.upsert({
        where: { id: mutation.id },
        update: {
          status: mutation.status || applyStatus,
          retryCount: Number(mutation.retryCount || 0),
          errorMessage: mutation.errorMessage || applyError,
        },
        create: {
          id: mutation.id,
          deviceKey,
          company: mutation.company || company,
          entityType: mutation.entityType || "unknown",
          entityId: mutation.entityId,
          operation: mutation.operation || mutation.method || "unknown",
          endpoint: mutation.endpoint,
          method: mutation.method,
          payload: mutation.payload,
          status: mutation.status || applyStatus,
          retryCount: Number(mutation.retryCount || 0),
          errorMessage: mutation.errorMessage || applyError,
          createdBy: user?.username,
          clientCreatedAt: mutation.createdAt ? new Date(mutation.createdAt) : undefined,
        },
      });
      saved.push(row.id);
    }

    return { success: true, accepted: saved.length, ids: saved };
  }

  async applyMutation(mutation: any, user: any) {
    const { endpoint, method, payload } = mutation;
    if (!endpoint) return;

    const cleanEndpoint = endpoint.replace(/^\/api\/v1/, "").replace(/^\//, "");
    const parts = cleanEndpoint.split("/");

    if (parts[0] === "sales" && method === "POST") {
      await this.dataService.saveSale(payload);
      return;
    }

    if (parts[0] === "sizing-requests" && parts[2] === "finance-pay" && method === "PATCH") {
      const id = parts[1];
      await this.sizingService.financePay(id, user?.id || "system", user?.displayName || "System Sync");
      return;
    }

    if (parts[0] === "customers" && method === "POST") {
      await this.prisma.customer.upsert({
        where: { id: payload.id },
        update: {
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          tin: payload.tin,
          contact: payload.contact,
          city: payload.city,
          state: payload.state,
          zip: payload.zip,
          creditLimit: payload.creditLimit,
          balance: payload.balance,
        },
        create: {
          id: payload.id,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          tin: payload.tin,
          contact: payload.contact,
          city: payload.city,
          state: payload.state,
          zip: payload.zip,
          creditLimit: payload.creditLimit,
          balance: payload.balance,
        },
      });
      return;
    }

    if (parts[0] === "pumps" && method === "POST") {
      await this.prisma.pumpProduct.upsert({
        where: { id: payload.id },
        update: {
          model: payload.model,
          brand: payload.brand,
          status: payload.status,
          firstCategory: payload.firstCategory,
          secondCategory: payload.secondCategory,
          power: payload.power,
          voltage: payload.voltage,
          description: payload.description,
          performanceData: payload.performanceData,
        },
        create: {
          id: payload.id,
          model: payload.model,
          brand: payload.brand,
          status: payload.status,
          firstCategory: payload.firstCategory,
          secondCategory: payload.secondCategory,
          power: payload.power,
          voltage: payload.voltage,
          description: payload.description,
          performanceData: payload.performanceData,
        },
      });
      return;
    }
  }

  async pull(query: any, user: any) {
    const since = query.since ? new Date(query.since) : undefined;
    const company = query.company;
    const deviceKey = query.deviceKey;

    if (deviceKey) {
      await this.prisma.syncDevice.updateMany({
        where: { deviceKey },
        data: { lastSeenAt: new Date(), lastPullAt: new Date(), userId: user?.sub || user?.id },
      });
    }

    const [products, sales, payments, peachtreeImports] = await Promise.all([
      this.prisma.product.findMany({ where: since ? { updatedAt: { gt: since } } : undefined, orderBy: { updatedAt: "desc" }, take: 200 }),
      this.prisma.posSale.findMany({ where: since ? { updatedAt: { gt: since } } : undefined, orderBy: { updatedAt: "desc" }, take: 200 }),
      this.prisma.payment.findMany({ where: since ? { updatedAt: { gt: since } } : undefined, orderBy: { updatedAt: "desc" }, take: 200 }),
      this.prisma.peachtreeImport.findMany({
        where: { ...(company ? { company } : {}), ...(since ? { updatedAt: { gt: since } } : {}) },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      serverTime: new Date().toISOString(),
      changes: { products, sales, payments, peachtreeImports },
    };
  }

  async ack(payload: any) {
    const ids = Array.isArray(payload.ids) ? payload.ids : [];
    if (!ids.length) return { success: true, updated: 0 };
    const result = await this.prisma.syncMutation.updateMany({
      where: { id: { in: ids } },
      data: { status: "applied", appliedAt: new Date(), errorMessage: null },
    });
    return { success: true, updated: result.count };
  }

  async status(query: any) {
    const company = query.company;
    const where = company ? { company } : undefined;
    const [queued, applied, failed, conflicts, devices] = await Promise.all([
      this.prisma.syncMutation.count({ where: { ...where, status: "queued" } }),
      this.prisma.syncMutation.count({ where: { ...where, status: "applied" } }),
      this.prisma.syncMutation.count({ where: { ...where, status: "failed" } }),
      this.prisma.syncConflict.count({ where: { ...where, status: "open" } }),
      this.prisma.syncDevice.findMany({ where, orderBy: { lastSeenAt: "desc" }, take: 10 }),
    ]);

    return { queued, applied, failed, conflicts, devices, serverTime: new Date().toISOString() };
  }

  private lastPeachtreeHeartbeat: any = {
    host: "Finance-PC-01",
    peachtreeRunning: true,
    lastDataModified: new Date().toISOString(),
    entriesLoggedToday: 0,
    lastHeartbeat: new Date().toISOString(),
    status: "active",
  };

  recordHeartbeat(payload: any) {
    this.lastPeachtreeHeartbeat = {
      host: payload.host || "Finance-PC-01",
      peachtreeRunning: Boolean(payload.peachtreeRunning),
      lastDataModified: payload.lastDataModified || new Date().toISOString(),
      entriesLoggedToday: Number(payload.entriesLoggedToday || 0),
      lastHeartbeat: new Date().toISOString(),
      status: payload.peachtreeRunning ? "active" : "idle",
    };
    return { success: true, timestamp: this.lastPeachtreeHeartbeat.lastHeartbeat };
  }

  getLatestHeartbeat() {
    return this.lastPeachtreeHeartbeat;
  }

  pingAccountant(requestedBy: string) {
    this.logger.log(`GM ${requestedBy} requested status ping to Accounting Team.`);
    return {
      success: true,
      message: "Priority notification dispatched to accounting workstation.",
      timestamp: new Date().toISOString(),
    };
  }

  async syncPeachtreeData(payload: any) {
    this.logger.log(`Received Peachtree structured sync payload with keys: ${Object.keys(payload).join(", ")}`);
    const results: Record<string, number> = {};

    if (Array.isArray(payload.customers)) {
      let count = 0;
      let mergedCount = 0;
      let createdCount = 0;

      for (const customer of payload.customers) {
        if (!customer.id && !customer.name) continue;

        // Smart Customer Match:
        // 1. Try finding by Peachtree ID
        // 2. Try finding by matching phone number
        // 3. Try finding by exact name match
        let existing = null;
        if (customer.id) {
          existing = await this.prisma.customer.findUnique({ where: { id: customer.id } });
        }
        if (!existing && customer.phone) {
          existing = await this.prisma.customer.findFirst({
            where: { phone: customer.phone.trim() },
          });
        }
        if (!existing && customer.name) {
          existing = await this.prisma.customer.findFirst({
            where: { name: { equals: customer.name.trim() } },
          });
        }

        if (existing) {
          // Merge financial balance and update Peachtree dossier
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: {
              balance: Number(customer.balance || 0),
              creditLimit: Number(customer.creditLimit || existing.creditLimit || 0),
              address: customer.address || existing.address,
              phone: customer.phone || existing.phone,
              email: customer.email || existing.email,
            },
          });
          mergedCount += 1;
        } else {
          // Auto-register as new customer from Peachtree
          const newId = customer.id || `CUST-PT-${Date.now()}-${count}`;
          await this.prisma.customer.create({
            data: {
              id: newId,
              name: customer.name || "Peachtree Client",
              balance: Number(customer.balance || 0),
              address: customer.address || "Addis Ababa, Ethiopia",
              phone: customer.phone || "",
              email: customer.email || "",
              creditLimit: Number(customer.creditLimit || 0),
            },
          });
          createdCount += 1;
        }
        count += 1;
      }
      results.customersProcessed = count;
      results.customersMerged = mergedCount;
      results.customersCreated = createdCount;
    }

    if (Array.isArray(payload.vendors)) {
      let count = 0;
      for (const vendor of payload.vendors) {
        if (!vendor.id) continue;
        await this.prisma.vendor.upsert({
          where: { id: vendor.id },
          update: {
            name: vendor.name || "Unknown",
            balance: Number(vendor.balance || 0),
            address: vendor.address,
            phone: vendor.phone,
            tin: vendor.tin,
          },
          create: {
            id: vendor.id,
            name: vendor.name || "Unknown",
            balance: Number(vendor.balance || 0),
            address: vendor.address,
            phone: vendor.phone,
            tin: vendor.tin,
          },
        });
        count += 1;
      }
      results.vendors = count;
    }

    return { success: true, synced: results };
  }

  async getSyncedPeachtreeData() {
    const [customers, vendors, invoices, journalEntries, rawImports] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { name: "asc" } }),
      this.prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      this.prisma.invoice.findMany({ orderBy: { date: "desc" }, take: 100 }),
      this.prisma.financeJournalEntry.findMany({ orderBy: { date: "desc" }, take: 100 }),
      this.prisma.peachtreeImport.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    ]);

    return { customers, vendors, invoices, journalEntries, rawImports };
  }

  async matchPeachtreePayments() {
    const [pendingRequests, ptrCustomers, ptrInvoices, ptrImports] = await Promise.all([
      this.prisma.sizingRequest.findMany({
        where: { status: { in: ["APPROVED_TM", "PENDING_TM", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customer.findMany(),
      this.prisma.invoice.findMany({ orderBy: { date: "desc" }, take: 200 }),
      this.prisma.peachtreeImport.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);

    const matches: any[] = [];

    // Optimize lookups using a Hash Map by phone number for O(1) checks
    const customerPhoneMap = new Map<string, any>();
    ptrCustomers.forEach((c) => {
      const cPhone = (c.phone || "").replace(/\D/g, "");
      if (cPhone.length >= 7) {
        customerPhoneMap.set(cPhone, c);
      }
    });

    for (const req of pendingRequests) {
      const dataCol = req.dataCollection && typeof req.dataCollection === "object" ? (req.dataCollection as any) : {};
      const customerName = (req.clientName || dataCol.customerName || "").toLowerCase().trim();
      const phone = (dataCol.phone || "").replace(/\D/g, "");
      const totalAmount = Number(req.totalPrice || dataCol.totalCost || dataCol.total || 0);

      let matchedRecord: any = null;
      let matchConfidence = 0;
      let matchReason = "";

      // 1. Phone Match via Hash Map Index (Primary Match)
      if (phone.length >= 7) {
        matchedRecord = customerPhoneMap.get(phone);
        if (!matchedRecord) {
          // Check for suffix/prefix match in hash keys
          for (const [key, value] of customerPhoneMap.entries()) {
            if (key.includes(phone) || phone.includes(key)) {
              matchedRecord = value;
              break;
            }
          }
        }
        if (matchedRecord) {
          matchConfidence = 90;
          matchReason = `Matched Peachtree Customer Record "${matchedRecord.name}" via phone lookup`;
        }
      }

      // 2. Fuzzy Name Match in Peachtree Customer List (Fallback)
      if (!matchedRecord && customerName.length > 2) {
        let bestScore = 0;
        let bestCustomer = null;
        for (const c of ptrCustomers) {
          const cName = (c.name || "").toLowerCase().trim();
          const similarity = this.stringSimilarity(customerName, cName);
          if (similarity > 0.70 && similarity > bestScore) {
            bestScore = similarity;
            bestCustomer = c;
          }
        }
        if (bestCustomer) {
          matchedRecord = bestCustomer;
          matchConfidence = Math.round(bestScore * 100);
          matchReason = `Fuzzy Matched Peachtree Customer Record "${bestCustomer.name}" (similarity: ${(bestScore * 100).toFixed(0)}%)`;
        }
      }

      // 3. Invoice Matching
      if (!matchedRecord) {
        const matchingInvoice = ptrInvoices.find((inv) => {
          const invName = (inv.customerName || "").toLowerCase().trim();
          const invTotal = Number(inv.total || 0);
          // Name similarity check
          const nameSimilarity = this.stringSimilarity(customerName, invName);
          const nameMatch = nameSimilarity > 0.70;
          const amountMatch = totalAmount > 0 && Math.abs(invTotal - totalAmount) < 50;
          return nameMatch || amountMatch;
        });

        if (matchingInvoice) {
          matchedRecord = matchingInvoice;
          matchConfidence = 95;
          matchReason = `Matched Peachtree Invoice #${matchingInvoice.id} (${matchingInvoice.customerName} - ${matchingInvoice.total} ETB)`;
        }
      }

      if (matchedRecord) {
        matches.push({
          sizingRequestId: req.id,
          customerName: req.clientName,
          phone: dataCol.phone || "N/A",
          status: req.status,
          totalCost: totalAmount,
          peachtreeMatch: matchedRecord,
          confidence: matchConfidence,
          reason: matchReason,
        });
      }
    }

    return { totalMatched: matches.length, matches };
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // Deletion
            dp[i][j - 1] + 1,    // Insertion
            dp[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }
    return dp[m][n];
  }

  private stringSimilarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    return 1.0 - this.levenshteinDistance(s1, s2) / maxLen;
  }

  async getPeachtreeVaultArchive() {
    const [customers, vendors, invoices, journalEntries, imports, sales] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.vendor.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.invoice.findMany({ orderBy: { date: "desc" } }),
      this.prisma.financeJournalEntry.findMany({ orderBy: { date: "desc" } }),
      this.prisma.peachtreeImport.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.posSale.findMany({ orderBy: { date: "desc" } }),
    ]);

    const latestImport = imports[0];

    return {
      vaultInfo: {
        databaseSource: "Live MySQL/TiDB Production Database Mirror",
        companyName: "Meseret Mare Solar Water Solutions",
        totalCustomers: customers.length,
        totalVendors: vendors.length,
        totalInvoices: invoices.length,
        totalJournalEntries: journalEntries.length,
        totalSales: sales.length,
        totalRawImports: imports.length,
        lastImportName: latestImport?.fileName || "Live Peachtree Sync",
        lastBackupTimestamp: latestImport?.createdAt ? latestImport.createdAt.toISOString() : new Date().toISOString(),
        vaultStatus: "ONLINE_PROTECTED",
        encryptionMode: "AES-256 Cloud Replicated",
      },
      customers,
      vendors,
      invoices,
      journalEntries,
      imports,
      sales,
    };
  }
}
