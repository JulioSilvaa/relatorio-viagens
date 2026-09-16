import {
  CheckCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  PenLine,
  Send,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { TripStatus } from "@/types/domain";

export interface TripStatusMeta {
  label: string;
  dotClass: string;
  badgeClass: string;
  icon: LucideIcon;
}

const STATUS_META: Record<TripStatus, TripStatusMeta> = {
  EM_ANDAMENTO: {
    label: "Em andamento",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-transparent",
    icon: Clock3,
  },
  EM_APROVACAO: {
    label: "Em aprovação",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    icon: Send,
  },
  EM_CORRECAO: {
    label: "Em correção",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-transparent",
    icon: PenLine,
  },
  APROVADA: {
    label: "Aprovada",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    icon: CheckCircle2,
  },
  FINANCEIRO: {
    label: "Financeiro",
    dotClass: "bg-info",
    badgeClass: "bg-info/10 text-info border-transparent",
    icon: Wallet,
  },
  FINALIZADA: {
    label: "Finalizada",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-transparent",
    icon: CheckCheck,
  },
  CANCELADA: {
    label: "Cancelada",
    dotClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-transparent",
    icon: XCircle,
  },
};

export function getTripStatusMeta(status: TripStatus): TripStatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      dotClass: "bg-muted-foreground",
      badgeClass: "bg-muted text-muted-foreground border-transparent",
      icon: CircleHelp,
    }
  );
}
