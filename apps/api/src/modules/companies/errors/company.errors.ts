import { AppError } from '../../../shared/errors/app-error.js';

export class CnpjAlreadyUsedError extends AppError {
  constructor() {
    super(409, 'COMPANY_CNPJ_ALREADY_USED', 'CNPJ já cadastrado.');
  }
}
