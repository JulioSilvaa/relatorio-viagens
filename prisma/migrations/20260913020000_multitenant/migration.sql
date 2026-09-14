-- Multi-tenant: escopo de empresa (companyId) nas raízes de agregação.
-- Trip, CostCenter, CreditCard e ExpenseCategory passam a pertencer a uma empresa.
-- Backfill preserva os dados existentes (single-tenant anterior) atribuindo a
-- empresa atual à primeira Companhia; novas empresas recebem um clone do catálogo.

-- 1) Colunas companyId (nullable até o backfill)
ALTER TABLE "Trip"            ADD COLUMN "companyId" UUID;
ALTER TABLE "CostCenter"      ADD COLUMN "companyId" UUID;
ALTER TABLE "CreditCard"      ADD COLUMN "companyId" UUID;
ALTER TABLE "ExpenseCategory" ADD COLUMN "companyId" UUID;

-- 2) Trip: empresa do usuário criador
UPDATE "Trip" t
SET "companyId" = u."companyId"
FROM "User" u
WHERE u.id = t."criadoPorId";

-- 3) CreditCard: empresa do usuário que cadastrou
UPDATE "CreditCard" c
SET "companyId" = u."companyId"
FROM "User" u
WHERE u.id = c."createdById";

-- 4) CostCenter: sem vínculo com usuário; em bancos existentes há uma única
-- empresa (a plataforma rodava single-tenant). Atribui a ela.
UPDATE "CostCenter"
SET "companyId" = (SELECT id FROM "Company" ORDER BY "createdAt" LIMIT 1)
WHERE "companyId" IS NULL;

-- 5) ExpenseCategory: catálogo global passa a ser da primeira empresa (preserva
-- referências de despesas existentes); empresas adicionais recebem um clone.
-- Em banco novo (sem empresa), o catálogo global é descartado: o cadastro de
-- cada empresa clona o padrão via código.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Company") THEN
    UPDATE "ExpenseCategory"
    SET "companyId" = (SELECT id FROM "Company" ORDER BY "createdAt" LIMIT 1)
    WHERE "companyId" IS NULL;

    INSERT INTO "ExpenseCategory" ("id", "code", "name", "ativa", "companyId", "createdAt", "updatedAt")
    SELECT gen_random_uuid(), src."code", src."name", src."ativa", comp.id, now(), now()
    FROM "Company" comp
    JOIN "ExpenseCategory" src ON src."companyId" = (SELECT id FROM "Company" ORDER BY "createdAt" LIMIT 1)
    WHERE comp.id <> (SELECT id FROM "Company" ORDER BY "createdAt" LIMIT 1)
      AND NOT EXISTS (
        SELECT 1 FROM "ExpenseCategory" e
        WHERE e."companyId" = comp.id AND e."code" = src."code"
      );
  ELSE
    DELETE FROM "ExpenseCategory" WHERE "companyId" IS NULL;
  END IF;
END $$;

-- 6) Guarda: órfãos restantes bloqueiam a migração (evita atribuição errada de tenant)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Trip"            WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Multi-tenant: há Trip sem empresa (usuário criador sem companyId).';
  END IF;
  IF EXISTS (SELECT 1 FROM "CreditCard"      WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Multi-tenant: há CreditCard sem empresa (usuário cadastrante sem companyId).';
  END IF;
  IF EXISTS (SELECT 1 FROM "CostCenter"      WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Multi-tenant: há CostCenter sem empresa e nenhuma empresa cadastrada.';
  END IF;
  IF EXISTS (SELECT 1 FROM "ExpenseCategory" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Multi-tenant: há ExpenseCategory sem empresa.';
  END IF;
END $$;

-- 7) FKs
ALTER TABLE "Trip"            ADD CONSTRAINT "Trip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostCenter"      ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditCard"      ADD CONSTRAINT "CreditCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8) NOT NULL
ALTER TABLE "Trip"            ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "CostCenter"      ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "CreditCard"      ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "ExpenseCategory" ALTER COLUMN "companyId" SET NOT NULL;

-- 9) Índices
CREATE INDEX "Trip_companyId_idx"                 ON "Trip"("companyId");
CREATE INDEX "CreditCard_companyId_idx"           ON "CreditCard"("companyId");
CREATE INDEX "CostCenter_companyId_ativo_idx"     ON "CostCenter"("companyId", "ativo");
CREATE INDEX "ExpenseCategory_companyId_ativa_idx" ON "ExpenseCategory"("companyId", "ativa");

-- 10) Unicidade por empresa (substitui a global)
DROP INDEX "CostCenter_nome_key";
DROP INDEX "ExpenseCategory_code_key";
CREATE UNIQUE INDEX "CostCenter_companyId_nome_key"      ON "CostCenter"("companyId", "nome");
CREATE UNIQUE INDEX "ExpenseCategory_companyId_code_key" ON "ExpenseCategory"("companyId", "code");