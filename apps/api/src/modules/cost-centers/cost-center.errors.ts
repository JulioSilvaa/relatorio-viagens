import { AppError } from '../../shared/errors/app-error.js';

export class CostCenterConfigNotFoundError extends AppError {
  constructor() {
    super(404, 'COST_CENTER_NOT_FOUND', 'Centro de custo não encontrado.');
  }
}

export class CostCenterExistsError extends AppError {
  constructor() {
    super(409, 'COST_CENTER_EXISTS', 'Já existe centro de custo com este nome.');
  }
}
