import { Router } from 'express';
import { prisma } from '../config/database.js';
import { createEmailProvider } from '../shared/email/email-provider.factory.js';
import { createRequireAuth } from '../shared/auth/session.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { PrismaSettingsRepository } from '../modules/settings/repositories/settings.repository.prisma.js';
import { KmRateService } from '../modules/settings/services/km-rate.service.js';
import { createSettingsRouter } from '../modules/settings/controllers/settings.controller.js';
import { PrismaUsersRepository } from '../modules/users/repositories/users.repository.prisma.js';
import { CreateUserService } from '../modules/users/services/create-user.service.js';
import { ListUsersService } from '../modules/users/services/list-users.service.js';
import { createUsersRouter } from '../modules/users/controllers/user.controller.js';
import {
  PrismaInvitesRepository,
  PrismaPasswordResetRepository,
  PrismaSessionsRepository,
} from '../modules/auth/repositories/auth.repository.prisma.js';
import { LoginService } from '../modules/auth/services/login.service.js';
import { MeService } from '../modules/auth/services/me.service.js';
import { LogoutService } from '../modules/auth/services/logout.service.js';
import { AcceptInviteService } from '../modules/auth/services/accept-invite.service.js';
import { ForgotPasswordService } from '../modules/auth/services/forgot-password.service.js';
import { ResetPasswordService } from '../modules/auth/services/reset-password.service.js';
import { createAuthRouter } from '../modules/auth/controllers/auth.controller.js';
import { PrismaTripsRepository } from '../modules/trips/repositories/trips.repository.prisma.js';
import { PrismaExpensesRepository } from '../modules/expenses/repositories/expenses.repository.prisma.js';
import { PrismaCostCentersRepository } from '../modules/cost-centers/repositories/cost-centers.repository.prisma.js';
import { PrismaNotificationsRepository } from '../modules/notifications/repositories/notifications.repository.prisma.js';
import { NotificationsService } from '../modules/notifications/services/notifications.service.js';
import { PrismaReceiptsRepository } from '../modules/receipts/receipts.repository.prisma.js';
import { CreateTripService } from '../modules/trips/services/create-trip.service.js';
import { EditTripService } from '../modules/trips/services/edit-trip.service.js';
import { ListTripsService } from '../modules/trips/services/list-trips.service.js';
import { GetTripService } from '../modules/trips/services/get-trip.service.js';
import { AddParticipantService } from '../modules/trips/services/add-participant.service.js';
import { RemoveParticipantService } from '../modules/trips/services/remove-participant.service.js';
import { DeliverReportService } from '../modules/trips/services/deliver-report.service.js';
import { CancelTripService } from '../modules/trips/services/cancel-trip.service.js';
import { DeleteTripService } from '../modules/trips/services/delete-trip.service.js';
import { createTripsRouter } from '../modules/trips/controllers/trip.controller.js';
import { CreateExpenseService } from '../modules/expenses/services/create-expense.service.js';
import { EditExpenseService } from '../modules/expenses/services/edit-expense.service.js';
import { DeleteExpenseService } from '../modules/expenses/services/delete-expense.service.js';
import { ListExpensesService } from '../modules/expenses/services/list-expenses.service.js';
import { GetExpenseService } from '../modules/expenses/services/get-expense.service.js';
import { ListCategoriesService } from '../modules/expenses/services/list-categories.service.js';
import { CreateCategoryService } from '../modules/expenses/services/create-category.service.js';
import { UpdateCategoryService } from '../modules/expenses/services/update-category.service.js';
import { ListLimitsService } from '../modules/expenses/services/list-limits.service.js';
import { ConfigureLimitService } from '../modules/expenses/services/configure-limit.service.js';
import { createExpensesRouter } from '../modules/expenses/controllers/expense.controller.js';
import { createExpenseCategoriesRouter } from '../modules/expenses/controllers/expense-category.controller.js';
import { createExpenseLimitsRouter } from '../modules/expenses/controllers/expense-limit.controller.js';
import { UploadReceiptService } from '../modules/receipts/services/upload-receipt.service.js';
import { SubstituteReceiptService } from '../modules/receipts/services/substitute-receipt.service.js';
import { GetReceiptFileService } from '../modules/receipts/services/get-receipt-file.service.js';
import { createReceiptsRouter } from '../modules/receipts/controllers/receipt.controller.js';
import { ApproveReportService } from '../modules/approvals/services/approve-report.service.js';
import { ReturnReportService } from '../modules/approvals/services/return-report.service.js';
import { ChangeReimbursabilityService } from '../modules/approvals/services/change-reimbursability.service.js';
import { createApprovalsRouter } from '../modules/approvals/controllers/approval.controller.js';
import { ListCostCentersService } from '../modules/cost-centers/services/list-cost-centers.service.js';
import { CreateCostCenterService } from '../modules/cost-centers/services/create-cost-center.service.js';
import { UpdateCostCenterService } from '../modules/cost-centers/services/update-cost-center.service.js';
import { createCostCentersRouter } from '../modules/cost-centers/controllers/cost-center.controller.js';
import { createNotificationsRouter } from '../modules/notifications/controllers/notification.controller.js';
import { SearchTripsService } from '../modules/trips/services/search-trips.service.js';
import { PrismaReceiptOcrRepository } from '../modules/ocr/repositories/receipt-ocr.repository.prisma.js';
import { NeutralOcrProvider } from '../modules/ocr/ocr-provider.neutro.js';
import { ExtractReceiptOcrService } from '../modules/ocr/services/extract-receipt-ocr.service.js';
import { GetReceiptOcrService } from '../modules/ocr/services/get-receipt-ocr.service.js';
import { SaveReceiptOcrService } from '../modules/ocr/services/save-receipt-ocr.service.js';
import { createOcrRouter } from '../modules/ocr/controllers/ocr.controller.js';
import { PrismaFiscalValidationRepository } from '../modules/fiscal/repositories/fiscal-validation.repository.prisma.js';
import { ValidateExpenseService } from '../modules/fiscal/services/validate-expense.service.js';
import { GetExpenseFiscalService } from '../modules/fiscal/services/get-expense-fiscal.service.js';
import { createFiscalRouter } from '../modules/fiscal/controllers/fiscal.controller.js';
import { ListAuditService } from '../modules/audit/services/list-audit.service.js';
import { createAuditRouter } from '../modules/audit/controllers/audit.controller.js';
import { PrismaFinanceRepository } from '../modules/finance/repositories/finance.repository.prisma.js';
import { ReceiveFinanceService } from '../modules/finance/services/receive-finance.service.js';
import { RegisterPaymentService } from '../modules/finance/services/register-payment.service.js';
import { PayAdvanceService } from '../modules/finance/services/pay-advance.service.js';
import { RequestAdvanceService } from '../modules/finance/services/request-advance.service.js';
import { ReviewAdvanceService } from '../modules/finance/services/review-advance.service.js';
import { RegisterRefundService } from '../modules/finance/services/register-refund.service.js';
import { GetFinanceService } from '../modules/finance/services/get-finance.service.js';
import { createFinanceRouter } from '../modules/finance/controllers/finance.controller.js';
import { PrismaDashboardRepository } from '../modules/dashboard/repositories/dashboard.repository.prisma.js';
import { ManagerDashboardService } from '../modules/dashboard/services/manager-dashboard.service.js';
import { EmployeeDashboardService } from '../modules/dashboard/services/employee-dashboard.service.js';
import { createDashboardRouter } from '../modules/dashboard/controllers/dashboard.controller.js';
import { PrismaReportsRepository } from '../modules/reports/repositories/reports.repository.prisma.js';
import { GenerateOfficialPdfService } from '../modules/reports/services/generate-official-pdf.service.js';
import { GenerateManagerPdfService } from '../modules/reports/services/generate-manager-pdf.service.js';
import { createReportsRouter } from '../modules/reports/controllers/report.controller.js';
import { PrismaExportsRepository } from '../modules/exports/repositories/exports.repository.prisma.js';
import { GenerateExpensesExcelService } from '../modules/exports/services/generate-expenses-excel.service.js';
import { createExportsRouter } from '../modules/exports/controllers/export.controller.js';

