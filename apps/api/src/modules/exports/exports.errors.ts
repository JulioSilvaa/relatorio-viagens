import { AppError } from '../../shared/errors/app-error.js';

export class ExportForbiddenError extends AppError {
  constructor() {
    super(403, 'EXPORT_FORBIDDEN', 'Sem permissão para exportar estes dados.');
  }
}
