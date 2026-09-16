import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  Hourglass,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AdvanceStatus } from "@/types/domain";

export interface AdvanceStatusMeta {
  label: string;
  dotClass: string;
  badgeClass: string;
  icon: LucideIcon;
}

const STATUS_META: Record<AdvanceStatus, AdvanceStatusMeta> = {
  SOLICITADO: {
    label: "Solicitado",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-transparent",
    icon: Clock3,
  },
  EM_ANALISE: {
    label: "Em análise",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    icon: Search,
  },
  APROVADO: {
    label: "Aprovado",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    icon: CheckCircle2,
  },
  RECUSADO: {
    label: "Recusado",
    dotClass: "bg-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-transparent",
    icon: XCircle,
  },
  PAGAMENTO_PENDENTE: {
    label: "Pagamento pendente",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    icon: Hourglass,
  },
  PAGO: {
    label: "Pago",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    icon: CheckCircle2,
  },
};

export function getAdvanceStatusMeta(status: AdvanceStatus): AdvanceStatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      dotClass: "bg-muted-foreground",
      badgeClass: "bg-muted text-muted-foreground border-transparent",
      icon: CircleHelp,
    }
  );
}
