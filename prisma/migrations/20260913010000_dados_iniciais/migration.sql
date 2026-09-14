-- Dados iniciais obrigatórios para a aplicação rodar sem seeds.
-- Antes viviam em prisma/seed/*; agora fazem parte das migrações, então
-- `prisma migrate deploy` entrega permissões, perfis, vínculos e categorias.
-- Decisões idempotentes em qualquer banco (novo ou já populado).

-- Permissão
INSERT INTO "Permission" ("id", "code", "name", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.description, now(), now()
FROM (VALUES
  ('USUARIO.CRIAR', 'Criar usuário', 'Cadastrar colaboradores (RF-CAD-001).'),
  ('USUARIO.EDITAR', 'Editar usuário', 'Editar dados cadastrais do colaborador.'),
  ('CARTAO.CRIAR', 'Cadastrar cartão corporativo', 'Cadastrar cartão corporativo sem armazenar CVV ou PIN.'),
  ('CARTAO.VISUALIZAR', 'Visualizar cartões corporativos', 'Visualizar cartões somente com os quatro últimos dígitos.'),
  ('CARTAO.EDITAR', 'Editar cartão corporativo', 'Editar dados permitidos do cartão corporativo.'),
  ('CARTAO.DESATIVAR', 'Desativar cartão corporativo', 'Desativar cartão sem apagar o histórico.'),
  ('VIAGEM.CARTAO.SELECIONAR', 'Selecionar cartão na viagem', 'Associar cartão corporativo ativo a participante da viagem.'),
  ('VIAGEM.CRIAR', 'Criar viagem', 'Criar viagens (RF-VIA-001).'),
  ('VIAGEM.EDITAR', 'Editar viagem', 'Editar dados principais da viagem (RF-VIA-002).'),
  ('VIAGEM.ENTREGAR', 'Entregar relatório', 'Entregar relatório de viagem (RF-VIA-004).'),
  ('VIAGEM.EXCLUIR', 'Excluir viagem', 'Excluir (soft delete) viagem própria enquanto EM_ANDAMENTO (RF-VIA-006).'),
  ('DESPESA.CRIAR', 'Criar despesa', 'Lançar despesas (RF-DES-001).'),
  ('DESPESA.EDITAR', 'Editar despesa', 'Editar despesas da própria viagem.'),
  ('DESPESA.EXCLUIR', 'Excluir despesa', 'Excluir (soft delete) despesa própria enquanto a viagem está EM_ANDAMENTO.'),
  ('RELATORIO.VISUALIZAR', 'Visualizar relatório', 'Visualizar relatório, despesas e comprovantes (RF-APR-001).'),
  ('RELATORIO.PDF.GERAR', 'Gerar PDF de relatório', 'Gerar PDFs oficiais e gerenciais conforme o perfil.'),
  ('RELATORIO.APROVAR', 'Aprovar relatório', 'Aprovar relatório (RF-APR-002).'),
  ('RELATORIO.RETORNAR', 'Retornar relatório', 'Retornar relatório para correção (RF-APR-003).'),
  ('FISCAL.DOCUMENTO.VALIDAR', 'Validar documento fiscal', 'Validar documentos fiscalmente (RF-FIS-001).'),
  ('FINANCEIRO.REEMBOLSO.PROCESSAR', 'Processar reembolso', 'Processar reembolso (RF-FIN-001).'),
  ('ADIANTAMENTO.SOLICITAR', 'Solicitar adiantamento', 'Solicitar adiantamento na abertura da viagem (RF-FIN-002).'),
  ('ADIANTAMENTO.ANALISAR', 'Analisar adiantamento', 'Aprovar ou recusar solicitações de adiantamento (RF-FIN-002).'),
  ('ADIANTAMENTO.PAGAR', 'Pagar adiantamento', 'Efetuar o pagamento do adiantamento aprovado (RF-FIN-002).'),
  ('CONFIG.CATEGORIA.GERENCIAR', 'Gerenciar categorias', 'Administrar categorias de despesas (RF-DES-002).'),
  ('CONFIG.LIMITE.GERENCIAR', 'Gerenciar limites', 'Configurar limites por categoria (RF-LIM-001).'),
  ('CONFIG.CENTRO_CUSTO.GERENCIAR', 'Gerenciar centros de custo', 'Administrar centros de custo (RF-CC-001).'),
  ('CONFIG.CENTRO_CUSTO.VISUALIZAR', 'Visualizar centros de custo', 'Listar centros de custo ativos para seleção em viagens.'),
  ('CONFIG.SISTEMA.GERENCIAR', 'Gerenciar parâmetros do sistema', 'Configurar valores globais, como a taxa de reembolso por km (RF-CFG-001).'),
  ('DASHBOARD.GERENCIAL', 'Dashboard gerencial', 'Visualizar indicadores globais do dashboard gerencial (RF-DASH-001).'),
  ('AUDITORIA.CONSULTAR', 'Consultar auditoria', 'Consultar eventos de auditoria de qualquer usuário (RF-AUD-001).')
) AS v(code, name, description)
ON CONFLICT ("code") DO NOTHING;

-- Perfil
INSERT INTO "Role" ("id", "code", "name", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.description, now(), now()
FROM (VALUES
  ('EMPLOYEE'::"RoleType", 'Colaborador', 'Operacional: cria viagens e lança despesas.'),
  ('MANAGER_ADMIN'::"RoleType", 'Gestor/Admin', 'Visão global, aprovação e configurações.'),
  ('FINANCE'::"RoleType", 'Financeiro', 'Processos financeiros e reembolsos.'),
  ('FISCAL'::"RoleType", 'Fiscal', 'Validação de documentos fiscais.')
) AS v(code, name, description)
ON CONFLICT ("code") DO NOTHING;

-- Vínculos perfil -> permissão
INSERT INTO "PermissionRole" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM (VALUES
  ('EMPLOYEE'::"RoleType", 'VIAGEM.CRIAR'),
  ('EMPLOYEE'::"RoleType", 'VIAGEM.EDITAR'),
  ('EMPLOYEE'::"RoleType", 'VIAGEM.ENTREGAR'),
  ('EMPLOYEE'::"RoleType", 'VIAGEM.EXCLUIR'),
  ('EMPLOYEE'::"RoleType", 'DESPESA.CRIAR'),
  ('EMPLOYEE'::"RoleType", 'DESPESA.EDITAR'),
  ('EMPLOYEE'::"RoleType", 'DESPESA.EXCLUIR'),
  ('EMPLOYEE'::"RoleType", 'RELATORIO.VISUALIZAR'),
  ('EMPLOYEE'::"RoleType", 'CONFIG.CENTRO_CUSTO.VISUALIZAR'),
  ('EMPLOYEE'::"RoleType", 'ADIANTAMENTO.SOLICITAR'),
  ('EMPLOYEE'::"RoleType", 'CARTAO.VISUALIZAR'),
  ('EMPLOYEE'::"RoleType", 'VIAGEM.CARTAO.SELECIONAR'),

  ('MANAGER_ADMIN'::"RoleType", 'USUARIO.CRIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'USUARIO.EDITAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CARTAO.CRIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CARTAO.VISUALIZAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CARTAO.EDITAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CARTAO.DESATIVAR'),
  ('MANAGER_ADMIN'::"RoleType", 'VIAGEM.CARTAO.SELECIONAR'),
  ('MANAGER_ADMIN'::"RoleType", 'VIAGEM.CRIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'VIAGEM.EDITAR'),
  ('MANAGER_ADMIN'::"RoleType", 'VIAGEM.ENTREGAR'),
  ('MANAGER_ADMIN'::"RoleType", 'VIAGEM.EXCLUIR'),
  ('MANAGER_ADMIN'::"RoleType", 'DESPESA.CRIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'DESPESA.EDITAR'),
  ('MANAGER_ADMIN'::"RoleType", 'DESPESA.EXCLUIR'),
  ('MANAGER_ADMIN'::"RoleType", 'RELATORIO.VISUALIZAR'),
  ('MANAGER_ADMIN'::"RoleType", 'RELATORIO.PDF.GERAR'),
  ('MANAGER_ADMIN'::"RoleType", 'RELATORIO.APROVAR'),
  ('MANAGER_ADMIN'::"RoleType", 'RELATORIO.RETORNAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CONFIG.CATEGORIA.GERENCIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CONFIG.LIMITE.GERENCIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CONFIG.CENTRO_CUSTO.GERENCIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CONFIG.CENTRO_CUSTO.VISUALIZAR'),
  ('MANAGER_ADMIN'::"RoleType", 'CONFIG.SISTEMA.GERENCIAR'),
  ('MANAGER_ADMIN'::"RoleType", 'DASHBOARD.GERENCIAL'),
  ('MANAGER_ADMIN'::"RoleType", 'AUDITORIA.CONSULTAR'),
  ('MANAGER_ADMIN'::"RoleType", 'ADIANTAMENTO.SOLICITAR'),
  ('MANAGER_ADMIN'::"RoleType", 'ADIANTAMENTO.ANALISAR'),
  ('MANAGER_ADMIN'::"RoleType", 'ADIANTAMENTO.PAGAR'),

  ('FINANCE'::"RoleType", 'FINANCEIRO.REEMBOLSO.PROCESSAR'),
  ('FINANCE'::"RoleType", 'RELATORIO.VISUALIZAR'),
  ('FINANCE'::"RoleType", 'RELATORIO.PDF.GERAR'),
  ('FINANCE'::"RoleType", 'CONFIG.CENTRO_CUSTO.VISUALIZAR'),
  ('FINANCE'::"RoleType", 'ADIANTAMENTO.PAGAR'),

  ('FISCAL'::"RoleType", 'FISCAL.DOCUMENTO.VALIDAR'),
  ('FISCAL'::"RoleType", 'RELATORIO.PDF.GERAR')
) AS v(role, perm)
JOIN "Role" r ON r.code = v.role
JOIN "Permission" p ON p.code = v.perm
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Categorias de despesa
INSERT INTO "ExpenseCategory" ("id", "code", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, now(), now()
FROM (VALUES
  ('ALUGUEL_CARRO', 'Aluguel de carro'),
  ('PEDAGIO', 'Pedágio'),
  ('COMBUSTIVEL', 'Combustível'),
  ('DIARIA_VIAGEM', 'Diária de viagem'),
  ('HOTEL', 'Hotel'),
  ('PASSAGENS_AEREAS', 'Passagens aéreas'),
  ('ESTACIONAMENTO', 'Estacionamento'),
  ('UBER_TAXI', 'Uber/Táxi'),
  ('METRO', 'Metrô'),
  ('ALIMENTACAO', 'Alimentação'),
  ('OUTROS', 'Outros'),
  ('KM_RODADOS', 'KM rodados')
) AS v(code, name)
ON CONFLICT ("code") DO NOTHING;