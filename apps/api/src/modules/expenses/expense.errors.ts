import { AppError } from '../../shared/errors/app-error.js';

export class ExpenseInvalidValueError extends AppError {
  constructor() {
    super(422, 'EXPENSE_INVALID_VALUE', 'Valor deve ser maior que zero.');
  }
}

export class ExpenseTripNotFoundError extends AppError {
  constructor() {
    super(404, 'EXPENSE_TRIP_NOT_FOUND', 'Viagem não encontrada.');
  }
}

export class ExpenseTripNotEditableError extends AppError {
  constructor() {
    super(409, 'EXPENSE_TRIP_NOT_EDITABLE', 'Viagem não está em estado de lançamento de despesas.');
  }
}

export class ExpenseForbiddenError extends AppError {
  constructor() {
    super(403, 'EXPENSE_FORBIDDEN', 'Sem autorização para esta despesa.');
  }
}

export class ExpenseReceiptRequiredError extends AppError {
  constructor() {
    super(400, 'EXPENSE_RECEIPT_REQUIRED', 'Toda despesa deve possuir ao menos um comprovante.');
  }
}

export class ExpenseCategoryNotFoundError extends AppError {
  constructor() {
    super(422, 'EXPENSE_CATEGORY_NOT_FOUND', 'Categoria de despesa não encontrada.');
  }
}

export class ExpenseCategoryInactiveError extends AppError {
  constructor() {
    super(409, 'EXPENSE_CATEGORY_INACTIVE', 'Categoria indisponível para novos lançamentos.');
  }
}

export class ExpenseKmDataMissingError extends AppError {
  constructor() {
    super(
      400,
      'EXPENSE_KM_DATA_MISSING',
      'Reembolso por KM exige veículo próprio com KM inicial/final e taxa vigente na viagem.',
    );
  }
}

export class ExpenseNotFoundError extends AppError {
  constructor() {
    super(404, 'EXPENSE_NOT_FOUND', 'Despesa não encontrada.');
  }
}

export class ExpenseForbiddenEditError extends AppError {
  constructor() {
    super(403, 'EXPENSE_FORBIDDEN_EDIT', 'Somente o autor da despesa pode editá-la.');
  }
}

export class ExpenseForbiddenDeleteError extends AppError {
  constructor() {
    super(403, 'EXPENSE_FORBIDDEN_DELETE', 'Somente o autor da despesa pode excluí-la.');
  }
}

export class ExpenseNotDeletableError extends AppError {
  constructor() {
    super(
      409,
      'EXPENSE_NOT_DELETABLE',
      'Somente despesas de viagens em andamento podem ser excluídas.',
    );
  }
}

export class ExpenseCategoryExistsError extends AppError {
  constructor() {
    super(409, 'EXPENSE_CATEGORY_EXISTS', 'Já existe categoria com este código.');
  }
}

export class ExpenseCategoryNotFoundForConfigError extends AppError {
  constructor() {
    super(404, 'EXPENSE_CATEGORY_NOT_FOUND', 'Categoria de despesa não encontrada.');
  }
}
