-- CreateTable
CREATE TABLE `peachtree_imports` (
    `id` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'desktop-agent',
    `fileName` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'received',
    `detectedFormat` VARCHAR(191) NULL,
    `recordCount` INTEGER NOT NULL DEFAULT 0,
    `rawPreview` TEXT NULL,
    `parsedData` JSON NULL,
    `mappingSummary` JSON NULL,
    `errorMessage` TEXT NULL,
    `uploadedBy` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `peachtree_imports_checksum_key`(`checksum`),
    INDEX `peachtree_imports_company_uploadedAt_idx`(`company`, `uploadedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
