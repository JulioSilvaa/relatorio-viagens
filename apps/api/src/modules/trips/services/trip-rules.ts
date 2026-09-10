import { TripInvalidDatesError, TripInvalidKmsError } from '../trip.errors.js';
import type { VehicleTypeValue } from '../schemas/trip.schema.js';

export const KM_RATE_REFERENCE = '0.60';

export function assertValidTripDates(dataSaida: Date, dataRetorno: Date): void {
  if (dataRetorno.getTime() < dataSaida.getTime()) {
    throw new TripInvalidDatesError();
  }
}

export function assertValidTripKms(
  kmInicial: number | string | null | undefined,
  kmFinal: number | string | null | undefined,
): void {
  if (kmInicial == null || kmFinal == null) return;
  const inicial = Number(kmInicial);
  const final = Number(kmFinal);
  if (!Number.isNaN(inicial) && !Number.isNaN(final) && final < inicial) {
    throw new TripInvalidKmsError();
  }
}

export function computeTaxaKm(
  tipoVeiculo: VehicleTypeValue | null | undefined,
  kmInicial: number | string | null | undefined,
  kmFinal: number | string | null | undefined,
  rate: string | null | undefined,
): string | null {
  if (tipoVeiculo !== 'PROPRIO') return null;
  if (kmInicial == null || kmFinal == null) return null;
  return rate ?? KM_RATE_REFERENCE;
}
