import { AppError } from '../../shared/errors/app-error.js';

export class ReportForbiddenError extends AppError {
  constructor() {
    super(403, 'RELATORIO_FORBIDDEN', 'Você não tem permissão para consultar este relatório.');
  }
}
