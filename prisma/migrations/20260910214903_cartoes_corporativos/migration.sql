-- AlterTable
ALTER TABLE "TripParticipant" ADD COLUMN     "creditCardId" UUID;

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" UUID NOT NULL,
    "cardholderName" TEXT NOT NULL,
    "encryptedCardNumber" TEXT NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "brand" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditCard_active_idx" ON "CreditCard"("active");

-- CreateIndex
CREATE INDEX "CreditCard_deletedAt_idx" ON "CreditCard"("deletedAt");

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
