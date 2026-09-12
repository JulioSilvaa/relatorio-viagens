import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database.js';
import type { ReceiptOcrRecord, ReceiptOcrRepository, SaveReceiptOcrData } from '../ocr.types.js';

interface PrismaReceiptOcrRow {
  receiptId: string;
  status: string;
  origem: string;
  cnpj: string | null;
  nomeEstabelecimento: string | null;
  data: Date | null;
  hora: string | null;
  valorTotal: Prisma.Decimal | null;
  numeroDocumento: string | null;
  chaveAcesso: string | null;
  itens: Prisma.JsonValue | null;
  dadosOriginais: Prisma.JsonValue | null;
  erro: string | null;
  extraidoEm: Date | null;
  conferidoPorId: string | null;
  conferidoPor: { id: string; name: string } | null;
  conferidoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OCR_INCLUDE = { conferidoPor: { select: { id: true, name: true } } } as const;

function toRecord(row: PrismaReceiptOcrRow): ReceiptOcrRecord {
  return {
    receiptId: row.receiptId,
    status: row.status as ReceiptOcrRecord['status'],
    origem: row.origem as ReceiptOcrRecord['origem'],
    cnpj: row.cnpj,
    nomeEstabelecimento: row.nomeEstabelecimento,
    data: row.data,
    hora: row.hora,
    valorTotal: row.valorTotal ? row.valorTotal.toFixed(2) : null,
    numeroDocumento: row.numeroDocumento,
    chaveAcesso: row.chaveAcesso,
    itens: Array.isArray(row.itens) ? (row.itens as unknown[]) : null,
    dadosOriginais: row.dadosOriginais && typeof row.dadosOriginais === 'object'
      ? (row.dadosOriginais as ReceiptOcrRecord['dadosOriginais'])
      : null,
    erro: row.erro,
    extraidoEm: row.extraidoEm,
    conferidoPorId: row.conferidoPorId,
    conferidoPor: row.conferidoPor,
    conferidoEm: row.conferidoEm,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return (value ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue;
}

function text(value: string | null | undefined): string | null {
  return value ?? null;
}

type StoredReceiptOcrRow = NonNullable<Awaited<ReturnType<typeof prisma.receiptOcr.findUnique>>>;

function fillOnlyNulls(
  existing: StoredReceiptOcrRow,
  data: SaveReceiptOcrData,
): Prisma.ReceiptOcrUncheckedUpdateInput {
  const fill: Prisma.ReceiptOcrUncheckedUpdateInput = {};
  if (existing.cnpj === null && data.cnpj !== undefined) fill.cnpj = text(data.cnpj);
  if (existing.nomeEstabelecimento === null && data.nomeEstabelecimento !== undefined)
    fill.nomeEstabelecimento = text(data.nomeEstabelecimento);
  if (existing.data === null && data.data !== undefined) fill.data = data.data;
  if (existing.hora === null && data.hora !== undefined) fill.hora = text(data.hora);
  if (existing.valorTotal === null && data.valorTotal !== undefined)
    fill.valorTotal = text(data.valorTotal);
  if (existing.numeroDocumento === null && data.numeroDocumento !== undefined)
    fill.numeroDocumento = text(data.numeroDocumento);
  if (existing.chaveAcesso === null && data.chaveAcesso !== undefined)
    fill.chaveAcesso = text(data.chaveAcesso);
  if (existing.itens === null && data.itens !== undefined) fill.itens = jsonValue(data.itens);
  if (existing.erro === null && data.erro !== undefined) fill.erro = text(data.erro);
  return fill;
}

function toUnchecked(data: SaveReceiptOcrData): Prisma.ReceiptOcrUncheckedUpdateInput {
  const fields: Prisma.ReceiptOcrUncheckedUpdateInput = {};
  if (data.status !== undefined) fields.status = data.status;
  if (data.origem !== undefined) fields.origem = data.origem;
  if (data.cnpj !== undefined) fields.cnpj = text(data.cnpj);
  if (data.nomeEstabelecimento !== undefined)
    fields.nomeEstabelecimento = text(data.nomeEstabelecimento);
  if (data.data !== undefined) fields.data = data.data;
  if (data.hora !== undefined) fields.hora = text(data.hora);
  if (data.valorTotal !== undefined) fields.valorTotal = text(data.valorTotal);
  if (data.numeroDocumento !== undefined) fields.numeroDocumento = text(data.numeroDocumento);
  if (data.chaveAcesso !== undefined) fields.chaveAcesso = text(data.chaveAcesso);
  if (data.itens !== undefined) fields.itens = jsonValue(data.itens);
  if (data.dadosOriginais !== undefined) fields.dadosOriginais = jsonValue(data.dadosOriginais);
  if (data.erro !== undefined) fields.erro = text(data.erro);
  return fields;
}

export class PrismaReceiptOcrRepository implements ReceiptOcrRepository {
  async findByReceipt(receiptId: string): Promise<ReceiptOcrRecord | null> {
    const row = await prisma.receiptOcr.findUnique({ where: { receiptId }, include: OCR_INCLUDE });
    return row ? toRecord(row) : null;
  }

  async saveExtraction(
    receiptId: string,
    data: SaveReceiptOcrData,
    extraidoEm: Date,
  ): Promise<ReceiptOcrRecord> {
    const existing = await prisma.receiptOcr.findUnique({ where: { receiptId } });
    if (existing) {
      const upgradeToSuccess = existing.status !== 'SUCESSO' && data.status === 'SUCESSO';
      const row = await prisma.receiptOcr.update({
        where: { receiptId },
        data: {
          ...(upgradeToSuccess
            ? { status: 'SUCESSO' as const, origem: data.origem ?? 'OCR' }
            : {}),
          ...fillOnlyNulls(existing, data),
          extraidoEm,
          ...(existing.dadosOriginais === null && data.dadosOriginais
            ? { dadosOriginais: jsonValue(data.dadosOriginais) }
            : {}),
        },
        include: OCR_INCLUDE,
      });
      return toRecord(row);
    }
    const row = await prisma.receiptOcr.create({
      data: {
        receiptId,
        status: data.status ?? 'PENDENTE',
        origem: data.origem ?? 'MANUAL',
        cnpj: text(data.cnpj),
        nomeEstabelecimento: text(data.nomeEstabelecimento),
        data: data.data ?? null,
        hora: text(data.hora),
        valorTotal: text(data.valorTotal),
        numeroDocumento: text(data.numeroDocumento),
        chaveAcesso: text(data.chaveAcesso),
        itens: jsonValue(data.itens),
        dadosOriginais: jsonValue(data.dadosOriginais),
        erro: text(data.erro),
        extraidoEm,
      },
      include: OCR_INCLUDE,
    });
    return toRecord(row);
  }

  async confirm(
    receiptId: string,
    data: SaveReceiptOcrData,
    conferidoPorId: string,
  ): Promise<ReceiptOcrRecord> {
    const ensure = {
      receiptId,
      status: 'SUCESSO' as const,
      origem: data.origem ?? 'MANUAL',
      cnpj: text(data.cnpj),
      nomeEstabelecimento: text(data.nomeEstabelecimento),
      data: data.data ?? null,
      hora: text(data.hora),
      valorTotal: text(data.valorTotal),
      numeroDocumento: text(data.numeroDocumento),
      chaveAcesso: text(data.chaveAcesso),
      itens: jsonValue(data.itens),
      erro: text(data.erro),
      extraidoEm: new Date(),
    };
    const existing = await prisma.receiptOcr.findUnique({ where: { receiptId } });
    const row = existing
      ? await prisma.receiptOcr.update({
        where: { receiptId },
        data: {
          ...toUnchecked(data),
          status: 'SUCESSO',
          conferidoPorId,
          conferidoEm: new Date(),
        },
        include: OCR_INCLUDE,
      })
      : await prisma.receiptOcr.create({
        data: { ...ensure, conferidoPorId, conferidoEm: new Date() },
        include: OCR_INCLUDE,
      });
    return toRecord(row);
  }
}
