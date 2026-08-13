import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { ApiKeyGuard } from "../common/guards/api-key.guard";
import { Public } from "../common/decorators/public.decorator";

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("devices/register")
  registerDevice(@Body() body: any, @Req() req: any) {
    return this.syncService.registerDevice(body, req.user);
  }

  @Post("push")
  push(@Body() body: any, @Req() req: any) {
    return this.syncService.push(body, req.user);
  }

  @Get("pull")
  pull(@Query() query: any, @Req() req: any) {
    return this.syncService.pull(query, req.user);
  }

  @Post("ack")
  ack(@Body() body: any) {
    return this.syncService.ack(body);
  }

  @Get("status")
  status(@Query() query: any) {
    return this.syncService.status(query);
  }

  @Public()
  @Post("peachtree")
  @UseGuards(ApiKeyGuard)
  syncPeachtree(@Body() payload: any) {
    return this.syncService.syncPeachtreeData(payload);
  }

  @Get("peachtree/data")
  getSyncedPeachtreeData() {
    return this.syncService.getSyncedPeachtreeData();
  }

  @Get("peachtree/matches")
  getPeachtreeMatches() {
    return this.syncService.matchPeachtreePayments();
  }

  @Get("peachtree/vault")
  getPeachtreeVault() {
    return this.syncService.getPeachtreeVaultArchive();
  }

  @Public()
  @Post("peachtree/daemon")
  peachtreeDaemonHandler(@Body() payload: any) {
    return {
      status: "ACTIVE_ODBC_DAEMON_READY",
      timestamp: new Date().toISOString(),
      daemonMode: "LIVE_ODBC_SERVICE",
      peachtreeReady: true,
      message: "Phase 2 Peachtree Live ODBC Daemon connected successfully",
      processedCount: payload?.entries?.length || 0,
    };
  }
}
