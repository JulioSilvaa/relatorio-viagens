import type { AdvanceStatus as PrismaAdvanceStatus } from '@prisma/client';
import type { AdvanceStatusValue, TripAdvanceRecord } from './finance.types.js';
import { toCents } from './finance.utils.js';

function money(value: { toString(): string }): string {
  return (toCents(value.toString()) / 100).toFixed(2);
}

export interface AdvanceRowShape {
  id: string;
  tripId: string;
  status: PrismaAdvanceStatus;
  solicitadoPor: { id: string; name: string };
  valorSolicitado: { toString(): string };
  justificativaSolicitacao: string;
  valorAprovado: { toString(): string } | null;
  aprovadoPor: { id: string; name: string } | null;
  aprovadoEm: Date | null;
  justificativaAnalise: string | null;
  pagoPor: { id: string; name: string } | null;
  pagoEm: Date | null;
  observacoesPagamento: string | null;
  solicitadoEm: Date;
  atualizadoEm: Date;
}

export function toAdvanceRecord(row: AdvanceRowShape): TripAdvanceRecord {
  return {
    id: row.id,
    tripId: row.tripId,
    status: row.status as AdvanceStatusValue,
    solicitadoPor: row.solicitadoPor,
    valorSolicitado: money(row.valorSolicitado),
    justificativaSolicitacao: row.justificativaSolicitacao,
    valorAprovado: row.valorAprovado ? money(row.valorAprovado) : null,
    aprovadoPor: row.aprovadoPor,
    aprovadoEm: row.aprovadoEm,
    justificativaAnalise: row.justificativaAnalise,
    pagoPor: row.pagoPor,
    pagoEm: row.pagoEm,
    observacoesPagamento: row.observacoesPagamento,
    solicitadoEm: row.solicitadoEm,
    atualizadoEm: row.atualizadoEm,
  };
}
