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
