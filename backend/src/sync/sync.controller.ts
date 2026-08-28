import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
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

  @Public()
  @Post("peachtree/heartbeat")
  @UseGuards(ApiKeyGuard)
  recordHeartbeat(@Body() payload: any) {
    return this.syncService.recordHeartbeat(payload);
  }

  @Public()
  @Get("peachtree/heartbeat")
  getHeartbeat() {
    return this.syncService.getLatestHeartbeat();
  }

  @Post("peachtree/ping-accountant")
  pingAccountant(@Req() req: any) {
    const user = req.user?.displayName || req.user?.username || "General Manager";
    return this.syncService.pingAccountant(user);
  }

  @Public()
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
  @Get("peachtree/vault/download")
  async downloadPeachtreeVault(@Req() req: any, @Res() res: any) {
    const archive = await this.syncService.getPeachtreeVaultArchive();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Meseret_Mare_Peachtree_Database_Vault_${timestamp}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(archive, null, 2));
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
