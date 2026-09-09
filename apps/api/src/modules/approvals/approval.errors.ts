import { AppError } from '../../shared/errors/app-error.js';

export class ReportNotInApprovalError extends AppError {
  constructor() {
    super(409, 'REPORT_NOT_IN_APPROVAL', 'Relatório não está em aprovação.');
  }
}

export class ReportJustificationRequiredError extends AppError {
  constructor() {
    super(400, 'REPORT_JUSTIFICATION_REQUIRED', 'Justificativa é obrigatória.');
  }
}

export class ChangeReimbursabilityExpenseNotFoundError extends AppError {
  constructor() {
    super(404, 'EXPENSE_NOT_FOUND', 'Despesa não encontrada.');
  }
}
