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
    code: "CARTAO.CRIAR",
    name: "Cadastrar cartão corporativo",
    description: "Cadastrar cartão corporativo sem armazenar CVV ou PIN.",
  },
  {
    code: "CARTAO.VISUALIZAR",
    name: "Visualizar cartões corporativos",
    description: "Visualizar cartões somente com os quatro últimos dígitos.",
  },
  {
    code: "CARTAO.EDITAR",
    name: "Editar cartão corporativo",
    description: "Editar dados permitidos do cartão corporativo.",
  },
  {
    code: "CARTAO.DESATIVAR",
    name: "Desativar cartão corporativo",
    description: "Desativar cartão sem apagar o histórico.",
  },
  {
    code: "VIAGEM.CARTAO.SELECIONAR",
    name: "Selecionar cartão na viagem",
    description: "Associar cartão corporativo ativo a participante da viagem.",
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
    code: "VIAGEM.EXCLUIR",
    name: "Excluir viagem",
    description:
      "Excluir (soft delete) viagem própria enquanto EM_ANDAMENTO (RF-VIA-006).",
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
    code: "DESPESA.EXCLUIR",
    name: "Excluir despesa",
    description:
      "Excluir (soft delete) despesa própria enquanto a viagem está EM_ANDAMENTO.",
  },
  {
    code: "RELATORIO.VISUALIZAR",
    name: "Visualizar relatório",
    description: "Visualizar relatório, despesas e comprovantes (RF-APR-001).",
  },
  {
    code: "RELATORIO.PDF.GERAR",
    name: "Gerar PDF de relatório",
    description: "Gerar PDFs oficiais e gerenciais conforme o perfil.",
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
    code: "ADIANTAMENTO.SOLICITAR",
    name: "Solicitar adiantamento",
    description: "Solicitar adiantamento na abertura da viagem (RF-FIN-002).",
  },
  {
    code: "ADIANTAMENTO.ANALISAR",
    name: "Analisar adiantamento",
    description:
      "Aprovar ou recusar solicitações de adiantamento (RF-FIN-002).",
  },
  {
    code: "ADIANTAMENTO.PAGAR",
    name: "Pagar adiantamento",
    description: "Efetuar o pagamento do adiantamento aprovado (RF-FIN-002).",
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
  {
    code: "CONFIG.CENTRO_CUSTO.GERENCIAR",
    name: "Gerenciar centros de custo",
    description: "Administrar centros de custo (RF-CC-001).",
  },
  {
    code: "CONFIG.CENTRO_CUSTO.VISUALIZAR",
    name: "Visualizar centros de custo",
    description: "Listar centros de custo ativos para seleção em viagens.",
  },
  {
    code: "CONFIG.SISTEMA.GERENCIAR",
    name: "Gerenciar parâmetros do sistema",
    description:
      "Configurar valores globais, como a taxa de reembolso por km (RF-CFG-001).",
  },
  {
    code: "DASHBOARD.GERENCIAL",
    name: "Dashboard gerencial",
    description:
      "Visualizar indicadores globais do dashboard gerencial (RF-DASH-001).",
  },
  {
    code: "AUDITORIA.CONSULTAR",
    name: "Consultar auditoria",
    description:
      "Consultar eventos de auditoria de qualquer usuário (RF-AUD-001).",
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
