-- CreateTable
CREATE TABLE "expense_category_catalog" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_category_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_catalog_code_key" ON "expense_category_catalog"("code");

-- Seed: catálogo padrão de categorias (template global)
INSERT INTO "expense_category_catalog" ("id", "code", "name", "ativo", "createdAt", "updatedAt") VALUES
    ('00000000-0000-4000-8000-000000000001', 'ALUGUEL_CARRO', 'Aluguel de carro', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000002', 'PEDAGIO', 'Pedágio', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000003', 'COMBUSTIVEL', 'Combustível', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000004', 'DIARIA_VIAGEM', 'Diária de viagem', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000005', 'HOTEL', 'Hotel', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000006', 'PASSAGENS_AEREAS', 'Passagens aéreas', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000007', 'ESTACIONAMENTO', 'Estacionamento', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000008', 'UBER_TAXI', 'Uber/Táxi', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000009', 'METRO', 'Metrô', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000010', 'ALIMENTACAO', 'Alimentação', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000011', 'OUTROS', 'Outros', true, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000012', 'KM_RODADOS', 'Km rodados', true, NOW(), NOW());