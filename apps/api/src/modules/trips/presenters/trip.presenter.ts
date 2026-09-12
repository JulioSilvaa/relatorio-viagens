import type {
  ExpenseDetailRecord,
  TripDetailRecord,
  TripParticipantRecord,
  TripRecord,
} from '../repositories/trips.repository.js';
import type {
  TripDetailView,
  TripExpenseView,
  TripParticipantView,
  TripReceiptView,
  TripView,
} from '../trip.types.js';

export function tripToView(trip: TripRecord): TripView {
  return {
    id: trip.id,
    cliente: trip.cliente,
    cidade: trip.cidade,
    uf: trip.uf,
    dataSaida: trip.dataSaida,
    dataRetorno: trip.dataRetorno,
    departamento: trip.departamento,
    motivo: trip.motivo,
    veiculo: trip.veiculo,
    placa: trip.placa,
    tipoVeiculo: trip.tipoVeiculo,
    kmInicial: trip.kmInicial,
    kmFinal: trip.kmFinal,
    taxaKm: trip.taxaKm,
    centroDeCustoId: trip.centroDeCustoId,
    observacoes: trip.observacoes,
    status: trip.status,
    motivoCancelamento: trip.motivoCancelamento,
    criadoPor: trip.criadoPor,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

export function participantToView(participant: TripParticipantRecord): TripParticipantView {
  return {
    userId: participant.userId,
    name: participant.name,
    addedAt: participant.addedAt,
    cartaoLast4: participant.cartaoLast4,
    cartaoBandeira: participant.cartaoBandeira,
  };
}

export function expenseToView(expense: ExpenseDetailRecord): TripExpenseView {
  return {
    id: expense.id,
    category: expense.category,
    valor: expense.valor,
    dataDespesa: expense.dataDespesa,
    reembolsavel: expense.reembolsavel,
    justificativa: expense.justificativa,
    alertaExcesso: expense.alertaExcesso,
    criadoPor: expense.criadoPor,
    receipts: expense.receipts.map(receiptToView),
  };
}

export function receiptToView(receipt: ExpenseDetailRecord['receipts'][number]): TripReceiptView {
  return {
    id: receipt.id,
    tipo: receipt.tipo as TripReceiptView['tipo'],
    fileName: receipt.fileName,
    fileType: receipt.fileType,
    fileSize: receipt.fileSize,
    ativo: receipt.ativo,
    createdAt: receipt.createdAt,
    ocr: receipt.ocr
      ? {
        status: receipt.ocr.status,
        origem: receipt.ocr.origem,
        cnpj: receipt.ocr.cnpj,
        nomeEstabelecimento: receipt.ocr.nomeEstabelecimento,
        data: receipt.ocr.data ? receipt.ocr.data.toISOString() : null,
        hora: receipt.ocr.hora,
        valorTotal: receipt.ocr.valorTotal,
        numeroDocumento: receipt.ocr.numeroDocumento,
        chaveAcesso: receipt.ocr.chaveAcesso,
        itens: receipt.ocr.itens,
        erro: receipt.ocr.erro,
        extraidoEm: receipt.ocr.extraidoEm ? receipt.ocr.extraidoEm.toISOString() : null,
        conferidoPor: receipt.ocr.conferidoPor,
        conferidoEm: receipt.ocr.conferidoEm ? receipt.ocr.conferidoEm.toISOString() : null,
      }
      : null,
  };
}

export function tripDetailToView(trip: TripDetailRecord): TripDetailView {
  return {
    ...tripToView(trip),
    participants: trip.participants.map(participantToView),
    despesas: trip.expenses?.map(expenseToView) ?? [],
    adiantamento: trip.adiantamento,
  };
}
