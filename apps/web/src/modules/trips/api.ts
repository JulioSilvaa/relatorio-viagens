import { apiFetch } from "@/lib/api";
import type {
  TripDetailView,
  TripSearchResult,
  TripView,
} from "@/types/domain";

export interface CreateTripInput {
  cliente: string;
  cidade: string;
  uf: string;
  dataSaida: string;
  dataRetorno: string;
  departamento: string;
  motivo: string;
  veiculo?: string | null;
  placa?: string | null;
  tipoVeiculo?: string | null;
  observacoes?: string | null;
}

export async function listTrips(): Promise<TripView[]> {
  const data = await apiFetch<{ trips: TripView[] }>("/api/trips");
  return data.trips;
}

export async function getTrip(tripId: string): Promise<TripDetailView> {
  const data = await apiFetch<{ trip: TripDetailView }>(`/api/trips/${tripId}`);
  return data.trip;
}

export async function createTrip(input: CreateTripInput): Promise<TripView> {
  const data = await apiFetch<{ trip: TripView }>("/api/trips", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.trip;
}

export async function deliverTrip(tripId: string): Promise<void> {
  await apiFetch<void>(`/api/trips/${tripId}/entregar`, {
    method: "POST",
  });
}

export async function approveTrip(tripId: string): Promise<void> {
  await apiFetch<void>(`/api/approvals/${tripId}/aprovar`, {
    method: "POST",
  });
}

export async function returnTrip(
  tripId: string,
  justificativa: string,
): Promise<void> {
  await apiFetch<void>(`/api/approvals/${tripId}/retornar`, {
    method: "POST",
    body: JSON.stringify({ justificativa }),
  });
}

export interface SearchTripsParams {
  numeroRelatorio?: string;
  dataDe?: string;
  dataAte?: string;
  cliente?: string;
  cidade?: string;
  status?: string;
  departamento?: string;
  limite?: number;
  deslocamento?: number;
}

export async function searchTrips(
  params: SearchTripsParams,
): Promise<TripSearchResult> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const data = await apiFetch<TripSearchResult>(
    `/api/trips/historico?${query.toString()}`,
  );
  return data;
}
