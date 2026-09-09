import { prisma } from '../../config/database.js';
import type {
  AuditListInput,
  AuditListResult,
  AuditRecord,
  AuditRepository,
  RecordAuditInput,
} from './audit.types.js';

class PrismaAuditRepository implements AuditRepository {
  async record(input: RecordAuditInput): Promise<void> {
    const { userId, operation, entityType, entityId, field, oldValue, newValue, justification } =
      input;
    await prisma.auditEvent.create({
      data: {
        userId,
        operation,
        entityType,
        entityId,
        field,
        oldValue,
        newValue,
        justification,
      },
    });
  }

  async list(input: AuditListInput): Promise<AuditListResult> {
    const { filters } = input;
    const where = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.operation ? { operation: filters.operation } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return {
      items: items.map(
        (event): AuditRecord => ({
          id: event.id,
          userId: event.userId,
          userName: event.user?.name ?? null,
          operation: event.operation,
          entityType: event.entityType,
          entityId: event.entityId,
          field: event.field,
          oldValue: event.oldValue,
          newValue: event.newValue,
          justification: event.justification,
          createdAt: event.createdAt,
        }),
      ),
      total,
    };
  }
}

export class AuditService {
  constructor(private readonly repository: AuditRepository = new PrismaAuditRepository()) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.repository.record(input);
  }

  list(input: AuditListInput): Promise<AuditListResult> {
    return this.repository.list(input);
  }
}
