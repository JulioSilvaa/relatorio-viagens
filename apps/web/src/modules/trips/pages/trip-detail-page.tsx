"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Paperclip,
  Plus,
  SendHorizontal,
  Undo2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTrip, useDeliverTrip, useApproveTrip, useReturnTrip } from "../hooks";
import { TripStatusBadge } from "../components/trip-status-badge";
import { ExpenseFormDialog } from "@/modules/expenses/components/expense-form-dialog";
import { receiptFileUrl } from "@/modules/expenses/api";
import { useChangeReimbursability } from "@/modules/expenses/hooks";
import { AdvanceSection } from "@/modules/advances/components/advance-section";
import { useSession } from "@/modules/auth/session-context";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatMoney, formatPeriodo } from "@/lib/format";
import type { TripExpenseView } from "@/types/domain";
import { cn } from "cn";

const EDITABLE_TRIP_STATUSES = new Set(["EM_ANDAMENTO", "EM_CORRECAO"]);

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useSession();
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnJustificativa, setReturnJustificativa] = useState("");
  const [returnError, setReturnError] = useState("");
  const [reimbursabilityTarget, setReimbursabilityTarget] =
    useState<TripExpenseView | null>(null);
  const [reimbursabilityJustificativa, setReimbursabilityJustificativa] =
    useState("");
  const [reimbursabilityError, setReimbursabilityError] = useState("");
  const { data: trip, isLoading, isError, error, refetch } = useTrip(params.id);
  const deliverTrip = useDeliverTrip(params.id);
  const approveTrip = useApproveTrip();
  const returnTrip = useReturnTrip();
  const changeReimbursability = useChangeReimbursability(params.id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const totalDespesas = trip.despesas.reduce(
    (acc, despesa) => acc + Number(despesa.valor),
    0,
  );
  const totalComprovantes = trip.despesas.reduce(
    (acc, despesa) => acc + despesa.receipts.length,
    0,
  );
  const reembolsavel = trip.despesas.some((despesa) => despesa.reembolsavel);
  const canEdit =
    EDITABLE_TRIP_STATUSES.has(trip.status) &&
    user !== null &&
    trip.participants.some((participant) => participant.userId === user.id);
  const canApprove =
    trip.status === "EM_APROVACAO" && user?.roleCode === "MANAGER_ADMIN";

  async function handleDeliver() {
    try {
      await deliverTrip.mutateAsync();
      toast.success("Relatório entregue para aprovação.");
      setIsDeliverDialogOpen(false);
    } catch (deliverError) {
      toast.error(
        deliverError instanceof Error
          ? deliverError.message
          : "Não foi possível entregar o relatório.",
      );
    }
  }

  async function handleApprove() {
    try {
      await approveTrip.mutateAsync(params.id);
      toast.success("Relatório aprovado.");
      setIsApproveDialogOpen(false);
    } catch (approveError) {
      toast.error(
        approveError instanceof Error
          ? approveError.message
          : "Não foi possível aprovar o relatório.",
      );
    }
  }

  async function handleReturn() {
    if (returnJustificativa.trim().length < 3) {
      setReturnError("Informe a justificativa (mín. 3 caracteres).");
      return;
    }
    try {
      await returnTrip.mutateAsync({
        tripId: params.id,
        justificativa: returnJustificativa.trim(),
      });
      toast.success("Relatório retornado para correção.");
      setIsReturnDialogOpen(false);
      setReturnJustificativa("");
      setReturnError("");
    } catch (returnErrorObject) {
      toast.error(
        returnErrorObject instanceof Error
          ? returnErrorObject.message
          : "Não foi possível retornar o relatório.",
      );
    }
  }

  async function handleReimbursabilitySave() {
    if (!reimbursabilityTarget) return;
    if (reimbursabilityJustificativa.trim().length < 3) {
      setReimbursabilityError("Informe a justificativa (mín. 3 caracteres).");
      return;
    }
    try {
      await changeReimbursability.mutateAsync({
        expenseId: reimbursabilityTarget.id,
        reembolsavel: !reimbursabilityTarget.reembolsavel,
        justificativa: reimbursabilityJustificativa.trim(),
      });
      toast.success("Reembolsabilidade atualizada.");
      setReimbursabilityTarget(null);
      setReimbursabilityJustificativa("");
      setReimbursabilityError("");
    } catch (errorObject) {
      toast.error(
        errorObject instanceof Error
          ? errorObject.message
          : "Não foi possível atualizar a reembolsabilidade.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild aria-label="Voltar">
          <Link href="/viagens">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-semibold tracking-tight">
          {trip.cliente}
        </h1>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <TripStatusBadge status={trip.status} />
            <span className="text-xs text-muted-foreground">
              #{trip.id.slice(0, 8)}
            </span>
          </div>
          <div>
            <p className="text-lg font-medium">
              {trip.cidade} - <span className="uppercase">{trip.uf}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPeriodo(trip.dataSaida, trip.dataRetorno)}
            </p>
            {trip.motivo ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {trip.motivo}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <Users
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold">{trip.participants.length}</p>
            <p className="text-xs text-muted-foreground">Participantes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <span className="text-sm text-muted-foreground">🎫</span>
            <p className="text-lg font-semibold">{trip.despesas.length}</p>
            <p className="text-xs text-muted-foreground">Despesas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <Paperclip
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold">{totalComprovantes}</p>
            <p className="text-xs text-muted-foreground">Comprovantes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-1 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Resumo
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatMoney(totalDespesas)}
          </p>
          <p className="text-xs text-muted-foreground">
            {reembolsavel
              ? "Inclui despesas reembolsáveis"
              : "Sem despesas reembolsáveis"}
          </p>
        </CardContent>
      </Card>

      {canApprove ? (
        <Card className="border-primary/40 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <p className="font-medium text-foreground">
                Relatório em aprovação
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Revise as despesas e os comprovantes abaixo. Clique no selo de
              uma despesa para alterar a reembolsabilidade.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                size="lg"
                className="h-10 w-full"
                onClick={() => setIsApproveDialogOpen(true)}
                disabled={approveTrip.isPending}
              >
                <CheckCircle2 aria-hidden="true" />
                {approveTrip.isPending ? "Aprovando..." : "Aprovar relatório"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-10 w-full"
                onClick={() => setIsReturnDialogOpen(true)}
                disabled={returnTrip.isPending}
              >
                <Undo2 aria-hidden="true" />
                Retornar para correção
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {trip.observacoes ? (
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Observações
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {trip.observacoes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <AdvanceSection trip={trip} canEdit={canEdit} userRole={user?.roleCode ?? null} />

      <section aria-label="Despesas">
        <div className="flex items-center justify-between gap-2 px-0 pb-2">
          <CardHeader className="p-0">
            <CardTitle className="text-base">Despesas</CardTitle>
          </CardHeader>
          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpenseFormOpen(true)}
            >
              <Plus aria-hidden="true" />
              Adicionar
            </Button>
          ) : null}
        </div>
        {trip.despesas.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 text-sm text-muted-foreground">
              <p>Nenhuma despesa registrada até o momento.</p>
              {canEdit ? (
                <Button
                  variant="outline"
                  onClick={() => setIsExpenseFormOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  Registrar primeira despesa
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {trip.despesas.map((despesa) => (
              <li key={despesa.id}>
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {despesa.category?.name ?? "Sem categoria"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(despesa.dataDespesa)} ·{" "}
                          {despesa.criadoPor.name}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-sm font-semibold text-foreground">
                          {formatMoney(despesa.valor)}
                        </p>
                        {canApprove ? (
                          <Button
                            variant={
                              despesa.reembolsavel ? "secondary" : "outline"
                            }
                            size="sm"
                            onClick={() => {
                              setReimbursabilityTarget(despesa);
                              setReimbursabilityJustificativa("");
                              setReimbursabilityError("");
                            }}
                            title="Alterar reembolsabilidade"
                          >
                            {despesa.reembolsavel
                              ? "Reembolsável"
                              : "Não reembolsável"}
                          </Button>
                        ) : (
                          <Badge
                            variant={
                              despesa.reembolsavel ? "secondary" : "outline"
                            }
                          >
                            {despesa.reembolsavel
                              ? "Reembolsável"
                              : "Não reembolsável"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {despesa.alertaExcesso ? (
                      <p className="text-xs font-medium text-warning">
                        Excede o limite em{" "}
                        {formatMoney(despesa.alertaExcesso)}.
                      </p>
                    ) : null}
                    {despesa.justificativa ? (
                      <p className="text-sm text-muted-foreground">
                        {despesa.justificativa}
                      </p>
                    ) : null}
                    {despesa.receipts.filter((r) => r.ativo).length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {despesa.receipts
                          .filter((r) => r.ativo)
                          .map((receipt) => (
                            <li key={receipt.id}>
                              <a
                                href={receiptFileUrl(receipt.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-foreground underline-offset-3 hover:underline"
                              >
                                <Paperclip
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                {receipt.fileName}
                              </a>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-xs font-medium text-destructive">
                        Sem comprovante — a entrega do relatório está bloqueada.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="text-sm font-medium">Relatório pronto para entrega?</p>
            <p className="text-xs text-muted-foreground">
              Só é possível entregar quando todas as despesas tiverem
              comprovante. Após a entrega, a viagem vai para aprovação.
            </p>
            <Button
              size="lg"
              className="h-10 w-full"
              onClick={() => setIsDeliverDialogOpen(true)}
              disabled={deliverTrip.isPending}
            >
              <SendHorizontal aria-hidden="true" />
              {deliverTrip.isPending ? "Entregando..." : "Entregar relatório"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {trip.participants.length > 0 ? (
        <section aria-label="Participantes">
          <CardHeader className="px-0 pb-2">
            <CardTitle className="text-base">Participantes</CardTitle>
          </CardHeader>
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-2 p-4">
              {trip.participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span className="text-foreground">{participant.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Desde {formatDate(participant.addedAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <ExpenseFormDialog
        tripId={trip.id}
        open={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
      />

      <Dialog
        open={isDeliverDialogOpen}
        onOpenChange={setIsDeliverDialogOpen}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Entregar relatório?</DialogTitle>
            <DialogDescription>
              Após entregar, a viagem fica em aprovação e as despesas não poderão
              ser alteradas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeliverDialogOpen(false)}
              disabled={deliverTrip.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleDeliver()}
              disabled={deliverTrip.isPending}
            >
              {deliverTrip.isPending ? "Entregando..." : "Entregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Aprovar relatório?</DialogTitle>
            <DialogDescription>
              Após a aprovação, o relatório segue para o Financeiro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={approveTrip.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleApprove()}
              disabled={approveTrip.isPending}
            >
              {approveTrip.isPending ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Retornar para correção</DialogTitle>
            <DialogDescription>
              O colaborador recupera a edição e poderá reenviar o relatório.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="justificativaRetorno">Justificativa</Label>
            <textarea
              id="justificativaRetorno"
              value={returnJustificativa}
              onChange={(event) => {
                setReturnJustificativa(event.target.value);
                setReturnError("");
              }}
              rows={3}
              placeholder="Ex.: Comprovante ilegível, valor fora do limite"
              aria-invalid={Boolean(returnError)}
              className={cn(
                "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
              )}
            />
            {returnError ? (
              <p className="text-sm text-danger">{returnError}</p>
            ) : null}
          </div>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReturnDialogOpen(false)}
              disabled={returnTrip.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleReturn()}
              disabled={returnTrip.isPending}
            >
              {returnTrip.isPending ? "Retornando..." : "Retornar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reimbursabilityTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReimbursabilityTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Alterar reembolsabilidade</DialogTitle>
            <DialogDescription>
              A despesa passará para{" "}
              {reimbursabilityTarget?.reembolsavel
                ? "não reembolsável"
                : "reembolsável"}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="justificativaReembolsabilidade">Justificativa</Label>
            <textarea
              id="justificativaReembolsabilidade"
              value={reimbursabilityJustificativa}
              onChange={(event) => {
                setReimbursabilityJustificativa(event.target.value);
                setReimbursabilityError("");
              }}
              rows={3}
              placeholder="Ex.: Despesa não comprovada"
              aria-invalid={Boolean(reimbursabilityError)}
              className={cn(
                "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
              )}
            />
            {reimbursabilityError ? (
              <p className="text-sm text-danger">{reimbursabilityError}</p>
            ) : null}
          </div>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReimbursabilityTarget(null)}
              disabled={changeReimbursability.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleReimbursabilitySave()}
              disabled={changeReimbursability.isPending}
            >
              {changeReimbursability.isPending
                ? "Salvando..."
                : "Salvar alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}