export interface Container {
  usersRouter: ReturnType<typeof createUsersRouter>;
  authRouter: ReturnType<typeof createAuthRouter>;
  tripsRouter: ReturnType<typeof createTripsRouter>;
  expensesRouter: ReturnType<typeof createExpensesRouter>;
  expenseCategoriesRouter: ReturnType<typeof createExpenseCategoriesRouter>;
  expenseLimitsRouter: ReturnType<typeof createExpenseLimitsRouter>;
  receiptsRouter: ReturnType<typeof createReceiptsRouter>;
  approvalsRouter: ReturnType<typeof createApprovalsRouter>;
  costCentersRouter: ReturnType<typeof createCostCentersRouter>;
  notificationsRouter: ReturnType<typeof createNotificationsRouter>;
  ocrRouter: ReturnType<typeof createOcrRouter>;
  fiscalRouter: ReturnType<typeof createFiscalRouter>;
  auditRouter: ReturnType<typeof createAuditRouter>;
  settingsRouter: ReturnType<typeof createSettingsRouter>;
  financeRouter: ReturnType<typeof createFinanceRouter>;
  dashboardRouter: ReturnType<typeof createDashboardRouter>;
  reportsRouter: ReturnType<typeof createReportsRouter>;
  exportsRouter: ReturnType<typeof createExportsRouter>;
}

