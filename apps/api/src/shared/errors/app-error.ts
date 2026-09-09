export interface ErrorFields {
  [field: string]: string | undefined;
}

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly fields?: ErrorFields,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
