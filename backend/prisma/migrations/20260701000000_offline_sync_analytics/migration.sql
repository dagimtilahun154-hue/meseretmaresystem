CREATE TABLE `sync_devices` (
  `id` VARCHAR(191) NOT NULL,
  `deviceKey` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'web',
  `company` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastPushAt` DATETIME(3) NULL,
  `lastPullAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `sync_devices_deviceKey_key`(`deviceKey`),
  INDEX `sync_devices_company_lastSeenAt_idx`(`company`, `lastSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sync_mutations` (
  `id` VARCHAR(191) NOT NULL,
  `deviceKey` VARCHAR(191) NULL,
  `company` VARCHAR(191) NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `operation` VARCHAR(191) NOT NULL,
  `endpoint` VARCHAR(191) NULL,
  `method` VARCHAR(191) NULL,
  `payload` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
  `retryCount` INTEGER NOT NULL DEFAULT 0,
  `errorMessage` TEXT NULL,
  `createdBy` VARCHAR(191) NULL,
  `clientCreatedAt` DATETIME(3) NULL,
  `appliedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `sync_mutations_company_status_createdAt_idx`(`company`, `status`, `createdAt`),
  INDEX `sync_mutations_deviceKey_status_idx`(`deviceKey`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sync_conflicts` (
  `id` VARCHAR(191) NOT NULL,
  `mutationId` VARCHAR(191) NULL,
  `company` VARCHAR(191) NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `reason` VARCHAR(191) NOT NULL,
  `clientValue` JSON NULL,
  `serverValue` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'open',
  `resolvedBy` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `sync_conflicts_company_status_createdAt_idx`(`company`, `status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