export function buildContainer(): Container {
  const users = new PrismaUsersRepository();
  const sessions = new PrismaSessionsRepository();
  const invites = new PrismaInvitesRepository();
  const resets = new PrismaPasswordResetRepository();
  const email = createEmailProvider();
  const audit = new AuditService();

  const trips = new PrismaTripsRepository();
  const expenses = new PrismaExpensesRepository();
  const costCenters = new PrismaCostCentersRepository();
  const notificationsRepo = new PrismaNotificationsRepository();
  const notifications = new NotificationsService(notificationsRepo);
  const receipts = new PrismaReceiptsRepository();
  const settingsRepo = new PrismaSettingsRepository();
  const kmRateService = new KmRateService(settingsRepo);

  const createUserService = new CreateUserService(users, invites, audit, email);
  const listUsersService = new ListUsersService(users);
  const loginService = new LoginService(users, sessions);
  const meService = new MeService(users);
  const logoutService = new LogoutService(sessions);
  const acceptInviteService = new AcceptInviteService(users, invites, sessions);
  const forgotPasswordService = new ForgotPasswordService(users, resets, email);
  const resetPasswordService = new ResetPasswordService(users, resets, sessions);

  const createTripService = new CreateTripService(
    trips,
    costCenters,
    audit,
    users,
    notifications,
    kmRateService,
  );
  const editTripService = new EditTripService(trips, costCenters, audit);
  const listTripsService = new ListTripsService(trips);
  const getTripService = new GetTripService(trips);
  const addParticipantService = new AddParticipantService(trips, audit);
  const removeParticipantService = new RemoveParticipantService(trips, audit);
  const deliverReportService = new DeliverReportService(trips, users, audit, notifications);
  const cancelTripService = new CancelTripService(trips, audit);
  const deleteTripService = new DeleteTripService(trips, audit);

  const createExpenseService = new CreateExpenseService(trips, expenses, audit);
  const editExpenseService = new EditExpenseService(trips, expenses, audit);
  const deleteExpenseService = new DeleteExpenseService(expenses, audit);
  const listExpensesService = new ListExpensesService(trips, expenses);
  const getExpenseService = new GetExpenseService(expenses, trips);
  const listCategoriesService = new ListCategoriesService(expenses);
  const createCategoryService = new CreateCategoryService(expenses, audit);
  const updateCategoryService = new UpdateCategoryService(expenses, audit);
  const listLimitsService = new ListLimitsService(expenses);
  const configureLimitService = new ConfigureLimitService(expenses, audit);

  const uploadReceiptService = new UploadReceiptService(expenses, receipts, audit);
  const substituteReceiptService = new SubstituteReceiptService(expenses, receipts, audit);
  const getReceiptFileService = new GetReceiptFileService(receipts, trips);

  const approveReportService = new ApproveReportService(trips, users, audit, notifications);
  const returnReportService = new ReturnReportService(trips, audit, notifications);
  const changeReimbursabilityService = new ChangeReimbursabilityService(expenses, audit);

  const listCostCentersService = new ListCostCentersService(costCenters);
  const createCostCenterService = new CreateCostCenterService(costCenters, audit);
  const updateCostCenterService = new UpdateCostCenterService(costCenters, audit);

  const requireAuth = createRequireAuth(sessions);

  const usersRouter = createUsersRouter({ createUserService, listUsersService, requireAuth });
  const authRouter = createAuthRouter({
    loginService,
    meService,
    logoutService,
    acceptInviteService,
    forgotPasswordService,
    resetPasswordService,
    requireAuth,
  });
  const searchTripsService = new SearchTripsService(trips);

  const tripsRouter = createTripsRouter({
    requireAuth,
    createTripService,
    listTripsService,
    getTripService,
    editTripService,
    addParticipantService,
    removeParticipantService,
    deliverReportService,
    cancelTripService,
    deleteTripService,
    searchTripsService,
  });
  const expensesRouter = createExpensesRouter({
    requireAuth,
    createExpenseService,
    listExpensesService,
    getExpenseService,
    editExpenseService,
    deleteExpenseService,
  });
  const expenseCategoriesRouter = createExpenseCategoriesRouter({
    requireAuth,
    listCategoriesService,
    createCategoryService,
    updateCategoryService,
  });
  const expenseLimitsRouter = createExpenseLimitsRouter({
    requireAuth,
    listLimitsService,
    configureLimitService,
  });
  const receiptsRouter = createReceiptsRouter({
    requireAuth,
    uploadReceiptService,
    substituteReceiptService,
    getReceiptFileService,
  });
  const approvalsRouter = createApprovalsRouter({
    requireAuth,
    approveReportService,
    returnReportService,
    changeReimbursabilityService,
  });
  const costCentersRouter = createCostCentersRouter({
    requireAuth,
    listCostCentersService,
    createCostCenterService,
    updateCostCenterService,
  });
  const notificationsRouter = createNotificationsRouter({
    requireAuth,
    notificationsService: notifications,
  });

  const ocrRepo = new PrismaReceiptOcrRepository();
  const ocrProvider = new NeutralOcrProvider();
  const extractReceiptOcrService = new ExtractReceiptOcrService(
    receipts,
    trips,
    ocrRepo,
    ocrProvider,
    audit,
  );
  const getReceiptOcrService = new GetReceiptOcrService(receipts, trips, ocrRepo);
  const saveReceiptOcrService = new SaveReceiptOcrService(receipts, trips, ocrRepo, audit);
  const ocrRouter = createOcrRouter({
    requireAuth,
    extractReceiptOcrService,
    getReceiptOcrService,
    saveReceiptOcrService,
  });

  const fiscalRepo = new PrismaFiscalValidationRepository();
  const validateExpenseService = new ValidateExpenseService(
    expenses,
    trips,
    fiscalRepo,
    audit,
    notifications,
  );
  const getExpenseFiscalService = new GetExpenseFiscalService(expenses, trips, fiscalRepo);
  const fiscalRouter = createFiscalRouter({
    requireAuth,
    validateExpenseService,
    getExpenseFiscalService,
  });

  const listAuditService = new ListAuditService(audit);
  const auditRouter = createAuditRouter({ requireAuth, listAuditService });
  const settingsRouter = createSettingsRouter({ requireAuth, kmRateService });

  const financeRepo = new PrismaFinanceRepository();
  const receiveFinanceService = new ReceiveFinanceService(trips, audit);
  const registerPaymentService = new RegisterPaymentService(
    trips,
    expenses,
    financeRepo,
    audit,
    notifications,
  );
  const registerAdvanceRequestService = new RequestAdvanceService(
    trips,
    financeRepo,
    audit,
    notifications,
  );
  const reviewAdvanceService = new ReviewAdvanceService(trips, financeRepo, audit, notifications);
  const payAdvanceService = new PayAdvanceService(trips, financeRepo, audit, notifications);
  const registerRefundService = new RegisterRefundService(trips, financeRepo, audit);
  const getFinanceService = new GetFinanceService(trips, expenses, financeRepo);
  const financeRouter = createFinanceRouter({
    requireAuth,
    receiveFinanceService,
    registerPaymentService,
    requestAdvanceService: registerAdvanceRequestService,
    reviewAdvanceService,
    payAdvanceService,
    registerRefundService,
    getFinanceService,
  });

  const dashboardRepo = new PrismaDashboardRepository();
  const managerDashboardService = new ManagerDashboardService(dashboardRepo);
  const employeeDashboardService = new EmployeeDashboardService(dashboardRepo);
  const dashboardRouter = createDashboardRouter({
    requireAuth,
    managerDashboardService,
    employeeDashboardService,
  });

  const reportsRepo = new PrismaReportsRepository(trips, financeRepo);
  const generateOfficialPdfService = new GenerateOfficialPdfService(reportsRepo);
  const generateManagerPdfService = new GenerateManagerPdfService(reportsRepo);
  const reportsRouter = createReportsRouter({
    requireAuth,
    generateOfficialPdfService,
    generateManagerPdfService,
  });

  const exportsRepo = new PrismaExportsRepository();
  const generateExpensesExcelService = new GenerateExpensesExcelService(exportsRepo);
  const exportsRouter = createExportsRouter({
    requireAuth,
    generateExpensesExcelService,
  });

  return {
    usersRouter,
    authRouter,
    tripsRouter,
    expensesRouter,
    expenseCategoriesRouter,
    expenseLimitsRouter,
    receiptsRouter,
    approvalsRouter,
    costCentersRouter,
    notificationsRouter,
    ocrRouter,
    fiscalRouter,
    auditRouter,
    settingsRouter,
    financeRouter,
    dashboardRouter,
    reportsRouter,
    exportsRouter,
  };
}

export function createHealthRouter() {
  const router = Router();
  router.get('/health', (_req, res) => {
    void prisma.$queryRaw`SELECT 1`
      .then(() => res.json({ data: { status: 'ok' } }))
      .catch(() =>
        res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Base indisponível.' } }),
      );
  });
  return router;
}
