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
