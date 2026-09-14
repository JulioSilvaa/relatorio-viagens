export function stripCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = stripCnpj(value).slice(0, 14);
  let formatted = "";
  if (digits.length <= 2) {
    formatted = digits;
  } else if (digits.length <= 5) {
    formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
  } else if (digits.length <= 8) {
    formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  } else if (digits.length <= 12) {
    formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  } else {
    formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return formatted;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = stripCnpj(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cnpj[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  if (parseInt(cnpj[12], 10) !== digit1) return false;

  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cnpj[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  if (parseInt(cnpj[13], 10) !== digit2) return false;

  return true;
}