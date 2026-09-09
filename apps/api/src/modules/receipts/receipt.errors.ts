import { AppError } from '../../shared/errors/app-error.js';

export class ReceiptNotFoundError extends AppError {
  constructor() {
    super(404, 'RECEIPT_NOT_FOUND', 'Comprovante não encontrado.');
  }
}

export class ReceiptExpenseNotFoundError extends AppError {
  constructor() {
    super(404, 'RECEIPT_EXPENSE_NOT_FOUND', 'Despesa não encontrada.');
  }
}

export class ReceiptForbiddenError extends AppError {
  constructor() {
    super(403, 'RECEIPT_FORBIDDEN', 'Sem autorização para este comprovante.');
  }
}

export class ReceiptNotActiveError extends AppError {
  constructor() {
    super(409, 'RECEIPT_NOT_ACTIVE', 'Comprovante inativo não pode ser substituído.');
  }
}
