import { AppError } from '../../shared/errors/app-error.js';

export class FinanceTripNotReceivedError extends AppError {
  constructor() {
    super(409, 'FINANCE_TRIP_NOT_RECEIVED', 'Relatório precisa ser recebido pelo Financeiro.');
  }
}

export class FinancePaymentValueMismatchError extends AppError {
  constructor() {
    super(409, 'FINANCE_PAYMENT_VALUE_MISMATCH', 'Valor do pagamento difere do valor aprovado.');
  }
}

export class FinanceTripNotApprovedError extends AppError {
  constructor() {
    super(409, 'FINANCE_TRIP_NOT_APPROVED', 'Relatório ainda não aprovado.');
  }
}

export class FinanceForbiddenError extends AppError {
  constructor() {
    super(403, 'FINANCE_FORBIDDEN', 'Sem permissão para acessar dados financeiros da viagem.');
  }
}
