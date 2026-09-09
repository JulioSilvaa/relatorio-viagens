import type { AuditService } from '../audit.service.js';
import type { AuditListResult } from '../audit.types.js';

export interface ListAuditInput {
  scopeUserId: string;
  canViewGlobal: boolean;
  filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    operation?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  limit: number;
  offset: number;
}

export class ListAuditService {
  constructor(private readonly audit: AuditService) {}

  async execute(input: ListAuditInput): Promise<AuditListResult> {
    const scopedUserId = input.canViewGlobal ? input.filters.userId : input.scopeUserId;
    return this.audit.list({
      filters: { ...input.filters, userId: scopedUserId },
      limit: input.limit,
      offset: input.offset,
    });
  }
}
