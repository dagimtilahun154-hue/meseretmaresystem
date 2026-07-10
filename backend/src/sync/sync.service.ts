import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      const row = await this.prisma.syncMutation.upsert({
        where: { id: mutation.id },
        update: {
          status: mutation.status || "queued",
          retryCount: Number(mutation.retryCount || 0),
          errorMessage: mutation.errorMessage,
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
          status: mutation.status || "queued",
          retryCount: Number(mutation.retryCount || 0),
          errorMessage: mutation.errorMessage,
          createdBy: user?.username,
          clientCreatedAt: mutation.createdAt ? new Date(mutation.createdAt) : undefined,
        },
      });
      saved.push(row.id);
    }

    return { success: true, accepted: saved.length, ids: saved };
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

  async syncPeachtreeData(payload: any) {
    this.logger.log(`Received Peachtree structured sync payload with keys: ${Object.keys(payload).join(", ")}`);
    const results: Record<string, number> = {};

    if (Array.isArray(payload.customers)) {
      let count = 0;
      for (const customer of payload.customers) {
        if (!customer.id) continue;
        await this.prisma.customer.upsert({
          where: { id: customer.id },
          update: {
            name: customer.name || "Unknown",
            balance: Number(customer.balance || 0),
            address: customer.address,
            phone: customer.phone,
            email: customer.email,
            creditLimit: Number(customer.creditLimit || 0),
          },
          create: {
            id: customer.id,
            name: customer.name || "Unknown",
            balance: Number(customer.balance || 0),
            address: customer.address,
            phone: customer.phone,
            email: customer.email,
            creditLimit: Number(customer.creditLimit || 0),
          },
        });
        count += 1;
      }
      results.customers = count;
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
    const [customers, vendors, invoices, journalEntries] = await Promise.all([
      this.prisma.customer.findMany({ orderBy: { name: "asc" } }),
      this.prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      this.prisma.invoice.findMany({ orderBy: { date: "desc" }, take: 100 }),
      this.prisma.financeJournalEntry.findMany({ orderBy: { date: "desc" }, take: 100 }),
    ]);

    return { customers, vendors, invoices, journalEntries };
  }
}
