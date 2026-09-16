import { describe, expect, it } from 'vitest';
import { buildReportData } from '../../src/modules/reports/report.data.js';
import type {
  ExpenseDetailRecord,
  ReceiptDetailRecord,
  TripDetailRecord,
} from '../../src/modules/trips/repositories/trips.repository.js';

function fakeReceipt(overrides: Partial<ReceiptDetailRecord>): ReceiptDetailRecord {
  return {
    id: 'receipt-1',
    fileHash: 'same-hash',
    tipo: 'NOTA_FISCAL',
    fileName: 'comprovante.jpg',
    fileType: 'image/jpeg',
    fileSize: 1000,
    ativo: true,
    createdAt: new Date('2026-09-10T12:00:00Z'),
    ocr: null,
    ...overrides,
  };
}

function fakeExpense(overrides: Partial<ExpenseDetailRecord>): ExpenseDetailRecord {
  return {
    id: 'expense-1',
    category: { id: 'cat-1', code: 'COMBUSTIVEL', name: 'Combustível' },
    valor: '100.00',
    dataDespesa: new Date('2026-09-10T12:00:00Z'),
    reembolsavel: true,
    justificativa: 'Teste',
    alertaExcesso: null,
    deletedAt: null,
    criadoPor: { id: 'user-1', name: 'Usuário Teste' },
    receipts: [],
    ...overrides,
  };
}

function fakeTrip(expenses: ExpenseDetailRecord[]): TripDetailRecord {
  return {
    id: 'trip-1',
    companyId: 'company-1',
    cliente: 'Cliente Teste',
    cidade: 'São Paulo',
    uf: 'SP',
    dataSaida: new Date('2026-09-10T12:00:00Z'),
    dataRetorno: new Date('2026-09-12T12:00:00Z'),
    departamento: 'COMERCIAL',
    motivo: 'Teste',
    veiculo: null,
    placa: null,
    tipoVeiculo: null,
    kmInicial: null,
    kmFinal: null,
    taxaKm: null,
    centroDeCustoId: null,
    centroDeCusto: null,
    observacoes: null,
    status: 'APROVADA',
    motivoCancelamento: null,
    criadoPorId: 'user-1',
    deletadoEm: null,
    createdAt: new Date('2026-09-10T12:00:00Z'),
    updatedAt: new Date('2026-09-10T12:00:00Z'),
    criadoPor: { id: 'user-1', name: 'Usuário Teste' },
    participants: [],
    expenses,
    adiantamento: null,
  };
}

describe('buildReportData — comprovantes com o mesmo arquivo (fileHash) em despesas diferentes', () => {
  it('não descarta o comprovante de uma segunda despesa só porque o arquivo é idêntico ao de outra', () => {
    const receiptFalha = fakeReceipt({
      id: 'receipt-falha',
      fileHash: 'same-hash',
      ocr: {
        status: 'FALHA',
        textoOriginal: null,
        origem: 'MANUAL',
        cnpj: null,
        nomeEstabelecimento: null,
        data: null,
        hora: null,
        valorTotal: null,
        valorProdutos: null,
        desconto: null,
        tributos: null,
        numeroDocumento: null,
        serie: null,
        inscricaoEstadual: null,
        emitente: null,
        destinatario: null,
        formaPagamento: null,
        protocoloAutorizacao: null,
        chaveAcesso: null,
        itens: null,
        erro: 'ocr_insuficiente',
        extraidoEm: new Date('2026-09-10T12:00:00Z'),
        conferidoPor: null,
        conferidoEm: null,
        dadosOriginais: null,
      },
    });
    const receiptSucesso = fakeReceipt({
      id: 'receipt-sucesso',
      fileHash: 'same-hash',
      ocr: {
        status: 'SUCESSO',
        textoOriginal: 'AUTO POSTO BONANZA ... TOTAL 269,49',
        origem: 'OCR',
        cnpj: null,
        nomeEstabelecimento: 'AUTO POSTO BONANZA',
        data: null,
        hora: null,
        valorTotal: '269.49',
        valorProdutos: null,
        desconto: null,
        tributos: null,
        numeroDocumento: null,
        serie: null,
        inscricaoEstadual: null,
        emitente: null,
        destinatario: null,
        formaPagamento: null,
        protocoloAutorizacao: null,
        chaveAcesso: '50230507954477000155650090003515121821406523',
        itens: [],
        erro: null,
        extraidoEm: new Date('2026-09-10T12:05:00Z'),
        conferidoPor: null,
        conferidoEm: null,
        dadosOriginais: null,
      },
    });

    const expenseFalha = fakeExpense({
      id: 'expense-combustivel',
      category: { id: 'cat-1', code: 'COMBUSTIVEL', name: 'Combustível' },
      receipts: [receiptFalha],
    });
    const expenseSucesso = fakeExpense({
      id: 'expense-outros',
      category: { id: 'cat-2', code: 'OUTROS', name: 'Outros' },
      receipts: [receiptSucesso],
    });

    const trip = fakeTrip([expenseFalha, expenseSucesso]);

    const data = buildReportData(trip, undefined, 'Emissor Teste');

    expect(data.ocrDetalhes).toHaveLength(2);
    expect(data.ocrDetalhes.map((item) => item.receiptId).sort()).toEqual(
      ['receipt-falha', 'receipt-sucesso'].sort(),
    );
    expect(data.ocr.totalComprovantes).toBe(2);
    expect(data.ocr.comOcr).toBe(1);
    expect(data.ocr.falhas).toBe(1);
  });
});
