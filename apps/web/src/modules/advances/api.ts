import { apiFetch } from "@/lib/api";
import type { TripAdvanceView } from "@/types/domain";

export interface RequestAdvanceInput {
  valorSolicitado: string;
  justificativaSolicitacao: string;
}

export interface ReviewAdvanceInput {
  aprovado: boolean;
  valorAprovado: string | null;
  justificativaAnalise: string;
}

export async function requestAdvance(
  tripId: string,
  input: RequestAdvanceInput,
): Promise<TripAdvanceView> {
  const data = await apiFetch<{ advance: TripAdvanceView }>(
    `/api/finance/trips/${tripId}/adiantamento`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.advance;
}

export async function reviewAdvance(
  advanceId: string,
  input: ReviewAdvanceInput,
): Promise<TripAdvanceView> {
  const data = await apiFetch<{ advance: TripAdvanceView }>(
    `/api/finance/adiantamentos/${advanceId}/analise`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.advance;
}

export async function payAdvance(
  advanceId: string,
  input: { observacoesPagamento: string | null },
): Promise<TripAdvanceView> {
  const data = await apiFetch<{ advance: TripAdvanceView }>(
    `/api/finance/adiantamentos/${advanceId}/pagamento`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.advance;
}