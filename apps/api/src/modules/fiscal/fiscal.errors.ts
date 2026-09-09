import { AppError } from '../../shared/errors/app-error.js';

export class FiscalForbiddenError extends AppError {
  constructor() {
    super(403, 'FISCAL_FORBIDDEN', 'Sem permissão para acessar a despesa.');
  }
}
