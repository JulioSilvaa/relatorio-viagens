import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyInputValue,
  formatPeriodo,
  moneyDigits,
  moneyInputToDecimal,
  parseMoneyInput,
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

describe("moneyDigits", () => {
  it("extrai apenas dígitos da máscara", () => {
    expect(moneyDigits("R$ 1.234,56")).toBe("123456");
    expect(moneyDigits("12,34")).toBe("1234");
    expect(moneyDigits("abc12x34")).toBe("1234");
    expect(moneyDigits("")).toBe("");
  });
});

describe("moneyInputToDecimal", () => {
  it("converte dígitos digitados em decimal para a API", () => {
    expect(moneyInputToDecimal("")).toBe("");
    expect(moneyInputToDecimal("2")).toBe("0.02");
    expect(moneyInputToDecimal("12")).toBe("0.12");
    expect(moneyInputToDecimal("123")).toBe("1.23");
    expect(moneyInputToDecimal("1234")).toBe("12.34");
    expect(moneyInputToDecimal("100050")).toBe("1000.50");
  });
});

describe("formatMoneyInputValue", () => {
  it("formata o valor com máscara pt-BR", () => {
    expect(formatMoneyInputValue("")).toBe("");
    expect(formatMoneyInputValue("0.00")).toBe("0,00");
    expect(formatMoneyInputValue("0.02")).toBe("0,02");
    expect(formatMoneyInputValue("12.34")).toBe("12,34");
    expect(formatMoneyInputValue("1234.56")).toBe("1.234,56");
    expect(formatMoneyInputValue("999999.99")).toBe("999.999,99");
  });
});

describe("parseMoneyInput", () => {
  it("aceita valor com ponto decimal", () => {
    expect(parseMoneyInput("1234.5")).toBe(1234.5);
  });

  it("aceita vírgula como separador decimal", () => {
    expect(parseMoneyInput("42,90")).toBe(42.9);
  });

  it("aceita prefixo de moeda e espaços", () => {
    expect(parseMoneyInput("R$ 12,50")).toBe(12.5);
  });

  it("retorna null para valores inválidos", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("1.234,56")).toBeNull();
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
