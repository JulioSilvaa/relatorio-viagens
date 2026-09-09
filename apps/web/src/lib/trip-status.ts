import type { TripStatus } from "@/types/domain";

export interface TripStatusMeta {
  label: string;
  dotClass: string;
  badgeClass: string;
  emoji: string;
}

const STATUS_META: Record<TripStatus, TripStatusMeta> = {
  EM_ANDAMENTO: {
    label: "Em andamento",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-transparent",
    emoji: "🟡",
  },
  EM_APROVACAO: {
    label: "Em aprovação",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    emoji: "🔵",
  },
  EM_CORRECAO: {
    label: "Em correção",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-transparent",
    emoji: "🟠",
  },
  APROVADA: {
    label: "Aprovada",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    emoji: "🟢",
  },
  FINANCEIRO: {
    label: "Financeiro",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    emoji: "💰",
  },
  FINALIZADA: {
    label: "Finalizada",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    emoji: "✅",
  },
  CANCELADA: {
    label: "Cancelada",
    dotClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-transparent",
    emoji: "❌",
  },
};

export function getTripStatusMeta(status: TripStatus): TripStatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      dotClass: "bg-muted-foreground",
      badgeClass: "bg-muted text-muted-foreground border-transparent",
      emoji: "❔",
    }
  );
}
