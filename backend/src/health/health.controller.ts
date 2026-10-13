import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    let dbStatus = "connected";
    let dbError = null;
    let tablesExist = false;
    let userCount = 0;

    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
    } catch (err: any) {
      dbStatus = "error";
      dbError = err?.message || String(err);
    }

    if (dbStatus === "connected") {
      try {
        userCount = await this.prisma.user.count();
        tablesExist = true;
      } catch (err: any) {
        tablesExist = false;
        dbError = err?.message || String(err);
      }
    }

    return {
      status: "ok",
      service: "solarflow-backend",
      database: {
        status: dbStatus,
        tablesExist,
        userCount,
        error: dbError,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
