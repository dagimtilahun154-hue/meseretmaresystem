import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SizingService {
  constructor(private readonly prisma: PrismaService) {}

  async listRequests(status?: string) {
    return this.prisma.sizingRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequestDetail(id: string) {
    const request = await this.prisma.sizingRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException(`Sizing request with ID ${id} not found`);
    }
    return request;
  }

  async createDraft(userId: string, displayName: string, payload: {
    clientName: string;
    address?: string;
    latitude: number;
    longitude: number;
    waterSource?: string;
    dailyWaterNeed: number;
    pipeLength?: number;
    verticalLift?: number;
    selectedPumpModel?: string;
    dataCollection?: any;
  }) {
    return this.prisma.sizingRequest.create({
      data: {
        clientName: payload.clientName,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        waterSource: payload.waterSource,
        dailyWaterNeed: new Prisma.Decimal(payload.dailyWaterNeed),
        pipeLength: payload.pipeLength ? new Prisma.Decimal(payload.pipeLength) : null,
        verticalLift: payload.verticalLift ? new Prisma.Decimal(payload.verticalLift) : null,
        selectedPumpModel: payload.selectedPumpModel,
        status: 'DRAFT',
        preparedById: userId,
        preparedByName: displayName,
        dataCollection: payload.dataCollection || null,
      },
    });
  }

  async updateDraft(id: string, payload: {
    clientName?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    waterSource?: string;
    dailyWaterNeed?: number;
    pipeLength?: number;
    verticalLift?: number;
    selectedPumpModel?: string;
    dataCollection?: any;
  }) {
    const request = await this.getRequestDetail(id);
    if (request.status !== 'DRAFT' && request.status !== 'REJECTED_TM') {
      throw new BadRequestException('Only DRAFT or REJECTED proposals can be edited.');
    }

    const data: any = { ...payload };
    if (payload.dailyWaterNeed !== undefined) data.dailyWaterNeed = new Prisma.Decimal(payload.dailyWaterNeed);
    if (payload.pipeLength !== undefined) data.pipeLength = payload.pipeLength ? new Prisma.Decimal(payload.pipeLength) : null;
    if (payload.verticalLift !== undefined) data.verticalLift = payload.verticalLift ? new Prisma.Decimal(payload.verticalLift) : null;

    return this.prisma.sizingRequest.update({
      where: { id },
      data,
    });
  }

  async submitToTm(id: string) {
    const request = await this.getRequestDetail(id);
    if (request.status !== 'DRAFT' && request.status !== 'REJECTED_TM') {
      throw new BadRequestException('Can only submit draft or rejected sizing requests.');
    }

    // Auto-create customer and log the milestone!
    const dataColl = request.dataCollection && typeof request.dataCollection === 'object' ? (request.dataCollection as any) : {};
    const clientPhone = dataColl.generalSite?.phone || dataColl.generalSite?.phoneNumber || dataColl.phone || dataColl.phoneNumber || null;
    const clientEmail = dataColl.generalSite?.email || dataColl.email || null;
    
    await this.logCustomerMilestone(
      request.clientName,
      clientPhone,
      clientEmail,
      request.address,
      `Sizing Proposal and Assessment Sheet submitted for Technical Manager check. Sized pump: ${request.selectedPumpModel}. Status set to PENDING_TM.`,
      request.preparedById
    );

    return this.prisma.sizingRequest.update({
      where: { id },
      data: { status: 'PENDING_TM' },
    });
  }

  async tmReject(id: string, userId: string, displayName: string, payload: { suggestedPumpModel: string, comment: string }) {
    const request = await this.getRequestDetail(id);
    if (request.status !== 'PENDING_TM') {
      throw new BadRequestException('Only requests pending TM check can be rejected.');
    }

    if (request.hierarchyRequestId) {
      await this.prisma.requestAuditLog.create({
        data: {
          requestId: request.hierarchyRequestId,
          userId,
          action: 'REJECT',
          comment: `Technical Manager ${displayName} rejected sizing. Suggested pump: ${payload.suggestedPumpModel}. Comments: ${payload.comment}`,
        }
      });
    }

    return this.prisma.sizingRequest.update({
      where: { id },
      data: {
        status: 'REJECTED_TM',
        selectedPumpModel: payload.suggestedPumpModel,
      },
    });
  }

  async checkSizing(id: string, userId: string, displayName: string) {
    const request = await this.getRequestDetail(id);
    if (request.status !== 'PENDING_TM' && request.status !== 'DRAFT') {
      throw new BadRequestException('Proposal must be in PENDING_TM or DRAFT status to be checked/approved.');
    }

    if (!request.selectedPumpModel) {
      throw new BadRequestException('Cannot approve assessment without selecting a pump model.');
    }

    // 1. Calculate Required Equipment List (Consumables)
    const equipmentList = await this.calculateEquipment(request);
    const totalPrice = equipmentList.reduce((sum, item) => sum + item.total, 0);

    // 2. Find default GM user to route payment request to
    const gmUser = await this.prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: {
              name: 'manager'
            }
          }
        }
      }
    }) || await this.prisma.user.findFirst();

    if (!gmUser) {
      throw new BadRequestException('No General Manager user found to route hierarchy request to.');
    }

    // 3. Create a Hierarchy Request for GM Review
    const hierarchyRequest = await this.prisma.hierarchyRequest.create({
      data: {
        title: `Sizing Payment Collection - ${request.clientName}`,
        description: `Automatic sizing request checked by Technical Manager ${displayName}. Awaiting GM review and structural sign-off for pump ${request.selectedPumpModel}.`,
        amount: new Prisma.Decimal(totalPrice),
        type: 'FIELD_TRIP',
        status: 'FORWARDED_TO_GM',
        createdById: request.preparedById,
        assignedToId: gmUser.id,
        sizingRequestId: request.id,
      }
    });

    // 4. Create Audit Log
    await this.prisma.requestAuditLog.create({
      data: {
        requestId: hierarchyRequest.id,
        userId: userId,
        action: 'APPROVE',
        comment: `Technical sizing approved by Technical Manager ${displayName}`,
      }
    });

    // 5. Create Inbox Notification for GM User
    try {
      const gmUsers = await this.prisma.user.findMany({
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
      for (const gm of gmUsers) {
        await this.prisma.notification.create({
          data: {
            userId: gm.id,
            title: `Sizing Proposal Awaiting GM Review`,
            content: `Sizing proposal for client "${request.clientName}" (${request.selectedPumpModel}) checked by TM ${displayName}. Total Package: ETB ${totalPrice.toLocaleString()}.`,
            type: 'HIERARCHY_REQUEST',
            link: '/fieldwork',
          }
        });
      }
    } catch (e) {
      console.error('Failed to create sizing notification for GM users', e);
    }

    // 5. Update Sizing Request status
    const updatedRequest = await this.prisma.sizingRequest.update({
      where: { id },
      data: {
        status: 'APPROVED_TM',
        checkedById: userId,
        checkedByName: displayName,
        checkedAt: new Date(),
        calculatedEquipment: equipmentList,
        totalPrice: new Prisma.Decimal(totalPrice),
        hierarchyRequestId: hierarchyRequest.id,
      },
    });

    // Milestone 1: Create customer profile and log sizing check milestone!
    const dataColl1 = request.dataCollection && typeof request.dataCollection === 'object' ? (request.dataCollection as any) : {};
    const clientPhone1 = dataColl1.clientPhone || dataColl1.phone || null;
    const clientEmail1 = dataColl1.clientEmail || dataColl1.email || null;

    await this.logCustomerMilestone(
      request.clientName,
      clientPhone1,
      clientEmail1,
      request.address,
      `Solar Pump Sizing Proposal checked & approved by Technical Manager ${displayName}. Calculated model: ${request.selectedPumpModel}. Price package: ETB ${totalPrice.toLocaleString()}. Status set to APPROVED_TM.`,
      userId
    );

    return updatedRequest;
  }

  async gmApprove(id: string, userId: string, displayName: string) {
    // Keep this method for compatibility but move status to APPROVED_TM if called
    const request = await this.getRequestDetail(id);
    return this.prisma.sizingRequest.update({
      where: { id },
      data: { status: 'APPROVED_TM' },
    });
  }

  async financePay(id: string, userId: string, displayName: string) {
    const request = await this.getRequestDetail(id);
    if (request.status !== 'APPROVED_TM') {
      throw new BadRequestException('Request must be approved by the Technical Manager before payment.');
    }

    if (!request.hierarchyRequestId) {
      throw new BadRequestException('No linked approval request found.');
    }

    // Update Sizing Request status
    const updated = await this.prisma.sizingRequest.update({
      where: { id },
      data: {
        status: 'PAID',
      },
    });

    // Milestone 2: Log payment milestone
    const dataColl2 = request.dataCollection && typeof request.dataCollection === 'object' ? (request.dataCollection as any) : {};
    const clientPhone2 = dataColl2.clientPhone || dataColl2.phone || null;
    const clientEmail2 = dataColl2.clientEmail || dataColl2.email || null;

    await this.logCustomerMilestone(
      request.clientName,
      clientPhone2,
      clientEmail2,
      request.address,
      `Payment confirmed by Finance Admin ${displayName} via Peachtree verification. Equipment package paid: ETB ${(Number(request.totalPrice) || 0).toLocaleString()}. Status set to PAID.`,
      userId
    );

    // Update Hierarchy request
    await this.prisma.hierarchyRequest.update({
      where: { id: request.hierarchyRequestId },
      data: {
        status: 'APPROVED',
      }
    });

    await this.prisma.requestAuditLog.create({
      data: {
        requestId: request.hierarchyRequestId,
        userId: userId,
        action: 'PAY',
        comment: `Payment logged by Finance Admin ${displayName}. Request marked as Paid.`,
      }
    });

    // Notify the Technical Managers to create fieldwork
    const managers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['manager', 'fieldwork'] }
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
          title: 'Sizing Request Paid - Create Fieldwork',
          content: `Client payment for "${request.clientName}" is registered. Technical Manager can now spawn the fieldwork.`,
          link: '/fieldwork/sizing',
        }
      });
    }

    return { sizing: updated };
  }

  async createFieldwork(id: string, userId: string, displayName: string, payload: { assignedTo: string }) {
    const request = await this.getRequestDetail(id);
    if (request.status !== 'PAID') {
      throw new BadRequestException('Can only create fieldwork for paid sizing requests.');
    }

    const jobId = `FW-${Date.now().toString().slice(-6)}`;
    const fieldJob = await this.prisma.fieldWorkJob.create({
      data: {
        id: jobId,
        title: `Field Installation - ${request.clientName}`,
        description: `Pump installation site work at ${request.address || 'Customer site'}. Calculated pump model: ${request.selectedPumpModel}. Location: Lat ${request.latitude}, Lng ${request.longitude}.`,
        customerName: request.clientName,
        location: request.address || `Lat: ${request.latitude}, Lng: ${request.longitude}`,
        status: 'planning',
        priority: 'medium',
        cost: request.totalPrice || new Prisma.Decimal(0),
        assignedTo: payload.assignedTo,
        payload: {
          sizingRequestId: request.id,
          equipment: request.calculatedEquipment,
          latitude: request.latitude,
          longitude: request.longitude,
          // Full customer details for downstream visibility
          clientName: request.clientName,
          address: request.address,
          waterSource: request.waterSource,
          dailyWaterNeed: request.dailyWaterNeed ? Number(request.dailyWaterNeed) : null,
          pipeLength: request.pipeLength ? Number(request.pipeLength) : null,
          verticalLift: request.verticalLift ? Number(request.verticalLift) : null,
          selectedPumpModel: request.selectedPumpModel,
          totalPrice: request.totalPrice ? Number(request.totalPrice) : null,
          preparedByName: request.preparedByName,
          checkedByName: request.checkedByName,
          dataCollection: request.dataCollection, // Full questionnaire data sheet
        }
      }
    });

    await this.prisma.sizingRequest.update({
      where: { id },
      data: {
        status: 'FIELDWORK_INITIATED',
      }
    });

    // Milestone 3: Log fieldwork initiated milestone
    const dataColl3 = request.dataCollection && typeof request.dataCollection === 'object' ? (request.dataCollection as any) : {};
    const clientPhone3 = dataColl3.clientPhone || dataColl3.phone || null;
    const clientEmail3 = dataColl3.clientEmail || dataColl3.email || null;

    await this.logCustomerMilestone(
      request.clientName,
      clientPhone3,
      clientEmail3,
      request.address,
      `Fieldwork installation job spawned by Technical Manager ${displayName}. Assigned to TTL: ${payload.assignedTo}. Status set to planning.`,
      userId
    );

    // Notify TTL to build field work proposal
    const ttlUser = await this.prisma.user.findFirst({
      where: { username: payload.assignedTo }
    });
    if (ttlUser) {
      await this.prisma.notification.create({
        data: {
          userId: ttlUser.id,
          type: 'TASK_ASSIGNED',
          title: 'Fieldwork Assignment - Build Proposal',
          content: `Technical Manager initiated fieldwork for "${request.clientName}". Please review data sheet, assign workers, calculate per diem & check out tools.`,
          link: '/fieldwork',
        }
      });
    }

    return { success: true, job: fieldJob };
  }

  // --- Helper Methods ---
  private async calculateEquipment(request: any): Promise<any[]> {
    const pumpModel = request.selectedPumpModel;
    const pipeLength = request.pipeLength ? Number(request.pipeLength) : 60;
    const verticalLift = request.verticalLift ? Number(request.verticalLift) : 45;

    // Search active products database for specific items, or fallback to standard templates
    const items = [];

    // 1. The Pump itself
    const dbPump = await this.prisma.product.findFirst({
      where: {
        OR: [
          { name: { contains: pumpModel } },
          { id: pumpModel }
        ]
      }
    });
    const pumpPrice = dbPump ? Number(dbPump.sellPrice) : 850;
    items.push({
      id: dbPump ? dbPump.id : 'PRD-PUMP-GENERIC',
      name: pumpModel,
      category: 'PUMP',
      qty: 1,
      price: pumpPrice,
      total: pumpPrice,
      isConsumable: true,
    });

    // 2. Solar Panels
    let panelName = 'Solar Panel 250W';
    let panelQty = verticalLift > 60 ? 6 : verticalLift > 30 ? 4 : 2;

    const pumpModelLower = (request.selectedPumpModel || '').toLowerCase();
    if (pumpModelLower.includes('5.5kw') || pumpModelLower.includes('5500w')) {
      panelName = 'Solar Panel 550W';
      panelQty = verticalLift > 60 ? 12 : verticalLift > 30 ? 8 : 6;
    } else if (pumpModelLower.includes('3.0kw') || pumpModelLower.includes('3000w')) {
      panelName = 'Solar Panel 450W';
      panelQty = verticalLift > 60 ? 8 : verticalLift > 30 ? 6 : 4;
    } else if (pumpModelLower.includes('1.5kw') || pumpModelLower.includes('1500w')) {
      panelName = 'Solar Panel 350W';
      panelQty = verticalLift > 60 ? 6 : verticalLift > 30 ? 4 : 3;
    }

    const dbPanels = await this.prisma.product.findFirst({
      where: {
        AND: [
          { name: { contains: panelName } },
          { productCategory: 'SOLAR_PANEL' }
        ]
      }
    });

    const panelPrice = dbPanels ? Number(dbPanels.sellPrice) : (panelName.includes('550W') ? 14000 : panelName.includes('450W') ? 11000 : panelName.includes('350W') ? 8500 : 6000);
    const panelId = dbPanels ? dbPanels.id : (panelName.includes('550W') ? 'PRD-PANEL-SF-550W' : panelName.includes('450W') ? 'PRD-PANEL-SF-450W' : panelName.includes('350W') ? 'PRD-PANEL-SF-350W' : 'PRD-PANEL-SF-250W');

    items.push({
      id: panelId,
      name: panelName,
      category: 'SOLAR_PANEL',
      qty: panelQty,
      price: panelPrice,
      total: panelPrice * panelQty,
      isConsumable: true,
    });

    // 3. Controller
    const dbController = await this.prisma.product.findFirst({
      where: { name: { contains: 'Controller' } }
    });
    const controllerPrice = dbController ? Number(dbController.sellPrice) : 220;
    items.push({
      id: dbController ? dbController.id : 'PRD-CTRL-GENERIC',
      name: `Pump Controller / Inverter`,
      category: 'PUMP_EQUIPMENT',
      qty: 1,
      price: controllerPrice,
      total: controllerPrice,
      isConsumable: true,
    });

    // 4. Pipes
    const dbPipes = await this.prisma.product.findFirst({
      where: { name: { contains: 'Pipe' } }
    });
    const pipePrice = dbPipes ? Number(dbPipes.sellPrice) : 8.5; // per meter
    const pipesQty = Math.ceil(pipeLength);
    items.push({
      id: dbPipes ? dbPipes.id : 'PRD-PIPE-GENERIC',
      name: `PE Piping (meters)`,
      category: 'WORK_TOOL',
      qty: pipesQty,
      price: pipePrice,
      total: Number((pipePrice * pipesQty).toFixed(2)),
      isConsumable: true,
    });

    // 5. Electric Cables / Wire
    const dbCables = await this.prisma.product.findFirst({
      where: { name: { contains: 'Cable' } }
    });
    const cablePrice = dbCables ? Number(dbCables.sellPrice) : 3.0; // per meter
    const cableQty = Math.ceil(pipeLength + 10);
    items.push({
      id: dbCables ? dbCables.id : 'PRD-CABLE-GENERIC',
      name: `Submersible Cable (meters)`,
      category: 'PUMP_EQUIPMENT',
      qty: cableQty,
      price: cablePrice,
      total: Number((cablePrice * cableQty).toFixed(2)),
      isConsumable: true,
    });

    // 6. Screws, Clips and Fittings
    items.push({
      id: 'SCREWS-FITTINGS-ID',
      name: `Installation Fittings & Screws Kit`,
      category: 'WORK_TOOL',
      qty: 1,
      price: 45.0,
      total: 45.0,
      isConsumable: true,
    });

    return items;
  }

  async logCustomerMilestone(
    clientName: string,
    phone: string | null,
    email: string | null,
    address: string | null,
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
          phone: phone || null,
          email: email || null,
          address: address || null,
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
