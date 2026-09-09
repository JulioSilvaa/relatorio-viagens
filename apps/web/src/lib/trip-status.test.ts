import { describe, expect, it } from "vitest";
import { getTripStatusMeta } from "./trip-status";

describe("getTripStatusMeta", () => {
  it("mapeia todos os status conhecidos", () => {
    const statuses = [
      "EM_ANDAMENTO",
      "EM_APROVACAO",
      "EM_CORRECAO",
      "APROVADA",
      "FINANCEIRO",
      "FINALIZADA",
      "CANCELADA",
    ] as const;

    for (const status of statuses) {
      expect(getTripStatusMeta(status)).toMatchObject({
        label: expect.any(String),
        dotClass: expect.any(String),
        badgeClass: expect.any(String),
        emoji: expect.any(String),
      });
    }
  });

  it("retorna fallback para status desconhecido", () => {
    expect(getTripStatusMeta("DESCONHECIDO" as never).label).toBe(
      "DESCONHECIDO",
    );
  });
});
