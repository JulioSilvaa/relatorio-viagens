import type { PrismaClient } from "@prisma/client";

export const PERMISSIONS = [
  {
    code: "USUARIO.CRIAR",
    name: "Criar usuário",
    description: "Cadastrar colaboradores (RF-CAD-001).",
  },
  {
    code: "USUARIO.EDITAR",
    name: "Editar usuário",
    description: "Editar dados cadastrais do colaborador.",
  },
  {
    code: "VIAGEM.CRIAR",
    name: "Criar viagem",
    description: "Criar viagens (RF-VIA-001).",
  },
  {
    code: "VIAGEM.EDITAR",
    name: "Editar viagem",
    description: "Editar dados principais da viagem (RF-VIA-002).",
  },
  {
    code: "VIAGEM.ENTREGAR",
    name: "Entregar relatório",
    description: "Entregar relatório de viagem (RF-VIA-004).",
  },
  {
    code: "DESPESA.CRIAR",
    name: "Criar despesa",
    description: "Lançar despesas (RF-DES-001).",
  },
  {
    code: "DESPESA.EDITAR",
    name: "Editar despesa",
    description: "Editar despesas da própria viagem.",
  },
  {
    code: "RELATORIO.VISUALIZAR",
    name: "Visualizar relatório",
    description: "Visualizar relatório, despesas e comprovantes (RF-APR-001).",
  },
  {
    code: "RELATORIO.APROVAR",
    name: "Aprovar relatório",
    description: "Aprovar relatório (RF-APR-002).",
  },
  {
    code: "RELATORIO.RETORNAR",
    name: "Retornar relatório",
    description: "Retornar relatório para correção (RF-APR-003).",
  },
  {
    code: "FISCAL.DOCUMENTO.VALIDAR",
    name: "Validar documento fiscal",
    description: "Validar documentos fiscalmente (RF-FIS-001).",
  },
  {
    code: "FINANCEIRO.REEMBOLSO.PROCESSAR",
    name: "Processar reembolso",
    description: "Processar reembolso (RF-FIN-001).",
  },
  {
    code: "CONFIG.CATEGORIA.GERENCIAR",
    name: "Gerenciar categorias",
    description: "Administrar categorias de despesas (RF-DES-002).",
  },
  {
    code: "CONFIG.LIMITE.GERENCIAR",
    name: "Gerenciar limites",
    description: "Configurar limites por categoria (RF-LIM-001).",
  },
] as const;

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description },
      create: { code: p.code, name: p.name, description: p.description },
    });
  }
}
