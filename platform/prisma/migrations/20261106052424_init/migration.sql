-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `role` ENUM('ADMIN', 'PATIENT') NOT NULL DEFAULT 'PATIENT',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `referralCode` VARCHAR(16) NULL,
    `referredById` VARCHAR(191) NULL,
    `loyaltyPoints` INTEGER NOT NULL DEFAULT 0,
    `lifetimePoints` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_referralCode_key`(`referralCode`),
    INDEX `User_referredById_idx`(`referredById`),
    INDEX `User_role_createdAt_idx`(`role`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `type` ENUM('PHYSIOTHERAPY', 'EMS', 'IV_THERAPY', 'CUPPING', 'LYMPHATIC_DRAINAGE', 'WOMENS_HEALTH', 'PSYCHIATRY', 'NUTRITION', 'OTHER') NOT NULL,
    `branch` ENUM('SHEIKH_ZAYED', 'ALMAZA_BAY') NOT NULL DEFAULT 'SHEIKH_ZAYED',
    `title` VARCHAR(120) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 60,
    `practitioner` VARCHAR(120) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `notes` TEXT NULL,
    `isComplimentary` BOOLEAN NOT NULL DEFAULT false,
    `pointsAwardedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Session_patientId_startsAt_idx`(`patientId`, `startsAt`),
    INDEX `Session_status_startsAt_idx`(`status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Update` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('ANNOUNCEMENT', 'PLATFORM_UPDATE', 'HEALTH_TIP') NOT NULL DEFAULT 'ANNOUNCEMENT',
    `title` VARCHAR(160) NOT NULL,
    `body` TEXT NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `authorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Update_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoyaltyTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL,
    `reason` ENUM('REFERRAL_BONUS', 'WELCOME_BONUS', 'SESSION_ATTENDED', 'MANUAL_ADJUSTMENT', 'REWARD_REDEMPTION') NOT NULL,
    `note` VARCHAR(255) NULL,
    `referenceId` VARCHAR(32) NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoyaltyTransaction_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `LoyaltyTransaction_reason_idx`(`reason`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Update` ADD CONSTRAINT `Update_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoyaltyTransaction` ADD CONSTRAINT `LoyaltyTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoyaltyTransaction` ADD CONSTRAINT `LoyaltyTransaction_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
