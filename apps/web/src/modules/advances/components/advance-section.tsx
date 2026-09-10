"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { getAdvanceStatusMeta } from "@/lib/advance-status";
import { formatDateTime, formatMoney } from "@/lib/format";
import { usePayAdvance, useRequestAdvance, useReviewAdvance } from "../hooks";
import type {
  AdvanceStatus,
  RoleTypeValue,
  TripAdvanceView,
  TripDetailView,
} from "@/types/domain";

type DialogKind = "solicitar" | "analisar" | "pagar" | null;

function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

function JustificativaField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Justificativa</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

function RequestAdvanceDialog({ open, onOpenChange, tripId }: RequestDialogProps) {
  const request = useRequestAdvance(tripId);
  const [valor, setValor] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setValor("");
    setJustificativa("");
    setError(null);
  }

  async function handleSubmit() {
    if (!valor || toCents(valor) <= 0) {
      setError("Informe o valor solicitado.");
      return;
    }
    if (justificativa.trim().length < 5) {
      setError("Justificativa deve ter pelo menos 5 caracteres.");
      return;
    }
    try {
      await request.mutateAsync({
        valorSolicitado: valor,
        justificativaSolicitacao: justificativa.trim(),
      });
      toast.success("Adiantamento solicitado!");
      reset();
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível solicitar o adiantamento.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar adiantamento</DialogTitle>
          <DialogDescription>
            Informe quanto precisa e o motivo. O valor aprovado é definido
            pelo gestor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="advance-valor">Valor solicitado</Label>
            <MoneyInput
              id="advance-valor"
              value={valor}
              onValueChange={setValor}
              aria-invalid={Boolean(error) && !valor}
            />
          </div>
          <JustificativaField
            id="advance-justificativa"
            value={justificativa}
            onChange={setJustificativa}
            placeholder="Ex.: Diárias e hospedagem antecipadas"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={request.isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={request.isPending}>
            {request.isPending ? "Solicitando..." : "Solicitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advance: TripAdvanceView;
  tripId: string;
}

function ReviewAdvanceDialog({ open, onOpenChange, advance, tripId }: ReviewDialogProps) {
  const review = useReviewAdvance(tripId);
  const [aprovado, setAprovado] = useState(true);
  const [valor, setValor] = useState(advance.valorAprovado ?? advance.valorSolicitado);
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (justificativa.trim().length < 2) {
      setError("Informe a justificativa da análise.");
      return;
    }
    if (aprovado) {
      if (!valor || toCents(valor) <= 0) {
        setError("Informe o valor aprovado.");
        return;
      }
      if (toCents(valor) > toCents(advance.valorSolicitado)) {
        setError("O valor aprovado não pode exceder o valor solicitado.");
        return;
      }
    }
    try {
      await review.mutateAsync({
        advanceId: advance.id,
        aprovado,
        valorAprovado: aprovado ? valor : null,
        justificativaAnalise: justificativa.trim(),
      });
      toast.success(aprovado ? "Adiantamento aprovado!" : "Adiantamento recusado.");
      setJustificativa("");
      setError(null);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível registrar a análise.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Analisar solicitação</DialogTitle>
          <DialogDescription>
            Valor solicitado: {formatMoney(advance.valorSolicitado)}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={aprovado ? "default" : "outline"}
              onClick={() => {
                setAprovado(true);
                setError(null);
              }}
            >
              Aprovar
            </Button>
            <Button
              type="button"
              variant={!aprovado ? "destructive" : "outline"}
              onClick={() => {
                setAprovado(false);
                setError(null);
              }}
            >
              Recusar
            </Button>
          </div>
          {aprovado ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="advance-valor-aprovado">Valor aprovado</Label>
              <MoneyInput
                id="advance-valor-aprovado"
                value={valor}
                onValueChange={setValor}
                aria-invalid={Boolean(error) && (!valor || toCents(valor) > toCents(advance.valorSolicitado))}
              />
            </div>
          ) : null}
          <JustificativaField
            id="advance-justificativa-analise"
            value={justificativa}
            onChange={setJustificativa}
            placeholder={
              aprovado ? "Ex.: Aprovado conforme solicitação" : "Ex.: Valor não justificado"
            }
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={review.isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={review.isPending}>
            {review.isPending ? "Salvando..." : aprovado ? "Aprovar" : "Recusar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advance: TripAdvanceView;
  tripId: string;
}

function PayAdvanceDialog({ open, onOpenChange, advance, tripId }: PayDialogProps) {
  const pay = usePayAdvance(tripId);
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      await pay.mutateAsync({
        advanceId: advance.id,
        observacoesPagamento: observacoes.trim() || null,
      });
      toast.success("Pagamento do adiantamento registrado!");
      setObservacoes("");
      setError(null);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível registrar o pagamento.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar adiantamento</DialogTitle>
          <DialogDescription>
            Valor aprovado: {formatMoney(advance.valorAprovado ?? advance.valorSolicitado)}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="advance-observacoes-pagamento">
              Observações do pagamento{" "}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="advance-observacoes-pagamento"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Ex.: PIX para a conta do colaborador"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pay.isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={pay.isPending}>
            {pay.isPending ? "Registrando..." : "Pagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function canAnalyze(status: AdvanceStatus, role: RoleTypeValue | null): boolean {
  return (
    role === "MANAGER_ADMIN" &&
    (status === "SOLICITADO" || status === "EM_ANALISE")
  );
}

function canPay(status: AdvanceStatus, role: RoleTypeValue | null): boolean {
  return (
    (role === "FINANCE" || role === "MANAGER_ADMIN") &&
    (status === "APROVADO" || status === "PAGAMENTO_PENDENTE")
  );
}

function canSolicitar(status: AdvanceStatus | null, canEdit: boolean): boolean {
  return canEdit && (status === null || status === "RECUSADO");
}

export interface AdvanceSectionProps {
  trip: TripDetailView;
  canEdit: boolean;
  userRole: RoleTypeValue | null;
}

export function AdvanceSection({ trip, canEdit, userRole }: AdvanceSectionProps) {
  const [dialog, setDialog] = useState<DialogKind>(null);

  const advance = trip.adiantamento;
  const meta = advance ? getAdvanceStatusMeta(advance.status) : null;
  const showSolicitar = canSolicitar(advance?.status ?? null, canEdit);
  const showAnalisar = advance ? canAnalyze(advance.status, userRole) : false;
  const showPagar = advance ? canPay(advance.status, userRole) : false;

  return (
    <section aria-label="Adiantamento">
      <CardHeader className="px-0 pb-2">
        <CardTitle className="text-base">Adiantamento</CardTitle>
      </CardHeader>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5">
          {!advance ? (
            <>
              <p className="text-sm text-muted-foreground">
                Nenhum adiantamento solicitado para esta viagem.
              </p>
              {showSolicitar ? (
                <Button
                  variant="outline"
                  className="h-9 w-full justify-start"
                  onClick={() => setDialog("solicitar")}
                >
                  <Banknote aria-hidden="true" />
                  Solicitar adiantamento
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className={`gap-1.5 border-transparent ${meta?.badgeClass ?? ""}`}>
                  <span aria-hidden="true">{meta?.emoji ?? ""}</span>
                  {meta?.label ?? advance.status}
                </Badge>
                {(showAnalisar || showPagar || showSolicitar) ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {showSolicitar ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialog("solicitar")}
                      >
                        Solicitar novamente
                      </Button>
                    ) : null}
                    {showAnalisar ? (
                      <Button
                        size="sm"
                        onClick={() => setDialog("analisar")}
                      >
                        Analisar
                      </Button>
                    ) : null}
                    {showPagar ? (
                      <Button
                        size="sm"
                        onClick={() => setDialog("pagar")}
                      >
                        Pagar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Solicitado</p>
                  <p className="font-semibold text-foreground">
                    {formatMoney(advance.valorSolicitado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {advance.solicitadoPor.name} · {formatDateTime(advance.solicitadoEm)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Aprovado</p>
                  <p className="font-semibold text-foreground">
                    {advance.valorAprovado
                      ? formatMoney(advance.valorAprovado)
                      : advance.status === "RECUSADO"
                        ? "—"
                        : "Pendente de análise"}
                  </p>
                  {advance.aprovadoPor ? (
                    <p className="text-xs text-muted-foreground">
                      {advance.aprovadoPor.name} ·{" "}
                      {formatDateTime(advance.aprovadoEm)}
                    </p>
                  ) : null}
                </div>
              </div>

              {advance.justificativaSolicitacao ? (
                <p className="text-sm text-muted-foreground">
                  Motivo: {advance.justificativaSolicitacao}
                </p>
              ) : null}
              {advance.justificativaAnalise ? (
                <p className="text-sm text-muted-foreground">
                  Análise: {advance.justificativaAnalise}
                </p>
              ) : null}
              {advance.pagoEm ? (
                <p className="text-sm text-muted-foreground">
                  Pagamento:{" "}
                  {advance.pagoPor?.name ?? "—"}
                  {advance.pagoEm ? ` · ${formatDateTime(advance.pagoEm)}` : ""}
                </p>
              ) : null}
              {advance.observacoesPagamento ? (
                <p className="text-sm text-muted-foreground">
                  Observações: {advance.observacoesPagamento}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <RequestAdvanceDialog
        open={dialog === "solicitar"}
        onOpenChange={(open) => setDialog(open ? "solicitar" : null)}
        tripId={trip.id}
      />
      {dialog === "analisar" && advance ? (
        <ReviewAdvanceDialog
          open
          onOpenChange={() => setDialog(null)}
          advance={advance}
          tripId={trip.id}
        />
      ) : null}
      {dialog === "pagar" && advance ? (
        <PayAdvanceDialog
          open
          onOpenChange={() => setDialog(null)}
          advance={advance}
          tripId={trip.id}
        />
      ) : null}
    </section>
  );
}