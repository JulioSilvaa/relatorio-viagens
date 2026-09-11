import { AppError } from '../../shared/errors/app-error.js';

export class ReportForbiddenError extends AppError {
  constructor() {
    super(403, 'RELATORIO_FORBIDDEN', 'Você não tem permissão para consultar este relatório.');
  }
}

export class ReportNotApprovedError extends AppError {
  constructor() {
    super(
      422,
      'RELATORIO_NAO_APROVADO',
      'O relatório oficial só pode ser emitido após a aprovação da viagem.',
    );
  }
}
