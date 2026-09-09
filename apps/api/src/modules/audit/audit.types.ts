export interface RecordAuditInput {
  userId?: string;
  operation: string;
  entityType: string;
  entityId: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  justification?: string;
}

export interface AuditRepository {
  record(input: RecordAuditInput): Promise<void>;
}
