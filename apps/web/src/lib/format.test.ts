import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPeriodo,
} from "./format";

describe("formatMoney", () => {
  it("formata valor em reais no padrão pt-BR", () => {
    expect(formatMoney(1234.5)).toBe("R$\u00a01.234,50");
  });

  it("suporta string numérica", () => {
    expect(formatMoney("42.5")).toBe("R$\u00a042,50");
  });

  it("retorna R$ 0,00 para nulos e inválidos", () => {
    expect(formatMoney(null)).toBe("R$\u00a00,00");
    expect(formatMoney(undefined)).toBe("R$\u00a00,00");
    expect(formatMoney("")).toBe("R$\u00a00,00");
    expect(formatMoney("abc")).toBe("R$\u00a00,00");
  });
});

describe("formatDate", () => {
  it("formata data como dd/mm/aaaa", () => {
    expect(formatDate("2026-03-04")).toBe("04/03/2026");
  });

  it("aceita Date", () => {
    expect(formatDate(new Date(2026, 0, 2))).toBe("02/01/2026");
  });

  it("retorna — para valores inválidos", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("não é data")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("inclui horário", () => {
    expect(formatDateTime(new Date(2026, 0, 2, 9, 5))).toBe("02/01/2026 09:05");
  });

  it("retorna — para valores inválidos", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("formatPeriodo", () => {
  it("período no mesmo mês", () => {
    expect(formatPeriodo("2026-03-04", "2026-03-08")).toBe("04 — 08 Mar 2026");
  });

  it("período entre meses distintos", () => {
    expect(formatPeriodo("2026-02-25", "2026-03-02")).toBe(
      "25 Fev 2026 — 02 Mar 2026",
    );
  });

  it("retorna — para datas inválidas", () => {
    expect(formatPeriodo("", "")).toBe("—");
  });
});
