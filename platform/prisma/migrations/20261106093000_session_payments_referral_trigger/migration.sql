-- AlterTable
ALTER TABLE `LoyaltySettings` MODIFY `referralTrigger` ENUM('REGISTRATION', 'FIRST_SESSION', 'FIRST_PAYMENT') NOT NULL DEFAULT 'FIRST_PAYMENT';

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `amountPaid` INTEGER NULL,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paymentMethod` ENUM('CASH', 'CARD', 'INSTAPAY', 'BANK_TRANSFER', 'OTHER') NULL;

-- CreateIndex
CREATE INDEX `Session_paidAt_idx` ON `Session`(`paidAt`);


-- Referrals now count once the referred patient has paid for a first session.
-- The existing settings row still carries the previous default; move it over.
UPDATE `LoyaltySettings` SET `referralTrigger` = 'FIRST_PAYMENT' WHERE `id` = 1 AND `referralTrigger` = 'FIRST_SESSION';
