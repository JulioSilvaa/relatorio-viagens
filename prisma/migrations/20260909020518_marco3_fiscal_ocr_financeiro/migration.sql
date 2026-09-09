-- CreateEnum
CREATE TYPE "FiscalValidationStatus" AS ENUM ('PENDENTE', 'VALIDO', 'PROBLEMA');

-- CreateEnum
CREATE TYPE "OcrProcessingStatus" AS ENUM ('PENDENTE', 'SUCESSO', 'FALHA');

-- CreateEnum
CREATE TYPE "OcrSourceType" AS ENUM ('OCR', 'MANUAL');

-- CreateTable
CREATE TABLE "ReceiptOcr" (
    "id" UUID NOT NULL,
    "receiptId" UUID NOT NULL,
    "status" "OcrProcessingStatus" NOT NULL DEFAULT 'PENDENTE',
    "origem" "OcrSourceType" NOT NULL DEFAULT 'MANUAL',
    "cnpj" TEXT,
    "nomeEstabelecimento" TEXT,
    "data" TIMESTAMP(3),
    "hora" TEXT,
    "valorTotal" DECIMAL(12,2),
    "numeroDocumento" TEXT,
    "chaveAcesso" TEXT,
    "itens" JSONB,
    "erro" TEXT,
    "extraidoEm" TIMESTAMP(3),
    "conferidoPorId" UUID,
    "conferidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptOcr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalValidation" (
    "id" UUID NOT NULL,
    "expenseId" UUID NOT NULL,
    "status" "FiscalValidationStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivo" TEXT,
    "validatedById" UUID,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPayment" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "responsavelId" UUID NOT NULL,
    "comprovanteData" BYTEA,
    "comprovanteNome" TEXT,
    "comprovanteTipo" TEXT,
    "comprovanteTamanho" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripAdvance" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "registradoPorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRefund" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "metodoDePagamento" TEXT NOT NULL,
    "observacoes" TEXT,
    "comprovanteData" BYTEA,
    "comprovanteNome" TEXT,
    "comprovanteTipo" TEXT,
    "comprovanteTamanho" INTEGER,
    "registradoPorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptOcr_receiptId_key" ON "ReceiptOcr"("receiptId");

-- CreateIndex
CREATE INDEX "ReceiptOcr_receiptId_idx" ON "ReceiptOcr"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalValidation_expenseId_key" ON "FiscalValidation"("expenseId");

-- CreateIndex
CREATE INDEX "FiscalValidation_status_idx" ON "FiscalValidation"("status");

-- CreateIndex
CREATE INDEX "TripPayment_tripId_idx" ON "TripPayment"("tripId");

-- CreateIndex
CREATE INDEX "TripAdvance_tripId_idx" ON "TripAdvance"("tripId");

-- CreateIndex
CREATE INDEX "TripRefund_tripId_idx" ON "TripRefund"("tripId");

-- AddForeignKey
ALTER TABLE "ReceiptOcr" ADD CONSTRAINT "ReceiptOcr_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptOcr" ADD CONSTRAINT "ReceiptOcr_conferidoPorId_fkey" FOREIGN KEY ("conferidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalValidation" ADD CONSTRAINT "FiscalValidation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalValidation" ADD CONSTRAINT "FiscalValidation_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPayment" ADD CONSTRAINT "TripPayment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPayment" ADD CONSTRAINT "TripPayment_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripAdvance" ADD CONSTRAINT "TripAdvance_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripAdvance" ADD CONSTRAINT "TripAdvance_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRefund" ADD CONSTRAINT "TripRefund_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRefund" ADD CONSTRAINT "TripRefund_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
