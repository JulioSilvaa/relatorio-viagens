import { AppError } from './app-error.js';

export class TenantRequiredError extends AppError {
  constructor() {
    super(403, 'TENANT_REQUIRED', 'Sua conta não está vinculada a uma empresa.');
  }
}

export class ResourceNotFoundInCompanyError extends AppError {
  constructor() {
    super(404, 'RESOURCE_NOT_FOUND', 'Recurso não encontrado.');
  }
}
