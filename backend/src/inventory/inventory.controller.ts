import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthUser } from '../common/types/auth-user';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductCategory } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('dashboard')
  getDashboardMetrics() {
    return this.inventoryService.getDashboardMetrics();
  }

  @Get('catalog')
  getCatalog(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getCatalog(category, search);
  }

  @Post('seed-catalog')
  seedMasterCatalog() {
    return this.inventoryService.seedMasterCatalog();
  }

  @Post('products')
  createProduct(
    @Body() payload: {
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
    },
    @Req() req: { user: AuthUser },
  ) {
    return this.inventoryService.createProduct(payload, req.user?.id, req.user?.displayName);
  }

  @Post('products/receive')
  receiveStock(
    @Body() payload: {
      productId: string;
      quantity: number;
      costPrice?: number;
      reference?: string;
      notes?: string;
    },
    @Req() req: { user: AuthUser },
  ) {
    return this.inventoryService.receiveStock(payload, req.user?.id, req.user?.displayName);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() payload: any,
  ) {
    return this.inventoryService.updateProduct(id, payload);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Get('releases')
  getPendingReleases() {
    return this.inventoryService.getPendingReleases();
  }

  @Post('releases/:jobId/confirm')
  confirmRelease(
    @Param('jobId') jobId: string,
    @Body() payload: {
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
    @Req() req: { user: AuthUser },
  ) {
    return this.inventoryService.confirmRelease(jobId, payload, req.user?.id, req.user?.displayName);
  }

  @Get('transactions')
  getTransactions(
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 100;
    return this.inventoryService.getTransactions(numLimit, type, category);
  }

  @Get('audits')
  getStockCounts() {
    return this.inventoryService.getStockCounts();
  }

  @Post('audits')
  createStockCount(
    @Body() payload: { category?: ProductCategory; countedBy: string; notes?: string },
  ) {
    return this.inventoryService.createStockCount(payload);
  }

  @Post('audits/:id/submit')
  submitStockCount(
    @Param('id') id: string,
    @Body() payload: {
      items: { id: string; productId: string; countedQty: number; notes?: string }[];
      approvedBy?: string;
      notes?: string;
    },
    @Req() req: { user: AuthUser },
  ) {
    return this.inventoryService.submitStockCount(id, payload, req.user?.id, req.user?.displayName);
  }

  @Get('pump-equipment-map/:pumpModel')
  getPumpEquipmentMap(@Param('pumpModel') pumpModel: string) {
    return this.inventoryService.getPumpEquipmentMap(pumpModel);
  }
}
