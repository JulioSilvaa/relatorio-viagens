import {
  AlertTriangle,
  Banknote,
  Bell,
  CheckCircle2,
  PlaneTakeoff,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NotificationMeta {
  icon: LucideIcon;
  chipClass: string;
}

const EVENT_META: Record<string, NotificationMeta> = {
  VIAGEM_CRIADA: { icon: PlaneTakeoff, chipClass: "bg-info/15 text-info" },
  ADIANTAMENTO_SOLICITADO: { icon: Wallet, chipClass: "bg-warning/15 text-warning" },
  ADIANTAMENTO_PAGO: { icon: Banknote, chipClass: "bg-success/15 text-success" },
  RELATORIO_APROVADO: { icon: CheckCircle2, chipClass: "bg-success/15 text-success" },
  RELATORIO_RETORNADO: { icon: Undo2, chipClass: "bg-warning/15 text-warning" },
  REEMBOLSO_PAGO: { icon: Banknote, chipClass: "bg-success/15 text-success" },
  PROBLEMA_FISCAL: { icon: AlertTriangle, chipClass: "bg-danger/15 text-danger" },
};

const FALLBACK_META: NotificationMeta = { icon: Bell, chipClass: "bg-muted text-muted-foreground" };

export function getNotificationMeta(event: string): NotificationMeta {
  return EVENT_META[event] ?? FALLBACK_META;
}
