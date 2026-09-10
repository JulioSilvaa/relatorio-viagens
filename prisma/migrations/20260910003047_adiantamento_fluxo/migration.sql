/*
  Warnings:

  - You are about to drop the column `createdAt` on the `TripAdvance` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `TripAdvance` table. All the data in the column will be lost.
  - You are about to drop the column `observacoes` on the `TripAdvance` table. All the data in the column will be lost.
  - You are about to drop the column `registradoPorId` on the `TripAdvance` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `TripAdvance` table. All the data in the column will be lost.
  - Added the required column `atualizadoEm` to the `TripAdvance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `justificativaSolicitacao` to the `TripAdvance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `solicitadoPorId` to the `TripAdvance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorSolicitado` to the `TripAdvance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('SOLICITADO', 'EM_ANALISE', 'APROVADO', 'RECUSADO', 'PAGAMENTO_PENDENTE', 'PAGO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'ADIANTAMENTO_SOLICITADO';
ALTER TYPE "NotificationEventType" ADD VALUE 'ADIANTAMENTO_APROVADO';
ALTER TYPE "NotificationEventType" ADD VALUE 'ADIANTAMENTO_RECUSADO';
ALTER TYPE "NotificationEventType" ADD VALUE 'ADIANTAMENTO_PAGO';

-- DropForeignKey
ALTER TABLE "TripAdvance" DROP CONSTRAINT "TripAdvance_registradoPorId_fkey";

-- AlterTable
ALTER TABLE "TripAdvance" DROP COLUMN "createdAt",
DROP COLUMN "data",
DROP COLUMN "observacoes",
DROP COLUMN "registradoPorId",
DROP COLUMN "valor",
ADD COLUMN     "aprovadoEm" TIMESTAMP(3),
ADD COLUMN     "aprovadoPorId" UUID,
ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "justificativaAnalise" TEXT,
ADD COLUMN     "justificativaSolicitacao" TEXT NOT NULL,
ADD COLUMN     "observacoesPagamento" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3),
ADD COLUMN     "pagoPorId" UUID,
ADD COLUMN     "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "solicitadoPorId" UUID NOT NULL,
ADD COLUMN     "status" "AdvanceStatus" NOT NULL DEFAULT 'SOLICITADO',
ADD COLUMN     "valorAprovado" DECIMAL(12,2),
ADD COLUMN     "valorSolicitado" DECIMAL(12,2) NOT NULL;

-- CreateIndex
CREATE INDEX "TripAdvance_status_idx" ON "TripAdvance"("status");

-- AddForeignKey
ALTER TABLE "TripAdvance" ADD CONSTRAINT "TripAdvance_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripAdvance" ADD CONSTRAINT "TripAdvance_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripAdvance" ADD CONSTRAINT "TripAdvance_pagoPorId_fkey" FOREIGN KEY ("pagoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
