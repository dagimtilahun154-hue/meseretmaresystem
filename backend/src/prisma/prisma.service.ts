import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        break;
      } catch (err: any) {
        retries--;
        console.warn(`[PrismaService] Database connection attempt failed. Retrying in 2s (${retries} attempts left)...`);
        if (retries === 0) {
          console.error(`[PrismaService] Critical: Unable to connect to TiDB database:`, err.message);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
