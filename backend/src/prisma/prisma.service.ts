import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        try {
          await this.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS customer_documents (
              id VARCHAR(191) NOT NULL PRIMARY KEY,
              customerId VARCHAR(191) NOT NULL,
              title VARCHAR(255) NOT NULL,
              fileName VARCHAR(255) NOT NULL,
              fileUrl VARCHAR(512) NOT NULL,
              fileType VARCHAR(100) NOT NULL,
              fileSize INT NOT NULL,
              category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
              notes TEXT NULL,
              uploadedById VARCHAR(191) NULL,
              createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
              updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
              INDEX idx_customer_documents_customerId (customerId),
              INDEX idx_customer_documents_category (category),
              INDEX idx_customer_documents_uploadedById (uploadedById)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `);
        } catch (tableErr: any) {
          console.warn(`[PrismaService] customer_documents table init check:`, tableErr.message);
        }
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
