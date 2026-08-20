import { Controller, Get, Post, Patch, Body, Param, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AssetsService } from './assets.service';
import { AuthUser } from '../common/types/auth-user';
import { Roles } from '../common/decorators/roles.decorator';

const fieldworkUploadDir = join(process.cwd(), 'uploads', 'fieldwork');
if (!existsSync(fieldworkUploadDir)) {
  mkdirSync(fieldworkUploadDir, { recursive: true });
}

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
      fieldWorkJobId?: string;
      jobId?: string;
      assetIds?: string[];
      toolNames?: string[];
    },
  ) {
    const jobId = payload.fieldWorkJobId || payload.jobId || '';
    return this.assetsService.checkoutAssets(jobId, payload.assetIds || payload.toolNames || []);
  }

  @Post('fieldwork-assets/return')
  returnAssets(
    @Body() payload: {
      fieldWorkJobId?: string;
      jobId?: string;
      returns?: { companyAssetId: string; condition?: string; notes?: string }[];
    },
  ) {
    const jobId = payload.fieldWorkJobId || payload.jobId || '';
    return this.assetsService.returnAssets(jobId, payload.returns || []);
  }

  @Get('fieldwork-assets/job/:jobId')
  getCheckoutsByJob(@Param('jobId') jobId: string) {
    return this.assetsService.getCheckoutsByJob(jobId);
  }

  @Patch('fieldwork/:id/assign')
  @Roles('manager', 'fieldwork', 'ttl')
  assignJob(@Param('id') id: string, @Body('assignedTo') assignedTo: string) {
    return this.assetsService.assignJob(id, assignedTo);
  }

  @Patch('fieldwork/:id/accept')
  @Roles('fieldwork', 'ttl')
  acceptJob(@Param('id') id: string) {
    return this.assetsService.acceptJob(id);
  }

  @Patch('fieldwork/:id/submit-plan')
  @Roles('fieldwork', 'ttl')
  submitPlan(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
    @Body() payload: {
      workers: any[];
      notes: string;
      companyTools: string[];
      fuelAmount?: number;
      fuelPrice?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.assetsService.submitPlan(id, payload, request.user.id, request.user.displayName);
  }

  @Patch('fieldwork/:id/tm-check')
  @Roles('manager', 'fieldwork')
  tmCheck(@Param('id') id: string) {
    return this.assetsService.tmCheck(id);
  }

  @Patch('fieldwork/:id/gm-approve')
  @Roles('manager')
  gmApprove(@Param('id') id: string) {
    return this.assetsService.gmApprove(id);
  }

  @Patch('fieldwork/:id/finance-approve')
  @Roles('finance')
  financeApprove(@Param('id') id: string) {
    return this.assetsService.financeApprove(id);
  }

  @Patch('fieldwork/:id/dispatch')
  @Roles('fieldwork', 'ttl')
  dispatchCrew(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.assetsService.dispatchCrew(id, request.user?.displayName, request.user?.id);
  }

  @Post('fieldwork/:id/daily-report')
  @Roles('fieldwork', 'ttl')
  submitDailyReport(
    @Param('id') id: string,
    @Body() payload: {
      content?: string;
      submittedBy: string;
      achievements?: string;
      challenges?: string;
      nextDayPlan?: string;
      photos?: string[];
      imageUrl?: string;
    },
  ) {
    return this.assetsService.submitDailyReport(id, payload);
  }

  @Post('fieldwork/:id/daily-report/:reportId/forward')
  @Roles('manager', 'fieldwork', 'ttl')
  forwardDailyReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.assetsService.forwardDailyReportToGm(id, reportId, request.user.displayName);
  }

  @Patch('fieldwork/:id/complete')
  @Roles('fieldwork', 'ttl')
  completeJob(
    @Param('id') id: string,
    @Body() payload: { completionPhotos?: string[]; returnedTools?: string[]; leftoverFuel?: number; notes?: string },
  ) {
    return this.assetsService.completeJob(id, payload);
  }

  @Patch('fieldwork/:id/storekeeper-verify')
  @Roles('storekeeper')
  storekeeperVerify(
    @Param('id') id: string,
    @Body() payload: {
      verifiedMaterials?: { productId?: string; name: string; quantity: number; unit?: string }[];
      verifiedTools?: { companyAssetId: string; name: string; condition: string; notes?: string }[];
      notes?: string;
    },
    @Req() request: { user: AuthUser },
  ) {
    return this.assetsService.storekeeperVerifyReturns(id, payload, request.user.id, request.user.displayName);
  }

  @Patch('fieldwork/:id/approve-returns')
  @Roles('manager', 'fieldwork')
  approveReturns(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.assetsService.approveReturns(id, request.user.id, request.user.displayName);
  }

  @Post('fieldwork/upload-photos')
  @UseInterceptors(
    FilesInterceptor('photos', 4, {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => cb(null, fieldworkUploadDir),
        filename: (_req: any, file: any, cb: any) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `fw-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  uploadFieldworkPhotos(@UploadedFiles() files: any[]) {
    const urls = (files || []).map(f => `/uploads/fieldwork/${f.filename}`);
    return { urls };
  }
}
