import type { DepartmentType, TripStatus, UfType, VehicleType } from '@prisma/client';
import type { TripAdvanceRecord } from '../../finance/finance.types.js';
import type { CreateTripData, UpdateTripData } from '../trip.types.js';

export interface TripSearchFilters {
  id?: string;
  dataDe?: string;
  dataAte?: string;
  cliente?: string;
  cidade?: string;
  colaboradorId?: string;
  status?: string;
  departamento?: string;
  centroDeCustoId?: string;
}

export interface TripSearchInput {
  filters: TripSearchFilters;
  global: boolean;
  userId: string;
  limit: number;
  offset: number;
}

export interface TripSearchResult {
  items: TripRecord[];
  total: number;
}

export interface TripCreatorRef {
  id: string;
  name: string;
}

export interface TripRecord {
  id: string;
  cliente: string;
  cidade: string;
  uf: UfType;
  dataSaida: Date;
  dataRetorno: Date;
  departamento: DepartmentType;
  motivo: string;
  veiculo: string | null;
  placa: string | null;
  tipoVeiculo: VehicleType | null;
  kmInicial: string | null;
  kmFinal: string | null;
  taxaKm: string | null;
  centroDeCustoId: string | null;
  observacoes: string | null;
  status: TripStatus;
  motivoCancelamento: string | null;
  criadoPorId: string;
  deletadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  criadoPor: TripCreatorRef;
}

export interface TripParticipantRecord {
  userId: string;
  name: string;
  addedAt: Date;
  cartaoLast4: string | null;
}

export interface ReceiptDetailRecord {
  id: string;
  tipo: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  ativo: boolean;
  createdAt: Date;
  ocr: { status: string; origem: string; valorExtraido: string | null } | null;
}

export interface ExpenseDetailRecord {
  id: string;
  category: { id: string; code: string; name: string };
  valor: string;
  dataDespesa: Date;
  reembolsavel: boolean;
  justificativa: string;
  alertaExcesso: string | null;
  deletedAt: Date | null;
  criadoPor: TripCreatorRef;
  receipts: ReceiptDetailRecord[];
}

export interface TripDetailRecord extends TripRecord {
  participants: TripParticipantRecord[];
  expenses: ExpenseDetailRecord[] | null;
  adiantamento: TripAdvanceRecord | null;
}

export interface CreateTripInput extends CreateTripData {
  criadoPorId: string;
  criadoPorNome: string;
  taxaKm: string | null;
}

export interface TripsRepository {
  createTrip(input: CreateTripInput): Promise<TripRecord>;
  findById(id: string): Promise<TripRecord | null>;
  findDetailById(id: string): Promise<TripDetailRecord | null>;
  findByParticipant(userId: string): Promise<TripRecord[]>;
  findAll(): Promise<TripRecord[]>;
  searchTrips(input: TripSearchInput): Promise<TripSearchResult>;
  update(id: string, data: UpdateTripData): Promise<TripRecord>;
  setStatus(id: string, status: TripStatus, motivoCancelamento?: string): Promise<void>;
  softDelete(id: string, deletedById: string): Promise<void>;
  addParticipant(tripId: string, userId: string, addedById: string): Promise<TripParticipantRecord>;
  removeParticipant(tripId: string, userId: string): Promise<boolean>;
  participantExists(tripId: string, userId: string): Promise<boolean>;
  listParticipants(tripId: string): Promise<TripParticipantRecord[]>;
  listParticipantIds(tripId: string): Promise<string[]>;
}
