import { Router } from 'express';
import multer from 'multer';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { MAX_UPLOAD_BYTES } from '../../../shared/upload/files.js';
import { createExpenseSchema, editExpenseSchema } from '../schemas/expense.schema.js';
import type { CreateExpenseService } from '../services/create-expense.service.js';
import type { EditExpenseService } from '../services/edit-expense.service.js';
import type { DeleteExpenseService } from '../services/delete-expense.service.js';
import type { ListExpensesService } from '../services/list-expenses.service.js';
import type { GetExpenseService } from '../services/get-expense.service.js';

export interface ExpensesDeps {
  requireAuth: RequestHandler;
  createExpenseService: CreateExpenseService;
  listExpensesService: ListExpensesService;
  getExpenseService: GetExpenseService;
  editExpenseService: EditExpenseService;
  deleteExpenseService: DeleteExpenseService;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const uploadComprovante = upload.single('comprovante') as unknown as RequestHandler;

export function createExpensesRouter({
  requireAuth,
  createExpenseService,
  listExpensesService,
  getExpenseService,
  editExpenseService,
  deleteExpenseService,
}: ExpensesDeps): Router {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    requirePermission('DESPESA.CRIAR'),
    uploadComprovante,
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = createExpenseSchema.parse(req.body);
      const files = req.file ? [req.file] : [];
      const expense = await createExpenseService.execute(
        dto,
        files,
        req.auth!.userId,
        req.auth!.user.name,
      );
      res.status(201).json(success({ expense }));
    }),
  );

  router.get(
    '/',
    requireAuth,
    requirePermission('DESPESA.CRIAR'),
    asyncHandler(async (req, res) => {
      const tripId = req.query.tripId as string | undefined;
      const expenses = await listExpensesService.execute(tripId, req.auth!.userId);
      res.json(success({ expenses }));
    }),
  );

  router.get(
    '/:id',
    requireAuth,
    requirePermission('DESPESA.CRIAR'),
    asyncHandler(async (req, res) => {
      const canViewAny =
        req.auth!.user.roleCode === 'MANAGER_ADMIN' ||
        req.auth!.user.permissions.includes('RELATORIO.VISUALIZAR');
      const expense = await getExpenseService.execute(req.params.id!, req.auth!.userId, canViewAny);
      res.json(success({ expense }));
    }),
  );

  router.patch(
    '/:id',
    requireAuth,
    requirePermission('DESPESA.EDITAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = editExpenseSchema.parse(req.body);
      const expense = await editExpenseService.execute(req.params.id!, dto, req.auth!.userId);
      res.json(success({ expense }));
    }),
  );

  router.delete(
    '/:id',
    requireAuth,
    requirePermission('DESPESA.EXCLUIR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      await deleteExpenseService.execute(req.params.id!, req.auth!.userId);
      res.status(204).send();
    }),
  );

  return router;
}
