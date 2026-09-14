import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { success } from '../../../shared/http/http-response.js';
import { requirePermission } from '../../../shared/auth/require-permission.js';
import { verifyCsrf } from '../../../shared/auth/csrf.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/expense.schema.js';
import type { ListCategoriesService } from '../services/list-categories.service.js';
import type { CreateCategoryService } from '../services/create-category.service.js';
import type { UpdateCategoryService } from '../services/update-category.service.js';

export interface ExpenseCategoriesDeps {
  requireAuth: RequestHandler;
  listCategoriesService: ListCategoriesService;
  createCategoryService: CreateCategoryService;
  updateCategoryService: UpdateCategoryService;
}

export function createExpenseCategoriesRouter({
  requireAuth,
  listCategoriesService,
  createCategoryService,
  updateCategoryService,
}: ExpenseCategoriesDeps): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const includeInactive = req.auth!.user.roleCode === 'MANAGER_ADMIN';
      res.json(
        success({
          categories: await listCategoriesService.execute(
            includeInactive,
            req.auth!.user.companyId,
          ),
        }),
      );
    }),
  );

  router.post(
    '/',
    requireAuth,
    requirePermission('CONFIG.CATEGORIA.GERENCIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = createCategorySchema.parse(req.body);
      const category = await createCategoryService.execute(
        dto,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.status(201).json(success({ category }));
    }),
  );

  router.patch(
    '/:id',
    requireAuth,
    requirePermission('CONFIG.CATEGORIA.GERENCIAR'),
    verifyCsrf,
    asyncHandler(async (req, res) => {
      const dto = updateCategorySchema.parse(req.body);
      const category = await updateCategoryService.execute(
        req.params.id!,
        dto,
        req.auth!.userId,
        req.auth!.user.companyId,
      );
      res.json(success({ category }));
    }),
  );

  return router;
}
