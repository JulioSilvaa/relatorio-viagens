export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

function isRepeatedDigit(value: string): boolean {
  return /^(\d)\1{13}$/.test(value);
}

function checksum(digits: string, weights: number[]): number {
  const sum = digits
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index]!, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14) return false;
  if (isRepeatedDigit(cnpj)) return false;

  const first = checksum(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (first !== Number(cnpj[12])) return false;

  const second = checksum(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return second === Number(cnpj[13]);
}
