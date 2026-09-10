import type { AdvanceStatus } from "@/types/domain";

export interface AdvanceStatusMeta {
  label: string;
  dotClass: string;
  badgeClass: string;
  emoji: string;
}

const STATUS_META: Record<AdvanceStatus, AdvanceStatusMeta> = {
  SOLICITADO: {
    label: "Solicitado",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-transparent",
    emoji: "🟡",
  },
  EM_ANALISE: {
    label: "Em análise",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    emoji: "🔵",
  },
  APROVADO: {
    label: "Aprovado",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    emoji: "🟢",
  },
  RECUSADO: {
    label: "Recusado",
    dotClass: "bg-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-transparent",
    emoji: "🔴",
  },
  PAGAMENTO_PENDENTE: {
    label: "Pagamento pendente",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    emoji: "⏳",
  },
  PAGO: {
    label: "Pago",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    emoji: "✅",
  },
};

export function getAdvanceStatusMeta(status: AdvanceStatus): AdvanceStatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      dotClass: "bg-muted-foreground",
      badgeClass: "bg-muted text-muted-foreground border-transparent",
      emoji: "❔",
    }
  );
}