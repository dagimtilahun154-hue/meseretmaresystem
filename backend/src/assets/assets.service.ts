import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssets() {
    const assets = await this.prisma.companyAsset.findMany({
      orderBy: { name: 'asc' },
    });
    if (assets.length === 0) {
      const initialTools = [
        { serialNumber: 'TL-LDR-001', name: '6m Extension Ladder', category: 'Tool', condition: 'GOOD' },
        { serialNumber: 'TL-DRL-002', name: 'DeWalt Hammer Drill', category: 'Tool', condition: 'GOOD' },
        { serialNumber: 'TL-MTR-003', name: 'Fluke 117 Multimeter', category: 'Tester', condition: 'GOOD' },
        { serialNumber: 'TL-CRM-004', name: 'Cable Crimping Tool', category: 'Tool', condition: 'GOOD' },
        { serialNumber: 'TL-SCR-005', name: 'Magnetic Screwdriver Set', category: 'Tool', condition: 'GOOD' },
      ];
      for (const tool of initialTools) {
        await this.prisma.companyAsset.create({
          data: {
            serialNumber: tool.serialNumber,
            name: tool.name,
            category: tool.category,
            condition: tool.condition,
            status: 'WAREHOUSE',
          }
        });
      }
      return this.prisma.companyAsset.findMany({
        orderBy: { name: 'asc' },
      });
    }
    return assets;
  }

  async getAssetDetail(id: string) {
    const asset = await this.prisma.companyAsset.findUnique({
      where: { id },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return asset;
  }

  async createAsset(payload: {
    serialNumber: string;
    name: string;
    category?: string;
    condition?: string;
  }) {
    // Check unique serial number
    const existing = await this.prisma.companyAsset.findUnique({
      where: { serialNumber: payload.serialNumber },
    });
    if (existing) {
      throw new BadRequestException(`Asset with serial number ${payload.serialNumber} already exists.`);
    }

    return this.prisma.companyAsset.create({
      data: {
        serialNumber: payload.serialNumber,
        name: payload.name,
        category: payload.category || 'Tool',
        condition: payload.condition || 'GOOD',
        status: 'WAREHOUSE',
      },
    });
  }

  async checkoutAssets(fieldWorkJobId: string, assetIds: string[]) {
    const job = await this.prisma.fieldWorkJob.findUnique({
      where: { id: fieldWorkJobId },
    });
    if (!job) {
      throw new NotFoundException(`Field work job with ID ${fieldWorkJobId} not found.`);
    }

    const allWarehouseAssets = await this.prisma.companyAsset.findMany({
      where: { status: 'WAREHOUSE' }
    });

    const checkouts = [];
    const targetAssetIds: string[] = [];

    if (!assetIds || assetIds.length === 0) {
      allWarehouseAssets.slice(0, 3).forEach(a => targetAssetIds.push(a.id));
    } else {
      for (const idOrName of assetIds) {
        const match = allWarehouseAssets.find(a => a.id === idOrName || a.name.toLowerCase().includes(idOrName.toLowerCase()));
        if (match && !targetAssetIds.includes(match.id)) {
          targetAssetIds.push(match.id);
        } else {
          const fallback = allWarehouseAssets.find(a => !targetAssetIds.includes(a.id));
          if (fallback) targetAssetIds.push(fallback.id);
        }
      }
    }

    for (const assetId of targetAssetIds) {
      const checkout = await this.prisma.fieldWorkAsset.create({
        data: {
          fieldWorkJobId,
          companyAssetId: assetId,
          status: 'CHECKED_OUT',
          checkedOutAt: new Date(),
        },
      });

      await this.prisma.companyAsset.update({
        where: { id: assetId },
        data: { status: 'IN_FIELD' },
      });

      checkouts.push(checkout);
    }

    return checkouts;
  }

  async returnAssets(fieldWorkJobId: string, returns: { companyAssetId: string; condition?: string; notes?: string }[]) {
    const results = [];
    for (const ret of returns) {
      const checkoutRecord = await this.prisma.fieldWorkAsset.findFirst({
        where: {
          fieldWorkJobId,
          companyAssetId: ret.companyAssetId,
          status: 'CHECKED_OUT',
        },
      });

      if (!checkoutRecord) {
        throw new BadRequestException(`No active checkout record found for asset ${ret.companyAssetId} on job ${fieldWorkJobId}`);
      }

      // Update checkout log
      const updatedCheckout = await this.prisma.fieldWorkAsset.update({
        where: { id: checkoutRecord.id },
        data: {
          status: 'RETURNED',
          returnedAt: new Date(),
          notes: ret.notes,
        },
      });

      // Update asset status and condition
      await this.prisma.companyAsset.update({
        where: { id: ret.companyAssetId },
        data: {
          status: 'WAREHOUSE',
          condition: ret.condition || 'GOOD',
        },
      });

      results.push(updatedCheckout);
    }

    return results;
  }

  async getCheckoutsByJob(fieldWorkJobId: string) {
    return this.prisma.fieldWorkAsset.findMany({
      where: { fieldWorkJobId },
      include: {
        asset: true,
      },
    });
  }

  async assignJob(id: string, assignedTo: string, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        assignedTo,
        status: 'planning',
      },
    });

    const user = await this.prisma.user.findFirst({
      where: { username: assignedTo }
    });
    if (user) {
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'TASK_ASSIGNED',
          title: 'Fieldwork Job Assigned',
          content: `You have been assigned to fieldwork job "${job.title}".`,
          link: '/fieldwork',
        }
      });
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Fieldwork job assigned to Technical Team Leader ${assignedTo} by ${displayName || 'Technical Manager'}. Status set to planning.`,
      userId
    );

    return updated;
  }

  async acceptJob(id: string, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'accepted',
      },
    });

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Fieldwork job accepted by assigned Technical Team Leader ${job.assignedTo}. Status set to accepted.`,
      userId
    );

    return updated;
  }

  async submitPlan(id: string, payload: { workers: any[], notes: string, companyTools: string[], fuelAmount?: number, fuelPrice?: number, startDate?: string, endDate?: string, scheduledDate?: string, completedDate?: string }, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    // Calculate costs & dates
    const startDateStr = payload.startDate || payload.scheduledDate;
    const endDateStr = payload.endDate || payload.completedDate;

    const start = startDateStr ? new Date(startDateStr) : (job.scheduledDate ? new Date(job.scheduledDate) : new Date());
    const end = endDateStr ? new Date(endDateStr) : (job.completedDate ? new Date(job.completedDate) : start);

    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / msPerDay) + 1);
    const perDiemTotal = payload.workers.reduce((sum, w) => sum + (Number(w.perDiem) || 0) * days, 0);
    const fuelCost = (Number(payload.fuelAmount) || 0) * (Number(payload.fuelPrice) || 0);
    const totalCost = perDiemTotal + fuelCost;

    // Checkout assets
    if (payload.companyTools && payload.companyTools.length > 0) {
      try {
        await this.checkoutAssets(id, payload.companyTools);
      } catch (e: any) {
        throw new BadRequestException(e.message || "Failed to checkout some company assets");
      }
    }

    // Map existing payload with new plan properties
    const existingPayload = job.payload && typeof job.payload === 'object' ? (job.payload as any) : {};
    const updatedPayload = {
      ...existingPayload,
      workers: payload.workers,
      companyTools: payload.companyTools,
      fuelAmount: payload.fuelAmount,
      fuelPrice: payload.fuelPrice,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      tripDays: days,
    };

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'submitted_tm',
        cost: totalCost,
        scheduledDate: start,
        completedDate: end,
        notes: payload.notes || job.notes,
        payload: updatedPayload,
      },
    });

    const managers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['fieldwork', 'manager'] }
            }
          }
        }
      }
    });
    for (const manager of managers) {
      await this.prisma.notification.create({
        data: {
          userId: manager.id,
          type: 'TASK_ASSIGNED',
          title: 'Fieldwork Plan Submitted',
          content: `TTL has submitted fieldwork planning budget for job "${job.title}".`,
          link: '/fieldwork',
        }
      });
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Fieldwork installation plan (crew, tools, per-diem budget of ETB ${totalCost.toLocaleString()}) submitted by TTL ${job.assignedTo || displayName || 'Team Leader'}. Status set to submitted_tm.`,
      userId
    );

    return updated;
  }

  async tmCheck(id: string, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'checked_tm',
      },
    });

    const gms = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'manager'
            }
          }
        }
      }
    });
    for (const gm of gms) {
      await this.prisma.notification.create({
        data: {
          userId: gm.id,
          type: 'TASK_ASSIGNED',
          title: 'Fieldwork Plan Checked by TM',
          content: `Technical Manager has checked and forwarded fieldwork plan for "${job.title}".`,
          link: '/fieldwork',
        }
      });
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Fieldwork plan checked by Technical Manager ${displayName || 'TM'}. Forwarded for GM review. Status set to checked_tm.`,
      userId
    );

    return updated;
  }

  async gmApprove(id: string, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'approved_gm',
      },
    });

    const financeAdmins = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'finance'
            }
          }
        }
      }
    });
    for (const fa of financeAdmins) {
      await this.prisma.notification.create({
        data: {
          userId: fa.id,
          type: 'TASK_ASSIGNED',
          title: 'Fieldwork Plan Approved by GM',
          content: `General Manager has approved and forwarded fieldwork plan for "${job.title}" for budget release.`,
          link: '/fieldwork',
        }
      });
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Fieldwork plan approved by General Manager ${displayName || 'GM'}. Forwarded to Finance for budget release. Status set to approved_gm.`,
      userId
    );

    return updated;
  }

  async financeApprove(id: string, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'Approved and ready to go',
      },
    });

    // Automatically record per diem / budget payment voucher
    const payload = job.payload && typeof job.payload === 'object' ? (job.payload as any) : {};
    const amount = Number(job.cost) || 0;
    if (amount > 0) {
      await this.prisma.payment.upsert({
        where: { id: `PAY-FW-${id}` },
        update: {
          reference: id,
          entityId: id,
          entityName: `Field Work - ${job.location || job.title || id}`,
          invoiceOrBillId: id,
          amount,
          method: 'Cash',
          bankName: null,
          note: `Per-diem for ${(payload.workers || []).length} worker(s)`,
          date: new Date(),
          type: 'made',
        },
        create: {
          id: `PAY-FW-${id}`,
          reference: id,
          entityId: id,
          entityName: `Field Work - ${job.location || job.title || id}`,
          invoiceOrBillId: id,
          amount,
          method: 'Cash',
          bankName: null,
          note: `Per-diem for ${(payload.workers || []).length} worker(s)`,
          date: new Date(),
          type: 'made',
        },
      });
    }

    if (job.assignedTo) {
      const ttlUser = await this.prisma.user.findFirst({
        where: { username: job.assignedTo }
      });
      if (ttlUser) {
        await this.prisma.notification.create({
          data: {
            userId: ttlUser.id,
            type: 'TASK_ASSIGNED',
            title: 'Fieldwork Budget Approved',
            content: `Budget approved for fieldwork job "${job.title}". Status updated to "Approved and ready to go".`,
            link: '/fieldwork',
          }
        });
      }
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Finance Admin ${displayName || 'Finance'} released per-diem budget of ETB ${amount.toLocaleString()} and checked out tools. Field crew authorized for dispatch. Status set to "Approved and ready to go".`,
      userId
    );

    return updated;
  }

  async submitDailyReport(id: string, payload: {
    content?: string;
    submittedBy: string;
    achievements?: string;
    challenges?: string;
    nextDayPlan?: string;
    photos?: string[];
    imageUrl?: string;
  }) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    let reports: any[] = [];
    if (job.dailyReports && typeof job.dailyReports === 'object') {
      reports = Array.isArray(job.dailyReports) ? (job.dailyReports as any[]) : [];
    }

    const achievementsText = payload.achievements || payload.content || "Daily progress report submitted";
    const challengesText = payload.challenges || "";
    const nextDayPlanText = payload.nextDayPlan || "";
    const photosList = payload.photos || (payload.imageUrl ? [payload.imageUrl] : []);
    const author = payload.submittedBy || "Field Team Leader";

    const newReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date(),
      content: achievementsText,
      achievements: achievementsText,
      challenges: challengesText,
      nextDayPlan: nextDayPlanText,
      photos: photosList,
      imageUrl: photosList[0] || payload.imageUrl || null,
      submittedBy: author,
      forwardedToGm: true,
      forwardedAt: new Date(),
    };

    reports.push(newReport);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        dailyReports: reports,
      },
    });

    // Notify GM / Managers
    const managers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'manager'
            }
          }
        }
      }
    });

    for (const manager of managers) {
      await this.prisma.notification.create({
        data: {
          userId: manager.id,
          type: 'FIELDWORK_EOD',
          title: `Field Work EOD Report: ${job.customerName || job.title}`,
          content: `TTL ${author} submitted EOD report: "${achievementsText.substring(0, 45)}..."`,
          link: '/fieldwork',
        }
      });
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Field EOD Progress Report filed by TTL ${author}: ${achievementsText.substring(0, 80)}`,
      undefined
    );

    return updated;
  }

  async dispatchCrew(id: string, displayName?: string, userId?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    if (job.status !== "Approved and ready to go") {
      throw new BadRequestException(`Cannot dispatch crew when job status is "${job.status}"`);
    }

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'crew_dispatched',
      },
    });

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Technical Team Leader ${displayName || job.assignedTo || 'TTL'} confirmed crew departure. Status updated to "Crew Dispatched & Active".`,
      userId
    );

    return updated;
  }

  async forwardDailyReportToGm(id: string, reportId: string, managerName: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    let reports: any[] = [];
    if (job.dailyReports && typeof job.dailyReports === 'object') {
      reports = Array.isArray(job.dailyReports) ? (job.dailyReports as any[]) : [];
    }

    const reportIndex = reports.findIndex((r) => r.id === reportId);
    if (reportIndex === -1) throw new NotFoundException(`Report ${reportId} not found`);

    reports[reportIndex].forwardedToGm = true;
    reports[reportIndex].forwardedAt = new Date();

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        dailyReports: reports,
      },
    });

    // Notify GMs (managers/admins)
    const gms = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['admin', 'manager'] }
            }
          }
        }
      }
    });

    for (const gm of gms) {
      await this.prisma.notification.create({
        data: {
          userId: gm.id,
          type: 'TASK_ASSIGNED',
          title: `Daily Report Forwarded - ${job.title}`,
          content: `TM ${managerName} forwarded a daily report: "${reports[reportIndex].content.substring(0, 40)}..."`,
          link: '/fieldwork',
        }
      });
    }

    return updated;
  }

  async completeJob(id: string, payload?: { completionPhotos?: string[]; returnedTools?: string[]; leftoverFuel?: number; notes?: string }) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const existingPayload = job.payload && typeof job.payload === 'object' ? (job.payload as any) : {};
    const updatedPayload = {
      ...existingPayload,
      ...(payload?.completionPhotos ? { completionPhotos: payload.completionPhotos } : {}),
      ...(payload?.returnedTools ? { returnedTools: payload.returnedTools } : {}),
      ...(payload?.leftoverFuel !== undefined ? { leftoverFuel: payload.leftoverFuel } : {}),
      ...(payload?.notes ? { completionNotes: payload.notes } : {}),
    };

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'completed_ttl',
        payload: updatedPayload,
      },
    });

    // Notify Storekeeper & TM
    const storekeepers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'storekeeper'
            }
          }
        }
      }
    });

    for (const sk of storekeepers) {
      await this.prisma.notification.create({
        data: {
          userId: sk.id,
          type: 'TASK_ASSIGNED',
          title: `Fieldwork Completed - Assets Check Required`,
          content: `TTL has completed job "${job.title}". Please inspect returned tools & fuel.`,
          link: '/fieldwork',
        }
      });
    }

    return updated;
  }

  async storekeeperVerifyReturns(id: string, userId?: string, displayName?: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'verified_storekeeper',
      },
    });

    // Notify Technical Managers
    const managers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'manager'
            }
          }
        }
      }
    });

    for (const mgr of managers) {
      await this.prisma.notification.create({
        data: {
          userId: mgr.id,
          type: 'TASK_ASSIGNED',
          title: `Storekeeper Return Verified - ${job.title}`,
          content: `Storekeeper ${displayName || ''} verified returned tools & fuel. Ready for TM final sign-off.`,
          link: '/fieldwork',
        }
      });
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Storekeeper ${displayName || 'Storekeeper'} verified returned warehouse tools & fuel. Status set to verified_storekeeper.`,
      userId
    );

    return updated;
  }

  async approveReturns(id: string, userId: string, displayName: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'done',
        returnsApproved: true,
        completedDate: new Date(),
      },
    });

    // If there is an associated sizing request, mark the sale as fully completed
    const payload = job.payload && typeof job.payload === 'object' ? (job.payload as any) : {};
    if (payload.sizingRequestId) {
      await this.prisma.sizingRequest.update({
        where: { id: payload.sizingRequestId },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    // Notify TTL
    if (job.assignedTo) {
      const ttlUser = await this.prisma.user.findFirst({
        where: { username: job.assignedTo }
      });
      if (ttlUser) {
        await this.prisma.notification.create({
          data: {
            userId: ttlUser.id,
            type: 'TASK_ASSIGNED',
            title: 'Fieldwork Returns & Photos Approved',
            content: `Technical Manager ${displayName} approved site completion photos & returns for "${job.title}". Job is officially completed!`,
            link: '/fieldwork',
          }
        });
      }
    }

    await this.logCustomerMilestone(
      job.customerName || 'Customer',
      `Technical Manager ${displayName} signed off completion photos & site report. Job finalized (done).`,
      userId
    );

    return updated;
  }

  async logCustomerMilestone(
    clientName: string,
    noteText: string,
    userId?: string
  ) {
    if (!clientName?.trim()) return;

    const normalizedName = clientName.trim();
    let customer = await this.prisma.customer.findFirst({
      where: {
        name: { equals: normalizedName }
      }
    });

    if (!customer) {
      const custId = `CUST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      customer = await this.prisma.customer.create({
        data: {
          id: custId,
          name: normalizedName,
          creditLimit: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
        }
      });
    }

    // Determine user role and department for logging notes
    let userRole = 'system';
    let department = null;
    let finalUserId = userId || '';

    if (!finalUserId) {
      const firstUser = await this.prisma.user.findFirst();
      finalUserId = firstUser?.id || '';
    }

    if (finalUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: finalUserId },
        include: { roles: { include: { role: true } } }
      });
      if (user) {
        const roles = user.roles?.map(r => r.role?.name) || [];
        userRole = roles[0] || 'system';
        department = user.department || null;
      }
    }

    await this.prisma.customerNote.create({
      data: {
        customerId: customer.id,
        userId: finalUserId,
        userRole,
        department,
        note: noteText,
      }
    });
  }
}
