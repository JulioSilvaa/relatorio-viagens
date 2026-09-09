import { prisma } from '../../config/database.js';
import type { AuditRepository, RecordAuditInput } from './audit.types.js';

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
}

export class AuditService {
  constructor(private readonly repository: AuditRepository = new PrismaAuditRepository()) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.repository.record(input);
  }
}
