import type { PrismaClient } from "@prisma/client";

export const INITIAL_CATEGORIES = [
  { code: "ALUGUEL_CARRO", name: "Aluguel de carro" },
  { code: "PEDAGIO", name: "Pedágio" },
  { code: "COMBUSTIVEL", name: "Combustível" },
  { code: "DIARIA_VIAGEM", name: "Diária de viagem" },
  { code: "HOTEL", name: "Hotel" },
  { code: "PASSAGENS_AEREAS", name: "Passagens aéreas" },
  { code: "ESTACIONAMENTO", name: "Estacionamento" },
  { code: "UBER_TAXI", name: "Uber/Táxi" },
  { code: "METRO", name: "Metrô" },
  { code: "ALIMENTACAO", name: "Alimentação" },
  { code: "OUTROS", name: "Outros" },
  { code: "KM_RODADOS", name: "KM rodados" },
] as const;

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  for (const category of INITIAL_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: { code: category.code, name: category.name },
    });
  }
}
