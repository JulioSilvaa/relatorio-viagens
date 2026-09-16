"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  SendHorizontal,
  Trash2,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useTrip,
  useDeliverTrip,
  useApproveTrip,
  useReturnTrip,
  useUsers,
  useAddParticipant,
  useRemoveParticipant,
} from "../hooks";
import { TripStatusBadge } from "../components/trip-status-badge";
import { ExpenseFormDialog } from "@/modules/expenses/components/expense-form-dialog";
import { ExpenseEditDialog } from "@/modules/expenses/components/expense-edit-dialog";
import { receiptFileUrl } from "@/modules/expenses/api";
import { useChangeReimbursability } from "@/modules/expenses/hooks";
import { ReceiptOcrDialog } from "@/modules/ocr/components/receipt-ocr-dialog";
import { AdvanceSection } from "@/modules/advances/components/advance-section";
import { useSession } from "@/modules/auth/session-context";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/api";
import { downloadReport } from "@/modules/reports/api";
import type { ReportKind } from "@/modules/reports/api";
import { formatDate, formatMoney, formatPeriodo, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TripExpenseView, TripParticipantView } from "@/types/domain";
import { cn } from "cn";

const EDITABLE_TRIP_STATUSES = new Set(["EM_ANDAMENTO", "EM_CORRECAO"]);
const APPROVED_TRIP_STATUSES = new Set([
  "APROVADA",
  "FINANCEIRO",
  "FINALIZADA",
]);

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useSession();
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  const [deliverMessage, setDeliverMessage] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approveTaxa, setApproveTaxa] = useState("");
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isAddParticipantDialogOpen, setIsAddParticipantDialogOpen] =
    useState(false);
  const [participantUserId, setParticipantUserId] = useState("");
  const [participantToRemove, setParticipantToRemove] =
    useState<TripParticipantView | null>(null);
  const [returnJustificativa, setReturnJustificativa] = useState("");
  const [returnError, setReturnError] = useState("");
  const [reimbursabilityTarget, setReimbursabilityTarget] =
    useState<TripExpenseView | null>(null);
  const [reimbursabilityJustificativa, setReimbursabilityJustificativa] =
    useState("");
  const [reimbursabilityError, setReimbursabilityError] = useState("");
  const [reportIncludeReceipts, setReportIncludeReceipts] = useState(true);
  const [reportDownloading, setReportDownloading] = useState<ReportKind | null>(
    null,
  );
  const [ocrReceipt, setOcrReceipt] = useState<
    TripExpenseView["receipts"][number] | null
  >(null);
  const [editingExpense, setEditingExpense] = useState<TripExpenseView | null>(null);
  const { data: trip, isLoading, isError, error, refetch } = useTrip(params.id);
  const deliverTrip = useDeliverTrip(params.id);
  const approveTrip = useApproveTrip();
  const returnTrip = useReturnTrip();
  const changeReimbursability = useChangeReimbursability(params.id);
  const canManageParticipants =
    trip !== undefined &&
    trip.status === "EM_ANDAMENTO" &&
    user !== null &&
    (user.roleCode === "MANAGER_ADMIN" || trip.criadoPor.id === user.id);
  const usersQuery = useUsers(canManageParticipants);
  const addParticipant = useAddParticipant(params.id);
  const removeParticipant = useRemoveParticipant(params.id);

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
  const despesasComComprovante = trip.despesas.filter((despesa) =>
    despesa.receipts.some((receipt) => receipt.ativo),
  ).length;
  const reembolsavel = trip.despesas.some((despesa) => despesa.reembolsavel);
  const canEdit =
    EDITABLE_TRIP_STATUSES.has(trip.status) &&
    user !== null &&
    trip.participants.some((participant) => participant.userId === user.id);
  const canApprove =
    trip.status === "EM_APROVACAO" && user?.roleCode === "MANAGER_ADMIN";
  const canGeneratePdf =
    user?.roleCode === "MANAGER_ADMIN" ||
    user?.roleCode === "FINANCE" ||
    user?.roleCode === "FISCAL";
  const kmReembolsavel =
    trip.tipoVeiculo === "PROPRIO" &&
    trip.kmInicial !== null &&
    trip.kmFinal !== null;
  const availableUsers = (usersQuery.data ?? []).filter(
    (member) =>
      !trip.participants.some(
        (participant) => participant.userId === member.id,
      ),
  );

  async function handleDeliver() {
    try {
      await deliverTrip.mutateAsync(deliverMessage);
      toast.success("Relatório entregue para aprovação.");
      setIsDeliverDialogOpen(false);
      setDeliverMessage("");
    } catch (deliverError) {
      toast.error(
        deliverError instanceof Error
          ? deliverError.message
          : "Não foi possível entregar o relatório.",
      );
    }
  }

  async function handleApprove() {
    const taxaKm = approveTaxa === "" ? null : Number(approveTaxa);
    if (taxaKm !== null && (Number.isNaN(taxaKm) || taxaKm <= 0)) {
      toast.error("Informe a taxa por km (maior que zero).");
      return;
    }
    try {
      await approveTrip.mutateAsync({ tripId: params.id, taxaKm });
      toast.success("Relatório aprovado.");
      setIsApproveDialogOpen(false);
      setApproveTaxa("");
    } catch (approveError) {
      toast.error(
        approveError instanceof Error
          ? approveError.message
          : "Não foi possível aprovar o relatório.",
      );
    }
  }

  function openApproveDialog() {
    setApproveTaxa(trip?.taxaKm ?? "");
    setIsApproveDialogOpen(true);
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

  async function handleAddParticipant() {
    try {
      await addParticipant.mutateAsync(participantUserId);
      toast.success("Colaborador adicionado à viagem.");
      setIsAddParticipantDialogOpen(false);
      setParticipantUserId("");
    } catch (participantError) {
      toast.error(
        participantError instanceof Error
          ? participantError.message
          : "Não foi possível adicionar o colaborador.",
      );
    }
  }

  async function handleRemoveParticipant() {
    if (!participantToRemove) return;
    try {
      await removeParticipant.mutateAsync(participantToRemove.userId);
      toast.success("Colaborador removido da viagem.");
      setParticipantToRemove(null);
    } catch (participantError) {
      toast.error(
        participantError instanceof Error
          ? participantError.message
          : "Não foi possível remover o colaborador.",
      );
    }
  }


  async function handleDownloadReport(kind: ReportKind) {
    setReportDownloading(kind);
    try {
      await downloadReport(params.id, kind, reportIncludeReceipts);
      if (kind === "oficial") {
        toast.success("Relatório oficial baixado.");
      } else {
        toast.success("Resumo gerencial baixado.");
      }
    } catch (downloadError) {
      toast.error(
        downloadError instanceof Error
          ? downloadError.message
          : "Não foi possível baixar o relatório.",
      );
    } finally {
      setReportDownloading(null);
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Voltar">
            <Link href="/viagens">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {trip.cliente}
          </h1>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          #{trip.id.slice(0, 8)}
        </span>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-medium">
              {trip.cidade} - <span className="uppercase">{trip.uf}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatPeriodo(trip.dataSaida, trip.dataRetorno)}
            </p>
            {trip.motivo ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {trip.motivo}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <TripStatusBadge status={trip.status} />
            <span className="text-xs text-muted-foreground">Viagem</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col p-2">
          <div className="flex items-center justify-between gap-3 border-b border-border px-2 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" aria-hidden="true" />
              Participantes
            </span>
            <span className="font-semibold tabular-nums">{trip.participants.length}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border px-2 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ReceiptText className="size-4" aria-hidden="true" />
              Despesas
            </span>
            <span className="font-semibold tabular-nums">{trip.despesas.length}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border px-2 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Paperclip className="size-4" aria-hidden="true" />
              Comprovantes
            </span>
            <span className="font-semibold tabular-nums">{totalComprovantes}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-2 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-4" aria-hidden="true" />
              Total
            </span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums">{formatMoney(totalDespesas)}</span>
              <span className="block text-xs text-muted-foreground">
                {reembolsavel ? "Reembolsável" : "Não reembolsável"}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {canGeneratePdf ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <FileText
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium text-foreground">Relatórios</p>
            </div>
            {APPROVED_TRIP_STATUSES.has(trip.status) ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reportIncludeReceipts}
                  onChange={(event) =>
                    setReportIncludeReceipts(event.target.checked)
                  }
                  className="size-4 rounded border-input accent-primary"
                />
                Incluir comprovantes anexados
              </label>
            ) : null}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                size="lg"
                className="h-10 w-full"
                onClick={() => void handleDownloadReport("oficial")}
                disabled={
                  reportDownloading !== null ||
                  !APPROVED_TRIP_STATUSES.has(trip.status)
                }
                title={
                  APPROVED_TRIP_STATUSES.has(trip.status)
                    ? undefined
                    : "Disponível após a aprovação do relatório"
                }
              >
                <FileText aria-hidden="true" />
                {reportDownloading === "oficial"
                  ? "Baixando..."
                  : "Baixar relatório oficial (PDF)"}
              </Button>
              {!APPROVED_TRIP_STATUSES.has(trip.status) ? (
                <p className="text-xs text-muted-foreground">
                  O relatório oficial fica disponível após a aprovação.
                </p>
              ) : null}
              <Button
                size="lg"
                variant="outline"
                className="h-10 w-full"
                onClick={() => void handleDownloadReport("gerencial")}
                disabled={reportDownloading !== null}
              >
                <FileText aria-hidden="true" />
                {reportDownloading === "gerencial"
                  ? "Baixando..."
                  : "Baixar resumo gerencial (PDF)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
              Revise as despesas e os comprovantes abaixo. Clique no selo de uma
              despesa para alterar a reembolsabilidade.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                size="lg"
                className="h-10 w-full"
                onClick={() => openApproveDialog()}
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

      <AdvanceSection
        trip={trip}
        canEdit={canEdit}
        userRole={user?.roleCode ?? null}
      />

      <section aria-label="Despesas">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Despesas</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {despesasComComprovante} de {trip.despesas.length} com comprovante
            </p>
          </div>
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
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {trip.despesas.map((despesa) => (
              <li key={despesa.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {despesa.category?.name ?? "Sem categoria"}
                        </p>
                        {despesa.alertaExcesso ? (
                          <Badge variant="destructive">Acima do limite</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {formatDate(despesa.dataDespesa)} · {despesa.criadoPor.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatMoney(despesa.valor)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {despesa.receipts.filter((receipt) => receipt.ativo).length === 1
                            ? "1 comprovante"
                            : `${despesa.receipts.filter((receipt) => receipt.ativo).length} comprovantes`}
                        </p>
                      </div>
                      <ChevronDown
                        className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </div>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {canApprove ? (
                        <Button
                          variant={despesa.reembolsavel ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setReimbursabilityTarget(despesa);
                            setReimbursabilityJustificativa("");
                            setReimbursabilityError("");
                          }}
                          title="Alterar reembolsabilidade"
                        >
                          {despesa.reembolsavel ? "Reembolsável" : "Não reembolsável"}
                        </Button>
                      ) : (
                        <Badge variant={despesa.reembolsavel ? "secondary" : "outline"}>
                          {despesa.reembolsavel ? "Reembolsável" : "Não reembolsável"}
                        </Badge>
                      )}
                      {despesa.alertaExcesso ? (
                        <span className="text-xs font-medium text-warning">
                          Excede em {formatMoney(despesa.alertaExcesso)}
                        </span>
                      ) : null}
                    </div>
                    {despesa.justificativa ? (
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{despesa.justificativa}</p>
                        {canEdit && despesa.criadoPor.id === user?.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar descrição da despesa"
                            title="Editar descrição"
                            onClick={() => setEditingExpense(despesa)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    ) : canEdit && despesa.criadoPor.id === user?.id ? (
                      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setEditingExpense(despesa)}>
                        <Pencil aria-hidden="true" />
                        Adicionar descrição
                      </Button>
                    ) : null}
                    {despesa.receipts.filter((receipt) => receipt.ativo).length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {despesa.receipts
                          .filter((receipt) => receipt.ativo)
                          .map((receipt) => (
                            <li key={receipt.id} className="flex items-center justify-between gap-2 text-xs">
                              <a
                                href={receiptFileUrl(receipt.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 items-center gap-1.5 text-foreground underline-offset-3 hover:underline"
                              >
                                <Paperclip className="size-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{receipt.fileName}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => setOcrReceipt(receipt)}
                                className="shrink-0 rounded-full border border-border px-1.5 py-0.5 font-medium transition-colors hover:bg-accent"
                                title="Ver dados extraídos / preencher manualmente"
                              >
                                {receipt.ocr
                                  ? receipt.ocr.origem === "MANUAL"
                                    ? "Manual"
                                    : receipt.ocr.status === "SUCESSO"
                                      ? "OCR ok"
                                      : receipt.ocr.status === "FALHA"
                                        ? "OCR falhou"
                                        : "OCR pendente"
                                  : "Sem OCR"}
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-xs font-medium text-destructive">
                        Sem comprovante — a entrega está bloqueada.
                      </p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="text-sm font-medium">
              Relatório pronto para entrega?
            </p>
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

      {trip.participants.length > 0 || canManageParticipants ? (
        <section aria-label="Participantes">
          <div className="flex items-center justify-between gap-2 px-0 pb-2">
            <CardHeader className="p-0">
              <CardTitle className="text-base">Participantes</CardTitle>
            </CardHeader>
            {canManageParticipants ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParticipantUserId("");
                  setIsAddParticipantDialogOpen(true);
                }}
              >
                <Plus aria-hidden="true" />
                Adicionar
              </Button>
            ) : null}
          </div>
          <Card className="shadow-sm">
            <CardContent className="flex flex-col p-2">
              {trip.participants.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Nenhum colaborador autorizado a viajar até o momento.
                </p>
              ) : (
                trip.participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center gap-3 border-b border-border px-2 py-2.5 text-sm last:border-0"
                  >
                    <Avatar size="sm" className="shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">{participant.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Desde {formatDate(participant.addedAt)}
                        {participant.cartaoLast4 ? (
                          <> · •••• {participant.cartaoLast4}</>
                        ) : canManageParticipants ? (
                          <> · Sem cartão</>
                        ) : null}
                      </p>
                    </div>
                    {canManageParticipants ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label={`Remover ${participant.name}`}
                        onClick={() => setParticipantToRemove(participant)}
                        disabled={removeParticipant.isPending}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {isExpenseFormOpen ? (
        <ExpenseFormDialog
          tripId={trip.id}
          open
          onOpenChange={setIsExpenseFormOpen}
        />
      ) : null}
      {editingExpense ? (
        <ExpenseEditDialog
          tripId={trip.id}
          expense={editingExpense}
          open
          onOpenChange={(open) => {
            if (!open) setEditingExpense(null);
          }}
        />
      ) : null}

      <ReceiptOcrDialog
        key={ocrReceipt?.id ?? "none"}
        receipt={ocrReceipt}
        open={ocrReceipt !== null}
        readOnly={!canEdit && !canApprove}
        onOpenChange={(open) => {
          if (!open) setOcrReceipt(null);
        }}
        onSaved={() => void refetch()}
      />

      <Dialog
        open={isDeliverDialogOpen}
        onOpenChange={(open) => {
          setIsDeliverDialogOpen(open);
          if (!open) setDeliverMessage("");
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Entregar relatório?</DialogTitle>
            <DialogDescription>
              Após entregar, a viagem fica em aprovação e as despesas não
              poderão ser alteradas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mensagem-entrega">
              Mensagem para a aprovação <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              id="mensagem-entrega"
              value={deliverMessage}
              onChange={(event) => setDeliverMessage(event.target.value.slice(0, 500))}
              rows={4}
              maxLength={500}
              placeholder="Ex.: Despesa de estacionamento paga em dinheiro; comprovante conferido."
              className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <p className="text-right text-xs text-muted-foreground">{deliverMessage.length}/500</p>
          </div>
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
          {kmReembolsavel ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="aprovar-taxaKm">Taxa por km (R$)</Label>
              <MoneyInput
                id="aprovar-taxaKm"
                value={approveTaxa}
                onValueChange={setApproveTaxa}
              />
              <p className="text-xs text-muted-foreground">
                Valor de reembolso por km rodado. Se deixar em branco, mantém a
                taxa atual congelada na viagem.
              </p>
            </div>
          ) : null}
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
            <Label htmlFor="justificativaReembolsabilidade">
              Justificativa
            </Label>
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

      <Dialog
        open={isAddParticipantDialogOpen}
        onOpenChange={setIsAddParticipantDialogOpen}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Adicionar colaborador</DialogTitle>
            <DialogDescription>
              O colaborador passa a acessar esta viagem e lançar suas próprias
              despesas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="participante">Colaborador</Label>
            <Select
              value={participantUserId}
              onValueChange={setParticipantUserId}
            >
              <SelectTrigger id="participante" className="w-full">
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableUsers.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Todos os colaboradores já participam da viagem.
                    </p>
                  ) : (
                    availableUsers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddParticipantDialogOpen(false)}
              disabled={addParticipant.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddParticipant()}
              disabled={addParticipant.isPending || !participantUserId}
            >
              {addParticipant.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={participantToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setParticipantToRemove(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remover colaborador</DialogTitle>
            <DialogDescription>
              {participantToRemove
                ? `${participantToRemove.name} deixará de acessar esta viagem e não poderá lançar despesas.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setParticipantToRemove(null)}
              disabled={removeParticipant.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRemoveParticipant()}
              disabled={removeParticipant.isPending}
            >
              {removeParticipant.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
