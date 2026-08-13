import { Controller, Get, Post, Put, Patch, Body, Param, Req, Query } from '@nestjs/common';
import { SizingService } from './sizing.service';
import { AuthUser } from '../common/types/auth-user';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('sizing-requests')
export class SizingController {
  constructor(private readonly sizingService: SizingService) {}

  @Get()
  listRequests(@Query('status') status?: string) {
    return this.sizingService.listRequests(status);
  }

  @Get(':id')
  getRequestDetail(@Param('id') id: string) {
    return this.sizingService.getRequestDetail(id);
  }

  @Post()
  createDraft(
    @Req() request: { user: AuthUser },
    @Body() payload: {
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
    },
  ) {
    return this.sizingService.createDraft(request.user.id, request.user.displayName, payload);
  }

  @Put(':id')
  updateDraft(
    @Param('id') id: string,
    @Body() payload: {
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
    },
  ) {
    return this.sizingService.updateDraft(id, payload);
  }

  @Patch(':id/submit-to-tm')
  submitToTm(
    @Param('id') id: string,
  ) {
    return this.sizingService.submitToTm(id);
  }

  @Patch(':id/tm-reject')
  @Roles('fieldwork')
  tmReject(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
    @Body() payload: { suggestedPumpModel: string; comment: string },
  ) {
    return this.sizingService.tmReject(id, request.user.id, request.user.displayName, payload);
  }

  @Patch(':id/check')
  @Roles('fieldwork')
  checkSizing(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.sizingService.checkSizing(id, request.user.id, request.user.displayName);
  }

  @Patch(':id/gm-approve')
  @Roles('manager')
  gmApprove(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.sizingService.gmApprove(id, request.user.id, request.user.displayName);
  }

  @Patch(':id/finance-pay')
  @Roles('finance', 'storekeeper', 'manager', 'sales')
  financePay(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.sizingService.financePay(id, request.user.id, request.user.displayName);
  }

  @Patch(':id/mark-paid')
  @Roles('finance', 'storekeeper', 'manager', 'sales')
  markPaid(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
  ) {
    return this.sizingService.financePay(id, request.user.id, request.user.displayName);
  }

  @Post(':id/create-fieldwork')
  @Roles('fieldwork')
  createFieldwork(
    @Param('id') id: string,
    @Req() request: { user: AuthUser },
    @Body() payload: { assignedTo: string },
  ) {
    return this.sizingService.createFieldwork(id, request.user.id, request.user.displayName, payload);
  }
}
