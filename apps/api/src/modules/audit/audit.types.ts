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

export interface AuditRecord {
  id: string;
  userId: string | null;
  userName: string | null;
  operation: string;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  justification: string | null;
  createdAt: Date;
}

export interface AuditListInput {
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

export interface AuditListResult {
  items: AuditRecord[];
  total: number;
}

export interface AuditRepository {
  record(input: RecordAuditInput): Promise<void>;
  list(input: AuditListInput): Promise<AuditListResult>;
}
