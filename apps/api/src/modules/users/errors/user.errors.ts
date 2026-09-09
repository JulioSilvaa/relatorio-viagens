import { AppError } from '../../../shared/errors/app-error.js';

export class UserAlreadyExistsError extends AppError {
  constructor() {
    super(409, 'USER_EMAIL_ALREADY_EXISTS', 'E-mail já cadastrado.');
  }
}

export class RoleNotFoundError extends AppError {
  constructor() {
    super(422, 'USER_ROLE_NOT_FOUND', 'Perfil de acesso não encontrado.');
  }
}

export class ManagerNotFoundError extends AppError {
  constructor() {
    super(422, 'USER_MANAGER_NOT_FOUND', 'Gestor responsável não encontrado.');
  }
}
