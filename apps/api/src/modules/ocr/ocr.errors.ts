import { AppError } from '../../shared/errors/app-error.js';

export class OcrReceiptNotFoundError extends AppError {
  constructor() {
    super(404, 'RECEIPT_NOT_FOUND', 'Comprovante não encontrado.');
  }
}

export class OcrForbiddenError extends AppError {
  constructor() {
    super(403, 'OCR_FORBIDDEN', 'Sem permissão para operar dados do OCR.');
  }
}

export class OcrReceiptNotEditableError extends AppError {
  constructor() {
    super(409, 'OCR_RECEIPT_NOT_EDITABLE', 'Os dados do comprovante só podem ser alterados quando a viagem estiver em correção.');
  }
}
