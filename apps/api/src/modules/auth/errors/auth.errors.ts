import { AppError } from '../../../shared/errors/app-error.js';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'AUTH_INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }
}

export class UserInactiveError extends AppError {
  constructor() {
    super(401, 'AUTH_USER_INACTIVE', 'Usuário inativo.');
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super(404, 'AUTH_USER_NOT_FOUND', 'Usuário não encontrado.');
  }
}

export class InviteInvalidError extends AppError {
  constructor() {
    super(400, 'INVITE_INVALID', 'Convite inválido.');
  }
}

export class InviteUsedError extends AppError {
  constructor() {
    super(400, 'INVITE_ALREADY_USED', 'Convite já utilizado.');
  }
}

export class InviteExpiredError extends AppError {
  constructor() {
    super(400, 'INVITE_EXPIRED', 'Convite expirado.');
  }
}

export class PasswordAlreadyDefinedError extends AppError {
  constructor() {
    super(400, 'PASSWORD_ALREADY_DEFINED', 'Senha já definida para este usuário.');
  }
}

export class ResetTokenInvalidError extends AppError {
  constructor() {
    super(400, 'RESET_TOKEN_INVALID', 'Token de recuperação inválido.');
  }
}

export class ResetTokenUsedError extends AppError {
  constructor() {
    super(400, 'RESET_TOKEN_ALREADY_USED', 'Token de recuperação já utilizado.');
  }
}

export class ResetTokenExpiredError extends AppError {
  constructor() {
    super(400, 'RESET_TOKEN_EXPIRED', 'Token de recuperação expirado.');
  }
}
