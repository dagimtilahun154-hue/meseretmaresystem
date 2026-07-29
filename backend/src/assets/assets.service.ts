import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    // Check if job exists
    const job = await this.prisma.fieldWorkJob.findUnique({
      where: { id: fieldWorkJobId },
    });
    if (!job) {
      throw new NotFoundException(`Field work job with ID ${fieldWorkJobId} not found.`);
    }

    const checkouts = [];
    for (const assetId of assetIds) {
      const asset = await this.getAssetDetail(assetId);
      if (asset.status !== 'WAREHOUSE') {
        throw new BadRequestException(`Asset ${asset.name} (${asset.serialNumber}) is not in warehouse (Current status: ${asset.status})`);
      }

      // Create checkout record
      const checkout = await this.prisma.fieldWorkAsset.create({
        data: {
          fieldWorkJobId,
          companyAssetId: assetId,
          status: 'CHECKED_OUT',
          checkedOutAt: new Date(),
        },
      });

      // Update asset status
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

  async assignJob(id: string, assignedTo: string) {
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

    return updated;
  }

  async acceptJob(id: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    return this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'accepted',
      },
    });
  }

  async submitPlan(id: string, payload: { workers: any[], notes: string, companyTools: string[], fuelAmount?: number, fuelPrice?: number }) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    // Calculate costs
    const start = job.scheduledDate ? new Date(job.scheduledDate) : new Date();
    const end = job.completedDate ? new Date(job.completedDate) : new Date();
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
    };

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'submitted_tm',
        cost: totalCost,
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

    return updated;
  }

  async tmCheck(id: string) {
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

    return updated;
  }

  async gmApprove(id: string) {
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

    return updated;
  }

  async financeApprove(id: string) {
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

    return updated;
  }

  async submitDailyReport(id: string, payload: { content: string; submittedBy: string }) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    let reports: any[] = [];
    if (job.dailyReports && typeof job.dailyReports === 'object') {
      reports = Array.isArray(job.dailyReports) ? (job.dailyReports as any[]) : [];
    }

    const newReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date(),
      content: payload.content,
      submittedBy: payload.submittedBy,
      forwardedToGm: false,
      forwardedAt: null,
    };

    reports.push(newReport);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        dailyReports: reports,
      },
    });

    // Notify TM
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
          type: 'TASK_ASSIGNED',
          title: `Daily Report Submitted - ${job.title}`,
          content: `TTL ${payload.submittedBy} submitted a daily report: "${payload.content.substring(0, 40)}..."`,
          link: '/fieldwork',
        }
      });
    }

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
              name: 'admin' // or GM role
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

  async completeJob(id: string) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Field work job ${id} not found`);

    const updated = await this.prisma.fieldWorkJob.update({
      where: { id },
      data: {
        status: 'completed_ttl',
      },
    });

    // Notify TM
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
          type: 'TASK_ASSIGNED',
          title: `Fieldwork Completed by TTL - ${job.title}`,
          content: `TTL has marked job "${job.title}" as completed. TM review and returns check-off required.`,
          link: '/fieldwork',
        }
      });
    }

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
            title: 'Fieldwork Returns Approved',
            content: `The Technical Manager ${displayName} has approved returns for job "${job.title}". Job is marked done.`,
            link: '/fieldwork',
          }
        });
      }
    }

    return updated;
  }
}
