import { Controller, Get, Post, Patch, Body, Param, Req } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AuthUser } from '../common/types/auth-user';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('company-assets')
  listAssets() {
    return this.assetsService.listAssets();
  }

  @Post('company-assets')
  createAsset(
    @Body() payload: {
      serialNumber: string;
      name: string;
      category?: string;
      condition?: string;
    },
  ) {
    return this.assetsService.createAsset(payload);
  }

  @Post('fieldwork-assets/checkout')
  checkoutAssets(
    @Body() payload: {
      fieldWorkJobId: string;
      assetIds: string[];
    },
  ) {
    return this.assetsService.checkoutAssets(payload.fieldWorkJobId, payload.assetIds);
  }

  @Post('fieldwork-assets/return')
  returnAssets(
    @Body() payload: {
      fieldWorkJobId: string;
      returns: { companyAssetId: string; condition?: string; notes?: string }[];
    },
  ) {
    return this.assetsService.returnAssets(payload.fieldWorkJobId, payload.returns);
  }

  @Get('fieldwork-assets/job/:jobId')
  getCheckoutsByJob(@Param('jobId') jobId: string) {
    return this.assetsService.getCheckoutsByJob(jobId);
  }

  @Patch('fieldwork/:id/assign')
  assignJob(@Param('id') id: string, @Body('assignedTo') assignedTo: string) {
    return this.assetsService.assignJob(id, assignedTo);
  }

  @Patch('fieldwork/:id/accept')
  acceptJob(@Param('id') id: string) {
    return this.assetsService.acceptJob(id);
  }

  @Patch('fieldwork/:id/submit-plan')
  submitPlan(
    @Param('id') id: string,
    @Body() payload: {
      workers: any[];
      notes: string;
      companyTools: string[];
      fuelAmount?: number;
      fuelPrice?: number;
    },
  ) {
    return this.assetsService.submitPlan(id, payload);
  }

  @Patch('fieldwork/:id/tm-check')
  tmCheck(@Param('id') id: string) {
    return this.assetsService.tmCheck(id);
  }

  @Patch('fieldwork/:id/gm-approve')
  gmApprove(@Param('id') id: string) {
    return this.assetsService.gmApprove(id);
  }

  @Patch('fieldwork/:id/finance-approve')
  financeApprove(@Param('id') id: string) {
    return this.assetsService.financeApprove(id);
  }

  @Post('fieldwork/:id/daily-report')
  @Roles('fieldwork')
  submitDailyReport(
    @Param('id') id: string,
    @Body() payload: { content: string; submittedBy: string },
  ) {
    return this.assetsService.submitDailyReport(id, payload);
  }

  @Post('fieldwork/:id/daily-report/:reportId/forward')
  @Roles('manager')
  forwardDailyReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.assetsService.forwardDailyReportToGm(id, reportId, request.user.displayName);
  }

  @Patch('fieldwork/:id/complete')
  @Roles('fieldwork')
  completeJob(@Param('id') id: string) {
    return this.assetsService.completeJob(id);
  }

  @Patch('fieldwork/:id/approve-returns')
  @Roles('manager')
  approveReturns(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.assetsService.approveReturns(id, request.user.id, request.user.displayName);
  }
}
