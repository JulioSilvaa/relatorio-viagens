import { AppError } from '../../shared/errors/app-error.js';

export class TripNotFoundError extends AppError {
  constructor() {
    super(404, 'TRIP_NOT_FOUND', 'Viagem não encontrada.');
  }
}

export class TripInvalidDatesError extends AppError {
  constructor() {
    super(400, 'TRIP_INVALID_DATES', 'Data de retorno não pode ser anterior à data de saída.');
  }
}

export class TripInvalidKmsError extends AppError {
  constructor() {
    super(400, 'TRIP_INVALID_KMS', 'KM final não pode ser menor que o KM inicial.');
  }
}

export class TripForbiddenEditError extends AppError {
  constructor() {
    super(
      403,
      'TRIP_FORBIDDEN_EDIT',
      'Somente o criador pode editar os dados principais da viagem.',
    );
  }
}

export class TripNotEditableError extends AppError {
  constructor() {
    super(409, 'TRIP_NOT_EDITABLE', 'Viagem entregue não aceita mais edições.');
  }
}

export class TripParticipantNotFoundError extends AppError {
  constructor() {
    super(404, 'TRIP_PARTICIPANT_USER_NOT_FOUND', 'Colaborador não encontrado.');
  }
}

export class TripParticipantExistsError extends AppError {
  constructor() {
    super(409, 'TRIP_PARTICIPANT_EXISTS', 'Colaborador já participa desta viagem.');
  }
}

export class TripParticipantForbiddenError extends AppError {
  constructor() {
    super(
      403,
      'TRIP_PARTICIPANT_FORBIDDEN',
      'Somente o criador ou o gestor administra participantes.',
    );
  }
}

export class TripRemoveCreatorError extends AppError {
  constructor() {
    super(409, 'TRIP_REMOVE_CREATOR', 'O criador não pode ser removido da viagem.');
  }
}

export class TripReportIncompleteError extends AppError {
  constructor(readonly pending: string[]) {
    super(400, 'TRIP_REPORT_INCOMPLETE', 'Relatório incompleto: há itens pendentes.');
  }
}

export class TripNotDeliverableError extends AppError {
  constructor() {
    super(409, 'TRIP_NOT_DELIVERABLE', 'Viagem não está em estado de entrega.');
  }
}

export class TripCancelReasonRequiredError extends AppError {
  constructor() {
    super(
      400,
      'TRIP_CANCEL_REASON_REQUIRED',
      'Para cancelar a viagem é preciso informar o motivo.',
    );
  }
}

export class TripForbiddenCancelError extends AppError {
  constructor() {
    super(403, 'TRIP_FORBIDDEN_CANCEL', 'Sem autorização para cancelar esta viagem.');
  }
}

export class TripNotCancelableError extends AppError {
  constructor() {
    super(409, 'TRIP_NOT_CANCELABLE', 'Viagem não está em estado de cancelamento.');
  }
}

export class TripNotDeletableError extends AppError {
  constructor() {
    super(409, 'TRIP_NOT_DELETABLE', 'Somente viagens em andamento podem ser excluídas.');
  }
}

export class TripForbiddenViewError extends AppError {
  constructor() {
    super(403, 'TRIP_FORBIDDEN_VIEW', 'Você não participa desta viagem.');
  }
}

export class TripForbiddenDeleteError extends AppError {
  constructor() {
    super(403, 'TRIP_FORBIDDEN_DELETE', 'Somente o criador pode excluir a viagem.');
  }
}

export class CostCenterNotFoundError extends AppError {
  constructor() {
    super(422, 'TRIP_COST_CENTER_NOT_FOUND', 'Centro de custo não encontrado.');
  }
}
