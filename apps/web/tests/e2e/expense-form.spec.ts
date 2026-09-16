import { test, expect } from "@playwright/test";
import { createTestTrip, registerTestAccount } from "./helpers";

/**
 * Smoke visual do modal "Nova despesa" em viewport mobile — usado para
 * validar manualmente os itens do Track A2 (date picker, toast de erro,
 * card de OCR) via screenshot, não é uma suíte de regressão completa.
 */
test("abre o modal de nova despesa em viewport mobile", async ({ page, context }) => {
  await registerTestAccount(context.request);
  const tripId = await createTestTrip(context.request, context);

  await page.goto(`/viagens/${tripId}`);
  await page.getByRole("button", { name: "Registrar primeira despesa" }).click();

  await expect(page.getByRole("heading", { name: /Adicionar comprovante|Nova despesa/ })).toBeVisible();
  await page.screenshot({ path: "tests/e2e/__screenshots__/expense-form-mobile.png" });
});
