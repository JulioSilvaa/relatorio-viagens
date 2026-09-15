-- AlterTable
ALTER TABLE "ReceiptOcr" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "confidence" DECIMAL(5,4),
ADD COLUMN     "engine" TEXT,
ADD COLUMN     "processingMs" INTEGER;
