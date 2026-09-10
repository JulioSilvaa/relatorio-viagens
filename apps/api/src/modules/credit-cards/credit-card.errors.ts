import { AppError } from '../../shared/errors/app-error.js';

export class CreditCardNotFoundError extends AppError {
  constructor() {
    super(404, 'CREDIT_CARD_NOT_FOUND', 'Cartão corporativo não encontrado.');
  }
}

export class CreditCardInactiveError extends AppError {
  constructor() {
    super(409, 'CREDIT_CARD_INACTIVE', 'O cartão corporativo está inativo.');
  }
}

export class CreditCardEncryptionNotConfiguredError extends AppError {
  constructor() {
    super(
      503,
      'CREDIT_CARD_ENCRYPTION_NOT_CONFIGURED',
      'A chave segura dos cartões não está configurada.',
    );
  }
}
