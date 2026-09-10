import { AppError } from '../../shared/errors/app-error.js';

export function normalizeCreditCardNumber(value: string): string {
  const number = value.replace(/\D/g, '');
  if (number.length < 13 || number.length > 19 || !passesLuhn(number)) {
    throw new AppError(422, 'CREDIT_CARD_NUMBER_INVALID', 'Número de cartão inválido.');
  }
  return number;
}

export function creditCardBrand(number: string): string {
  if (/^4/.test(number)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(number)) return 'MASTERCARD';
  if (/^3[47]/.test(number)) return 'AMERICAN_EXPRESS';
  if (/^(6011|65|64[4-9])/.test(number)) return 'ELO';
  return 'OUTRA';
}

function passesLuhn(number: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}
