import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductCategory, TransactionType, StockCountStatus, MaterialSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private mapProduct(p: any) {
    if (!p) return null;
    const meta = p.metadata && typeof p.metadata === 'object' ? (p.metadata as Record<string, any>) : {};
    return {
      ...p,
      brand: meta.brand || p.brand || '',
      model: meta.model || p.model || '',
      lastStockedAt: meta.lastStockedAt || null,
      quantity: Number(p.quantity),
      minStockLevel: Number(p.minStockLevel),
      costPrice: Number(p.costPrice),
      sellPrice: Number(p.sellPrice),
    };
  }

  /**
   * Aggregated KPI Dashboard metrics
   */
  async getDashboardMetrics() {
    const products = await this.prisma.product.findMany();
    
    let totalStockValue = 0;
    let lowStockCount = 0;
    const categoryCounts: Record<string, { count: number; qty: number; value: number }> = {
      PUMP: { count: 0, qty: 0, value: 0 },
      PUMP_EQUIPMENT: { count: 0, qty: 0, value: 0 },
      SOLAR_PANEL: { count: 0, qty: 0, value: 0 },
      COMPANY_TOOL: { count: 0, qty: 0, value: 0 },
      WORK_TOOL: { count: 0, qty: 0, value: 0 },
    };

    for (const p of products) {
      const qty = Number(p.quantity) || 0;
      const cost = Number(p.costPrice) || Number(p.sellPrice) || 0;
      const value = qty * cost;
      totalStockValue += value;

      const cat = p.productCategory || 'WORK_TOOL';
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { count: 0, qty: 0, value: 0 };
      }
      categoryCounts[cat].count += 1;
      categoryCounts[cat].qty += qty;
      categoryCounts[cat].value += value;

      const minLevel = Number(p.minStockLevel) || 5;
      if (qty < minLevel) {
        lowStockCount += 1;
      }
    }

    // Pending field job releases
    const pendingJobs = await this.prisma.fieldWorkJob.findMany({
      where: {
        status: { in: ['approved_gm', 'checked_tm', 'planning', 'submitted_tm'] },
      },
      select: { id: true, title: true, status: true, customerName: true },
    });

    // Recent 10 transactions
    const recentTransactions = await this.prisma.inventoryTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Low stock items list
    const lowStockItems = products
      .filter((p) => Number(p.quantity) < (Number(p.minStockLevel) || 5))
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.productCategory,
        quantity: Number(p.quantity),
        minStockLevel: Number(p.minStockLevel) || 5,
        unit: p.unit || 'Piece',
      }));

    return {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      pendingReleasesCount: pendingJobs.length,
      categoryCounts,
      recentTransactions,
      lowStockItems,
    };
  }

  /**
   * Product Catalog list with filtering
   */
  async getCatalog(category?: string, search?: string) {
    const where: any = {};
    if (category && category !== 'ALL') {
      where.productCategory = category as ProductCategory;
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { code: { contains: search.trim() } },
        { category: { contains: search.trim() } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return products.map(p => this.mapProduct(p));
  }

  /**
   * Create new product with category defaults
   */
  async createProduct(data: {
    id?: string;
    code?: string;
    name: string;
    category?: string;
    productCategory: ProductCategory;
    quantity?: number;
    minStockLevel?: number;
    costPrice?: number;
    sellPrice?: number;
    unit?: string;
    shelfLocation?: string;
    brand?: string;
    model?: string;
  }, userId?: string, userName?: string) {
    const id = data.id || `PRD-${Date.now()}`;
    const metadata = {
      brand: data.brand || '',
      model: data.model || '',
      lastStockedAt: Number(data.quantity) > 0 ? new Date().toISOString() : null,
    };

    const product = await this.prisma.product.create({
      data: {
        id,
        code: data.code || String(Date.now()).slice(-6),
        name: data.name,
        category: data.category || data.productCategory,
        productCategory: data.productCategory || 'WORK_TOOL',
        quantity: data.quantity || 0,
        minStockLevel: data.minStockLevel || 5,
        costPrice: data.costPrice || 0,
        sellPrice: data.sellPrice || 0,
        unit: data.unit || 'Piece',
        shelfLocation: data.shelfLocation || '',
        metadata: metadata as any,
      },
    });

    if (Number(data.quantity) > 0) {
      await this.prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          category: product.productCategory,
          transactionType: 'RECEIVE',
          quantity: data.quantity || 0,
          unit: product.unit,
          unitPrice: product.costPrice,
          reference: 'INITIAL_STOCK',
          performedBy: userName || 'Storekeeper',
          notes: 'Initial stock registration',
        },
      });
    }

    return this.mapProduct(product);
  }

  /**
   * Quick Receive Stock (+ quantity)
   */
  async receiveStock(data: {
    productId: string;
    quantity: number;
    costPrice?: number;
    reference?: string;
    notes?: string;
  }, userId?: string, userName?: string) {
    if (!data.quantity || data.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existingMetadata = product.metadata && typeof product.metadata === 'object' ? (product.metadata as Record<string, any>) : {};
    const updatedMetadata = {
      ...existingMetadata,
      lastStockedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.product.update({
      where: { id: data.productId },
      data: {
        quantity: { increment: data.quantity },
        ...(data.costPrice ? { costPrice: data.costPrice } : {}),
        metadata: updatedMetadata as any,
      },
    });

    await this.prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        category: product.productCategory,
        transactionType: 'RECEIVE',
        quantity: data.quantity,
        unit: product.unit,
        unitPrice: data.costPrice || product.costPrice,
        reference: data.reference || 'SUPPLIER_RECEIPT',
        performedBy: userName || 'Storekeeper',
        notes: data.notes || `Received +${data.quantity} into stock`,
      },
    });

    return this.mapProduct(updated);
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: any) {
    const { brand, model, lastStockedAt, productCategory, id: newId, ...rest } = data;

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const currentMetadata = (existing.metadata as Record<string, any>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      brand: brand !== undefined ? brand : currentMetadata.brand,
      model: model !== undefined ? model : currentMetadata.model,
      lastStockedAt: lastStockedAt !== undefined ? lastStockedAt : currentMetadata.lastStockedAt,
    };

    const updatePayload: any = {
      ...rest,
      productCategory: productCategory || rest.productCategory,
      metadata: updatedMetadata as any,
    };

    if (newId && newId !== id) {
      const [updatedProduct] = await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id },
          data: {
            ...updatePayload,
            id: newId,
          },
        }),
        this.prisma.inventoryTransaction.updateMany({
          where: { productId: id },
          data: { productId: newId },
        }),
        this.prisma.fieldJobMaterial.updateMany({
          where: { productId: id },
          data: { productId: newId },
        }),
      ]);
      return this.mapProduct(updatedProduct);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updatePayload,
    });
    return this.mapProduct(updatedProduct);
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  /**
   * List pending field job releases
   */
  async getPendingReleases() {
    const jobs = await this.prisma.fieldWorkJob.findMany({
      where: {
        status: { in: ['planning', 'submitted_tm', 'checked_tm', 'approved_gm', 'accepted', 'Approved and ready to go'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = [];
    for (const job of jobs) {
      const materials = await this.prisma.fieldJobMaterial.findMany({
        where: { fieldWorkJobId: job.id },
      });

      // Filter out jobs where all items are already released!
      const hasPlanned = materials.some(m => m.status === 'PLANNED');
      const hasReleased = materials.some(m => m.status === 'RELEASED');
      if (materials.length > 0 && !hasPlanned && hasReleased) {
        continue;
      }

      // Extract payload planned items if field_job_materials hasn't been populated yet
      const payload = (job.payload as any) || {};
      const plannedEquipment = payload.equipment || [];
      const plannedCompanyTools = payload.companyTools || [];

      results.push({
        ...job,
        materials,
        plannedEquipment,
        plannedCompanyTools,
      });
    }

    return results;
  }

  /**
   * Confirm Storekeeper Release action
   */
  async confirmRelease(
    jobId: string,
    payload: {
      items: {
        productId?: string;
        productCode?: string;
        name: string;
        category: ProductCategory;
        quantity: number;
        unit?: string;
        serialNumber?: string;
        source: 'FROM_STOCK' | 'BOUGHT';
      }[];
      companyTools?: string[];
      notes?: string;
    },
    userId?: string,
    userName?: string,
  ) {
    const job = await this.prisma.fieldWorkJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Field work job not found');

    const createdMaterials = [];

    for (const item of payload.items) {
      // 1. If item is from stock, decrement product stock
      if (item.source === 'FROM_STOCK' && item.productId) {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const currentQty = Number(product.quantity) || 0;
          const takeQty = Number(item.quantity) || 1;
          const newQty = Math.max(0, currentQty - takeQty);

          await this.prisma.product.update({
            where: { id: product.id },
            data: { quantity: newQty },
          });

          // Log transaction
          await this.prisma.inventoryTransaction.create({
            data: {
              productId: product.id,
              productCode: product.code,
              productName: product.name,
              category: product.productCategory,
              transactionType: 'ISSUE',
              quantity: -takeQty,
              unit: product.unit,
              unitPrice: product.sellPrice,
              serialNumber: item.serialNumber,
              fieldWorkJobId: jobId,
              reference: `RELEASE:${job.title || jobId}`,
              performedBy: userName || 'Storekeeper',
              notes: `Released to field team for job ${job.title || jobId}`,
            },
          });
        }
      } else if (item.source === 'BOUGHT') {
        // Log BOUGHT record for finance audit
        await this.prisma.inventoryTransaction.create({
          data: {
            productId: item.productId,
            productCode: item.productCode,
            productName: item.name,
            category: item.category || 'WORK_TOOL',
            transactionType: 'BOUGHT',
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'Piece',
            serialNumber: item.serialNumber,
            fieldWorkJobId: jobId,
            reference: `DIRECT_PURCHASE:${job.title || jobId}`,
            performedBy: userName || 'Storekeeper',
            notes: `Direct purchase for site ${job.location || job.customerName}`,
          },
        });
      }

      // 2. Persist/Update in FieldJobMaterial
      let mat;
      let existingPlannedMat = null;
      if (item.productId) {
        existingPlannedMat = await this.prisma.fieldJobMaterial.findFirst({
          where: {
            fieldWorkJobId: jobId,
            productId: item.productId,
            status: 'PLANNED',
          },
        });
      }

      if (existingPlannedMat) {
        mat = await this.prisma.fieldJobMaterial.update({
          where: { id: existingPlannedMat.id },
          data: {
            serialNumber: item.serialNumber || existingPlannedMat.serialNumber,
            status: 'RELEASED',
          },
        });
      } else {
        mat = await this.prisma.fieldJobMaterial.create({
          data: {
            fieldWorkJobId: jobId,
            productId: item.productId,
            productCode: item.productCode,
            category: item.category || 'WORK_TOOL',
            name: item.name,
            serialNumber: item.serialNumber,
            quantity: item.quantity || 1,
            unit: item.unit || 'Piece',
            source: item.source as MaterialSource,
            status: 'RELEASED',
          },
        });
      }
      createdMaterials.push(mat);
    }

    // 3. Checkout Company Tools if provided
    if (payload.companyTools && payload.companyTools.length > 0) {
      for (const toolIdOrSerial of payload.companyTools) {
        const asset = await this.prisma.companyAsset.findFirst({
          where: {
            OR: [
              { id: toolIdOrSerial },
              { serialNumber: toolIdOrSerial },
              { name: toolIdOrSerial },
            ],
          },
        });

        if (asset) {
          await this.prisma.fieldWorkAsset.create({
            data: {
              fieldWorkJobId: jobId,
              companyAssetId: asset.id,
              status: 'CHECKED_OUT',
              checkedOutAt: new Date(),
              notes: payload.notes || 'Released for field deployment',
            },
          });

          await this.prisma.companyAsset.update({
            where: { id: asset.id },
            data: { status: 'IN_FIELD' },
          });
        }
      }
    }

    // Auto-propagate pump serial number to FieldWorkJob payload if a pump was released
    const releasedPump = createdMaterials.find(m => m.category === 'PUMP' && m.serialNumber);
    if (releasedPump) {
      const job = await this.prisma.fieldWorkJob.findUnique({ where: { id: jobId } });
      if (job) {
        const jobPayload = job.payload && typeof job.payload === 'object' ? (job.payload as any) : {};
        await this.prisma.fieldWorkJob.update({
          where: { id: jobId },
          data: {
            payload: {
              ...jobPayload,
              pumpSerial: releasedPump.serialNumber,
            },
          },
        });
      }
    }

    return {
      success: true,
      jobId,
      materials: createdMaterials,
      message: 'All materials and company tools successfully released to field team.',
    };
  }

  /**
   * Transaction history query
   */
  async getTransactions(limit = 100, type?: string, category?: string) {
    const where: any = {};
    if (type && type !== 'ALL') {
      where.transactionType = type as TransactionType;
    }
    if (category && category !== 'ALL') {
      where.category = category as ProductCategory;
    }

    return this.prisma.inventoryTransaction.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, code: true, category: true } },
      },
    });
  }

  /**
   * Audits / Stock Counts
   */
  async getStockCounts() {
    return this.prisma.stockCount.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStockCount(data: { category?: ProductCategory; countedBy: string; notes?: string }) {
    const products = await this.prisma.product.findMany({
      where: data.category ? { productCategory: data.category } : {},
    });

    return this.prisma.stockCount.create({
      data: {
        category: data.category,
        countedBy: data.countedBy,
        notes: data.notes,
        status: 'IN_PROGRESS',
        items: {
          create: products.map((p) => ({
            productId: p.id,
            productName: p.name,
            category: p.productCategory,
            systemQty: p.quantity,
            countedQty: p.quantity, // default to system until updated
            variance: 0,
            unit: p.unit,
          })),
        },
      },
      include: { items: true },
    });
  }

  async submitStockCount(
    id: string,
    payload: {
      items: { id: string; productId: string; countedQty: number; notes?: string }[];
      approvedBy?: string;
      notes?: string;
    },
    userId?: string,
    userName?: string,
  ) {
    const stockCount = await this.prisma.stockCount.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!stockCount) throw new NotFoundException('Stock count not found');

    for (const item of payload.items) {
      const existingItem = stockCount.items.find((i) => i.id === item.id || i.productId === item.productId);
      if (existingItem) {
        const sysQty = Number(existingItem.systemQty) || 0;
        const counted = Number(item.countedQty) || 0;
        const variance = counted - sysQty;

        await this.prisma.stockCountItem.update({
          where: { id: existingItem.id },
          data: {
            countedQty: counted,
            variance,
            notes: item.notes,
          },
        });

        // If variance !== 0, update product quantity & create ADJUSTMENT transaction
        if (variance !== 0) {
          const product = await this.prisma.product.findUnique({ where: { id: existingItem.productId } });
          if (product) {
            await this.prisma.product.update({
              where: { id: product.id },
              data: { quantity: counted },
            });

            await this.prisma.inventoryTransaction.create({
              data: {
                productId: product.id,
                productCode: product.code,
                productName: product.name,
                category: product.productCategory,
                transactionType: 'ADJUSTMENT',
                quantity: variance,
                unit: product.unit,
                unitPrice: product.costPrice,
                reference: `COUNT:${stockCount.id}`,
                performedBy: userName || stockCount.countedBy,
                notes: `Physical audit variance adjustment: ${variance > 0 ? '+' : ''}${variance} ${product.unit || 'units'}`,
              },
            });
          }
        }
      }
    }

    return this.prisma.stockCount.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: payload.approvedBy || userName || 'Management',
        notes: payload.notes || stockCount.notes,
      },
      include: { items: true },
    });
  }

  /**
   * Get compatible equipment list for a given pump model
   */
  async getPumpEquipmentMap(pumpModel: string) {
    if (!pumpModel) return [];

    try {
      const pump = await this.prisma.pumpProduct.findFirst({
        where: {
          OR: [
            { model: { contains: pumpModel } },
            { id: pumpModel },
          ],
        },
      });

      if (pump && Array.isArray(pump.equipment) && pump.equipment.length > 0) {
        return (pump.equipment as any[]).map((eq: any) => ({
          productId: eq.productId || `EQ-${(eq.name || 'ITEM').replace(/\s+/g, '-').toUpperCase()}`,
          name: eq.name,
          quantity: Number(eq.quantity) || 1,
          unit: eq.unit || 'Piece',
          price: Number(eq.price) || 0,
          cost: Number(eq.cost) || 0,
          category: 'PUMP_EQUIPMENT',
        }));
      }
    } catch (dbErr) {
      console.warn('Database lookup for pump equipment failed, using file fallback:', dbErr);
    }

    // Fallback: search extracted_pumps_data.json
    try {
      const fs = await import('fs');
      const path = await import('path');
      const possiblePaths = [
        path.join(process.cwd(), 'extracted_pumps_data.json'),
        path.join(process.cwd(), '..', 'extracted_pumps_data.json'),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const data = JSON.parse(raw);
          const pumps = Array.isArray(data) ? data : data.pumps || [];
          const matched = pumps.find(
            (item: any) =>
              item.model?.toLowerCase() === pumpModel.toLowerCase() ||
              item.model?.toLowerCase().includes(pumpModel.toLowerCase())
          );

          if (matched && Array.isArray(matched.equipment) && matched.equipment.length > 0) {
            return matched.equipment.map((eq: any) => ({
              productId: eq.productId || `EQ-${(eq.name || 'ITEM').replace(/\s+/g, '-').toUpperCase()}`,
              name: eq.name,
              quantity: Number(eq.quantity) || 1,
              unit: eq.unit || 'Piece',
              price: Number(eq.price) || 0,
              cost: Number(eq.cost) || 0,
              category: 'PUMP_EQUIPMENT',
            }));
          }
        }
      }
    } catch (fileErr) {
      console.warn('File fallback for pump equipment failed:', fileErr);
    }

    // Default standard equipment if none found
    return [
      {
        productId: `EQ-CONTROLLER-${pumpModel}`,
        name: `${pumpModel} MPPT Solar Controller`,
        quantity: 1,
        unit: 'Piece',
        price: 12000,
        cost: 9500,
        category: 'PUMP_EQUIPMENT',
      },
      {
        productId: 'EQ-PANEL-400W',
        name: '400W Monocrystalline Solar Panel',
        quantity: 2,
        unit: 'Piece',
        price: 14000,
        cost: 11000,
        category: 'PUMP_EQUIPMENT',
      },
      {
        productId: 'EQ-HDPE-PIPE',
        name: '32mm PN16 HDPE Submersible Pipe',
        quantity: 30,
        unit: 'Meter',
        price: 180,
        cost: 130,
        category: 'PUMP_EQUIPMENT',
      },
    ];
  }

  /**
   * Seed Master Catalog from extracted_pumps_data.json
   */
  async seedMasterCatalog() {
    const possiblePaths = [
      path.join(process.cwd(), 'extracted_pumps_data.json'),
      path.join(process.cwd(), '..', 'extracted_pumps_data.json'),
      path.join(__dirname, '../../../extracted_pumps_data.json'),
      path.join(__dirname, '../../../../extracted_pumps_data.json'),
    ];

    let dataPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dataPath = p;
        break;
      }
    }

    if (!dataPath) {
      return { success: false, message: 'extracted_pumps_data.json not found in searched paths' };
    }

    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      const data = JSON.parse(raw);
      let count = 0;

      // 1. Seed Pumps & Compatible Equipment
      if (Array.isArray(data.pumps)) {
        for (const p of data.pumps) {
          const brand = (p.brand || (p.model?.startsWith('4SDC') ? 'REDBUD' : 'DIFFUL')).toUpperCase();
          if (brand !== 'DIFFUL' && brand !== 'REDBUD') continue;

          const pumpCode = `PUMP-${p.model.replace(/[^a-zA-Z0-9]/g, '-')}`;
          const pumpName = `${brand} ${p.model} (${p.power || ''}${p.voltage ? `, ${p.voltage}` : ''})`.trim();
          
          const existing = await this.prisma.product.findFirst({
            where: { OR: [{ id: `PRD-${pumpCode}` }, { code: pumpCode }, { name: pumpName }] },
          });

          if (!existing) {
            await this.prisma.product.create({
              data: {
                id: `PRD-${pumpCode}`,
                code: pumpCode,
                name: pumpName,
                category: p.firstCategory || 'Solar Water Pump',
                productCategory: ProductCategory.PUMP,
                quantity: 0,
                minStockLevel: 2,
                costPrice: Number(p.price || 12000),
                sellPrice: Number(p.price ? p.price * 1.3 : 16000),
                unit: 'Piece',
                shelfLocation: brand === 'DIFFUL' ? 'Bay P-DIFFUL' : 'Bay P-REDBUD',
              },
            });
            count++;
          }

          // Seed Compatible Pump Equipment
          const equipmentList = p.equipment || [];
          for (const eq of equipmentList) {
            const eqCode = String(eq.productId || `EQ-${eq.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
            const eqName = eq.name || 'Compatible Pump Equipment';
            const existingEq = await this.prisma.product.findFirst({
              where: { OR: [{ id: `PRD-${eqCode}` }, { code: eqCode }, { name: eqName }] },
            });
            if (!existingEq) {
              await this.prisma.product.create({
                data: {
                  id: `PRD-${eqCode}`,
                  code: eqCode,
                  name: eqName,
                  category: 'Pump Accessories & Electronics',
                  productCategory: ProductCategory.PUMP_EQUIPMENT,
                  quantity: 0,
                  minStockLevel: 3,
                  costPrice: Number(eq.cost || eq.price || 3500),
                  sellPrice: Number(eq.price ? eq.price * 1.25 : 5000),
                  unit: eq.unit || 'Piece',
                  shelfLocation: eqName.toLowerCase().includes('controller')
                    ? 'Shelf E-CTRL'
                    : eqName.toLowerCase().includes('panel')
                    ? 'Panel Rack E-PV'
                    : 'Shelf E-ACC',
                },
              });
              count++;
            }
          }
        }
      }

      // 2. Seed General Inventory Products from JSON
      if (Array.isArray(data.inventory_products)) {
        for (const inv of data.inventory_products) {
          const invCode = String(inv.code || inv.id);
          const invName = inv.name;
          const existingInv = await this.prisma.product.findFirst({
            where: { OR: [{ id: `PRD-${invCode}` }, { code: invCode }, { name: invName }] },
          });
          if (!existingInv) {
            const cat = inv.category?.toLowerCase().includes('tool')
              ? ProductCategory.COMPANY_TOOL
              : inv.category?.toLowerCase().includes('panel') || inv.category?.toLowerCase().includes('controller')
              ? ProductCategory.PUMP_EQUIPMENT
              : ProductCategory.WORK_TOOL;

            await this.prisma.product.create({
              data: {
                id: `PRD-${invCode}`,
                code: invCode,
                name: invName,
                category: inv.category || 'General Inventory',
                productCategory: cat,
                quantity: Number(inv.quantity) || 0,
                minStockLevel: 5,
                costPrice: Number(inv.costPrice) || 0,
                sellPrice: Number(inv.sellPrice) || 0,
                unit: inv.unit || inv.measurementUnit || 'Piece',
                measurementUnit: inv.measurementUnit || inv.unit || 'Piece',
                shelfLocation: 'General Bay G-01',
              },
            });
            count++;
          }
        }
      }

      // 3. Seed Standard Company Tools
      const standardCompanyTools = [
        {
          id: 'TOOL-MAKITA-HR2470',
          code: 'TOOL-DRILL-01',
          name: 'Makita Rotary Hammer Drill 780W (HR2470)',
          category: 'Company Equipment & Tools',
          productCategory: ProductCategory.COMPANY_TOOL,
          quantity: 3,
          minStockLevel: 1,
          costPrice: 14500,
          sellPrice: 18000,
          unit: 'Asset',
          shelfLocation: 'Tool Rack A-01',
        },
        {
          id: 'TOOL-WRENCH-SET',
          code: 'TOOL-WRN-02',
          name: 'Heavy-Duty Pipe Wrench Set (14", 18", 24")',
          category: 'Company Equipment & Tools',
          productCategory: ProductCategory.COMPANY_TOOL,
          quantity: 4,
          minStockLevel: 2,
          costPrice: 4800,
          sellPrice: 6500,
          unit: 'Asset',
          shelfLocation: 'Tool Rack A-02',
        },
        {
          id: 'TOOL-FLUKE-302',
          code: 'TOOL-MTR-03',
          name: 'Fluke 302+ Digital AC/DC Clamp Multimeter',
          category: 'Company Equipment & Tools',
          productCategory: ProductCategory.COMPANY_TOOL,
          quantity: 2,
          minStockLevel: 1,
          costPrice: 9500,
          sellPrice: 12000,
          unit: 'Asset',
          shelfLocation: 'Electronics Lab B-01',
        },
        {
          id: 'TOOL-MC4-CRIMPER',
          code: 'TOOL-CRIMP-04',
          name: 'Solar PV MC4 Crimping & Stripping Tool Kit',
          category: 'Company Equipment & Tools',
          productCategory: ProductCategory.COMPANY_TOOL,
          quantity: 5,
          minStockLevel: 2,
          costPrice: 3200,
          sellPrice: 4500,
          unit: 'Asset',
          shelfLocation: 'Tool Rack A-03',
        },
        {
          id: 'TOOL-ALUM-LADDER',
          code: 'TOOL-LDR-05',
          name: 'Telescopic Aluminum Extension Ladder (5.8m)',
          category: 'Company Equipment & Tools',
          productCategory: ProductCategory.COMPANY_TOOL,
          quantity: 2,
          minStockLevel: 1,
          costPrice: 16000,
          sellPrice: 21000,
          unit: 'Asset',
          shelfLocation: 'Heavy Bay C-01',
        },
      ];

      for (const tool of standardCompanyTools) {
        const existingTool = await this.prisma.product.findFirst({
          where: { OR: [{ id: tool.id }, { code: tool.code }, { name: tool.name }] },
        });
        if (!existingTool) {
          await this.prisma.product.create({ data: tool });
          count++;
        }
      }

      // 4. Seed Standard Work Consumables
      const standardWorkTools = [
        {
          id: 'MAT-CABLE-6MM-RED',
          code: 'MAT-CBL-6R',
          name: 'Solar DC Cable 6mm² - UV Resistant (Red)',
          category: 'Installation Consumables & Pipes',
          productCategory: ProductCategory.WORK_TOOL,
          quantity: 500,
          minStockLevel: 100,
          costPrice: 120,
          sellPrice: 165,
          unit: 'Meter',
          shelfLocation: 'Cable Spool Bay C-03',
        },
        {
          id: 'MAT-CABLE-6MM-BLK',
          code: 'MAT-CBL-6B',
          name: 'Solar DC Cable 6mm² - UV Resistant (Black)',
          category: 'Installation Consumables & Pipes',
          productCategory: ProductCategory.WORK_TOOL,
          quantity: 500,
          minStockLevel: 100,
          costPrice: 120,
          sellPrice: 165,
          unit: 'Meter',
          shelfLocation: 'Cable Spool Bay C-04',
        },
        {
          id: 'MAT-MC4-PAIR',
          code: 'MAT-MC4-CONN',
          name: 'MC4 Solar Waterproof Connectors (Male/Female Pair)',
          category: 'Installation Consumables & Pipes',
          productCategory: ProductCategory.WORK_TOOL,
          quantity: 120,
          minStockLevel: 30,
          costPrice: 65,
          sellPrice: 95,
          unit: 'Pair',
          shelfLocation: 'Bin D-12',
        },
        {
          id: 'MAT-HEATSHRINK-KIT',
          code: 'MAT-SPLICE-KIT',
          name: 'Submersible Waterproof Splicing Heat-Shrink Kit (4-Core)',
          category: 'Installation Consumables & Pipes',
          productCategory: ProductCategory.WORK_TOOL,
          quantity: 45,
          minStockLevel: 15,
          costPrice: 350,
          sellPrice: 500,
          unit: 'Kit',
          shelfLocation: 'Bin D-08',
        },
        {
          id: 'MAT-TEFLON-TAPE',
          code: 'MAT-TEFLON',
          name: 'Heavy Duty PTFE Teflon Thread Seal Tape (19mm x 15m)',
          category: 'Installation Consumables & Pipes',
          productCategory: ProductCategory.WORK_TOOL,
          quantity: 80,
          minStockLevel: 20,
          costPrice: 45,
          sellPrice: 70,
          unit: 'Roll',
          shelfLocation: 'Bin D-02',
        },
        {
          id: 'MAT-HDPE-PIPE-32',
          code: 'MAT-HDPE-32',
          name: 'HDPE Polyethylene Drop Pipe 32mm PN16 (100m Roll)',
          category: 'Installation Consumables & Pipes',
          productCategory: ProductCategory.WORK_TOOL,
          quantity: 6,
          minStockLevel: 2,
          costPrice: 8500,
          sellPrice: 11500,
          unit: 'Roll',
          shelfLocation: 'Pipe Yard Yard-01',
        },
      ];

      for (const mat of standardWorkTools) {
        const existingMat = await this.prisma.product.findFirst({
          where: { OR: [{ id: mat.id }, { code: mat.code }, { name: mat.name }] },
        });
        if (!existingMat) {
          await this.prisma.product.create({ data: mat });
          count++;
        }
      }

      // 5. Seed Standard Solar Panels
      const standardSolarPanels = [
        {
          id: 'PRD-PANEL-SF-250W',
          code: 'PANEL-SF-250W',
          name: 'Solar Panel 250W',
          category: 'Solar Panels',
          productCategory: ProductCategory.SOLAR_PANEL,
          quantity: 20,
          minStockLevel: 5,
          costPrice: 4500,
          sellPrice: 6000,
          unit: 'Piece',
          shelfLocation: 'Panel Rack E-PV-250',
          metadata: { brand: 'SolarFlow', model: 'SF-250W-MONO', lastStockedAt: new Date().toISOString() },
        },
        {
          id: 'PRD-PANEL-SF-350W',
          code: 'PANEL-SF-350W',
          name: 'Solar Panel 350W',
          category: 'Solar Panels',
          productCategory: ProductCategory.SOLAR_PANEL,
          quantity: 15,
          minStockLevel: 5,
          costPrice: 6500,
          sellPrice: 8500,
          unit: 'Piece',
          shelfLocation: 'Panel Rack E-PV-350',
          metadata: { brand: 'SolarFlow', model: 'SF-350W-MONO', lastStockedAt: new Date().toISOString() },
        },
        {
          id: 'PRD-PANEL-SF-450W',
          code: 'PANEL-SF-450W',
          name: 'Solar Panel 450W',
          category: 'Solar Panels',
          productCategory: ProductCategory.SOLAR_PANEL,
          quantity: 12,
          minStockLevel: 5,
          costPrice: 8500,
          sellPrice: 11000,
          unit: 'Piece',
          shelfLocation: 'Panel Rack E-PV-450',
          metadata: { brand: 'SolarFlow', model: 'SF-450W-MONO', lastStockedAt: new Date().toISOString() },
        },
        {
          id: 'PRD-PANEL-SF-550W',
          code: 'PANEL-SF-550W',
          name: 'Solar Panel 550W',
          category: 'Solar Panels',
          productCategory: ProductCategory.SOLAR_PANEL,
          quantity: 10,
          minStockLevel: 5,
          costPrice: 10500,
          sellPrice: 14000,
          unit: 'Piece',
          shelfLocation: 'Panel Rack E-PV-550',
          metadata: { brand: 'SolarFlow', model: 'SF-550W-MONO', lastStockedAt: new Date().toISOString() },
        },
      ];

      for (const panel of standardSolarPanels) {
        const existingPanel = await this.prisma.product.findFirst({
          where: { OR: [{ id: panel.id }, { code: panel.code }, { name: panel.name }] },
        });
        if (!existingPanel) {
          await this.prisma.product.create({ data: panel as any });
          count++;
        }
      }

      return { success: true, seededCount: count };
    } catch (err: any) {
      console.error('Seed catalog error:', err);
      return { success: false, error: err.message };
    }
  }
}
