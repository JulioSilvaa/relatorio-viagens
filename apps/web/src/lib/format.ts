export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "")
    return formatMoney(0);
  const number = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(number)) return formatMoney(0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
}

interface DateParts {
  day: number;
  month: number;
  year: number;
  hours: number;
  minutes: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function toParts(value: string | Date): DateParts | null {
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value);
    if (match) {
      return {
        day: Number(match[3]),
        month: Number(match[2]),
        year: Number(match[1]),
        hours: 0,
        minutes: 0,
      };
    }
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const parts = toParts(value);
  if (!parts) return "—";
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const parts = toParts(value);
  if (!parts) return "—";
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hours)}:${pad(parts.minutes)}`;
}

export function formatPeriodo(
  dataSaida: string | Date,
  dataRetorno: string | Date,
): string {
  const saida = toParts(dataSaida);
  const retorno = toParts(dataRetorno);

  if (!saida || !retorno) return "—";

  const diaSaida = pad(saida.day);
  const mesSaida = shortMonth(saida.month - 1);
  const diaRetorno = pad(retorno.day);
  const mesRetorno = shortMonth(retorno.month - 1);

  if (saida.month === retorno.month && saida.year === retorno.year) {
    return `${diaSaida} — ${diaRetorno} ${mesRetorno} ${retorno.year}`;
  }
  return `${diaSaida} ${mesSaida} ${saida.year} — ${diaRetorno} ${mesRetorno} ${retorno.year}`;
}

const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function shortMonth(month: number): string {
  return SHORT_MONTHS[month] ?? "";
}
