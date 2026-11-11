-- AlterTable
ALTER TABLE `LoyaltySettings` ADD COLUMN `atRiskDays` INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN `churnDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `painMapPoints` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `stampCardSize` INTEGER NOT NULL DEFAULT 8,
    ADD COLUMN `stampRewardId` VARCHAR(32) NULL,
    ADD COLUMN `voucherValidityDays` INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE `LoyaltyTransaction` ADD COLUMN `undoneAt` DATETIME(3) NULL,
    MODIFY `reason` ENUM('REFERRAL_BONUS', 'WELCOME_BONUS', 'PAIN_MAP_BONUS', 'SESSION_ATTENDED', 'MANUAL_ADJUSTMENT', 'CAMPAIGN_BONUS', 'REWARD_REDEMPTION', 'REDEMPTION_REFUND', 'REVERSAL') NOT NULL;

-- AlterTable
ALTER TABLE `Redemption` ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `source` ENUM('POINTS', 'STAMP_CARD') NOT NULL DEFAULT 'POINTS',
    MODIFY `status` ENUM('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `checkInMethod` ENUM('STAFF_SCAN', 'NFC_TAG', 'QR_SELF', 'MANUAL', 'API') NULL,
    ADD COLUMN `coursePackId` VARCHAR(191) NULL,
    ADD COLUMN `roomNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `focusArea` VARCHAR(40) NULL,
    ADD COLUMN `googleWalletObjectId` VARCHAR(120) NULL,
    ADD COLUMN `joinedVia` VARCHAR(40) NULL,
    ADD COLUMN `lastVisitAt` DATETIME(3) NULL,
    ADD COLUMN `memberCode` VARCHAR(16) NULL,
    ADD COLUMN `preferredBranch` ENUM('SHEIKH_ZAYED', 'ALMAZA_BAY') NULL,
    ADD COLUMN `stampCardsCompleted` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `stampCount` INTEGER NOT NULL DEFAULT 0,
    MODIFY `email` VARCHAR(255) NULL,
    MODIFY `role` ENUM('ADMIN', 'STAFF', 'PATIENT') NOT NULL DEFAULT 'PATIENT';

-- CreateTable
CREATE TABLE `PackageTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `type` ENUM('PHYSIOTHERAPY', 'EMS', 'IV_THERAPY', 'CUPPING', 'LYMPHATIC_DRAINAGE', 'WOMENS_HEALTH', 'PSYCHIATRY', 'NUTRITION', 'OTHER') NOT NULL,
    `sessions` INTEGER NOT NULL,
    `priceEgp` INTEGER NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PackageTemplate_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoursePack` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `name` VARCHAR(120) NOT NULL,
    `type` ENUM('PHYSIOTHERAPY', 'EMS', 'IV_THERAPY', 'CUPPING', 'LYMPHATIC_DRAINAGE', 'WOMENS_HEALTH', 'PSYCHIATRY', 'NUTRITION', 'OTHER') NOT NULL,
    `totalSessions` INTEGER NOT NULL,
    `usedSessions` INTEGER NOT NULL DEFAULT 0,
    `priceEgp` INTEGER NULL,
    `paidAt` DATETIME(3) NULL,
    `paymentMethod` ENUM('CASH', 'CARD', 'INSTAPAY', 'BANK_TRANSFER', 'OTHER') NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CoursePack_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerOffer` (
    `id` VARCHAR(191) NOT NULL,
    `partnerName` VARCHAR(120) NOT NULL,
    `zone` ENUM('SHEIKH_ZAYED', 'ALMAZA_BAY', 'ALL') NOT NULL DEFAULT 'ALL',
    `kind` ENUM('GIFT', 'DISCOUNT') NOT NULL DEFAULT 'DISCOUNT',
    `title` VARCHAR(120) NOT NULL,
    `badge` VARCHAR(24) NULL,
    `description` VARCHAR(500) NULL,
    `terms` VARCHAR(500) NULL,
    `emoji` VARCHAR(16) NULL,
    `url` VARCHAR(500) NULL,
    `minTier` ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL DEFAULT 'BRONZE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `validUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartnerOffer_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerClaim` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(16) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PartnerClaim_code_key`(`code`),
    INDEX `PartnerClaim_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `PartnerClaim_offerId_userId_key`(`offerId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckIn` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `branch` ENUM('SHEIKH_ZAYED', 'ALMAZA_BAY') NOT NULL DEFAULT 'SHEIKH_ZAYED',
    `roomNumber` INTEGER NULL,
    `method` ENUM('STAFF_SCAN', 'NFC_TAG', 'QR_SELF', 'MANUAL', 'API') NOT NULL DEFAULT 'NFC_TAG',
    `status` ENUM('PENDING', 'LOGGED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `sessionId` VARCHAR(32) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CheckIn_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `CheckIn_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint`),
    INDEX `PushSubscription_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Give every existing account a member code (new accounts get one from the app), then lock the column.
UPDATE `User` SET `memberCode` = CONCAT('SHM-', UPPER(SUBSTRING(MD5(CONCAT(`id`, ':member')), 1, 8))) WHERE `memberCode` IS NULL;
ALTER TABLE `User` MODIFY `memberCode` VARCHAR(16) NOT NULL;

-- CreateIndex
CREATE INDEX `Redemption_status_expiresAt_idx` ON `Redemption`(`status`, `expiresAt`);

-- CreateIndex
CREATE INDEX `Session_coursePackId_idx` ON `Session`(`coursePackId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_memberCode_key` ON `User`(`memberCode`);

-- CreateIndex
CREATE INDEX `User_phone_idx` ON `User`(`phone`);

-- CreateIndex
CREATE INDEX `User_role_lastVisitAt_idx` ON `User`(`role`, `lastVisitAt`);

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_coursePackId_fkey` FOREIGN KEY (`coursePackId`) REFERENCES `CoursePack`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoursePack` ADD CONSTRAINT `CoursePack_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoursePack` ADD CONSTRAINT `CoursePack_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `PackageTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerClaim` ADD CONSTRAINT `PartnerClaim_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `PartnerOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerClaim` ADD CONSTRAINT `PartnerClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

