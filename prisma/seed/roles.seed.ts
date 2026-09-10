import type { PrismaClient, RoleType } from "@prisma/client";

const EMPLOYEE = [
  "VIAGEM.CRIAR",
  "VIAGEM.EDITAR",
  "VIAGEM.ENTREGAR",
  "VIAGEM.EXCLUIR",
  "DESPESA.CRIAR",
  "DESPESA.EDITAR",
  "DESPESA.EXCLUIR",
  "RELATORIO.VISUALIZAR",
  "CONFIG.CENTRO_CUSTO.VISUALIZAR",
  "ADIANTAMENTO.SOLICITAR",
];

const MANAGER_ADMIN = [
  "USUARIO.CRIAR",
  "USUARIO.EDITAR",
  "VIAGEM.CRIAR",
  "VIAGEM.EDITAR",
  "VIAGEM.ENTREGAR",
  "VIAGEM.EXCLUIR",
  "DESPESA.CRIAR",
  "DESPESA.EDITAR",
  "DESPESA.EXCLUIR",
  "RELATORIO.VISUALIZAR",
  "RELATORIO.APROVAR",
  "RELATORIO.RETORNAR",
  "CONFIG.CATEGORIA.GERENCIAR",
  "CONFIG.LIMITE.GERENCIAR",
  "CONFIG.CENTRO_CUSTO.GERENCIAR",
  "CONFIG.CENTRO_CUSTO.VISUALIZAR",
  "CONFIG.SISTEMA.GERENCIAR",
  "DASHBOARD.GERENCIAL",
  "AUDITORIA.CONSULTAR",
  "ADIANTAMENTO.SOLICITAR",
  "ADIANTAMENTO.ANALISAR",
  "ADIANTAMENTO.PAGAR",
];

const FINANCE = [
  "FINANCEIRO.REEMBOLSO.PROCESSAR",
  "RELATORIO.VISUALIZAR",
  "CONFIG.CENTRO_CUSTO.VISUALIZAR",
  "ADIANTAMENTO.PAGAR",
];

const FISCAL = ["FISCAL.DOCUMENTO.VALIDAR"];

const ROLES: ReadonlyArray<{
  code: RoleType;
  name: string;
  description: string;
  permissions: readonly string[];
}> = [
  {
    code: "EMPLOYEE",
    name: "Colaborador",
    description: "Operacional: cria viagens e lança despesas.",
    permissions: EMPLOYEE,
  },
  {
    code: "MANAGER_ADMIN",
    name: "Gestor/Admin",
    description: "Visão global, aprovação e configurações.",
    permissions: MANAGER_ADMIN,
  },
  {
    code: "FINANCE",
    name: "Financeiro",
    description: "Processos financeiros e reembolsos.",
    permissions: FINANCE,
  },
  {
    code: "FISCAL",
    name: "Fiscal",
    description: "Validação de documentos fiscais.",
    permissions: FISCAL,
  },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of ROLES) {
    await prisma.$transaction(async (tx) => {
      const saved = await tx.role.upsert({
        where: { code: role.code },
        update: { name: role.name, description: role.description },
        create: {
          code: role.code,
          name: role.name,
          description: role.description,
        },
      });

      await tx.permissionRole.deleteMany({ where: { roleId: saved.id } });

      for (const code of role.permissions) {
        const permission = await tx.permission.findUnique({ where: { code } });
        if (!permission) continue;
        await tx.permissionRole.create({
          data: { roleId: saved.id, permissionId: permission.id },
        });
      }
    });
  }
}
