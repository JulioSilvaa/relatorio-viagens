import { describe, expect, it } from "vitest";
import { shouldNotifySound } from "./notification-sound";

describe("shouldNotifySound", () => {
  it("não toca no primeiro carregamento (baseline)", () => {
    expect(shouldNotifySound(null, 2)).toBe(false);
  });

  it("toca quando a contagem de não lidas aumenta", () => {
    expect(shouldNotifySound(1, 2)).toBe(true);
    expect(shouldNotifySound(0, 3)).toBe(true);
  });

  it("não toca quando a contagem cai (leitura) ou se mantém", () => {
    expect(shouldNotifySound(3, 2)).toBe(false);
    expect(shouldNotifySound(2, 2)).toBe(false);
  });
});