import { AppError } from '../../shared/errors/app-error.js';

export class DashboardForbiddenError extends AppError {
  constructor() {
    super(403, 'DASHBOARD_FORBIDDEN', 'Sem permissão para o dashboard gerencial.');
  }
}
