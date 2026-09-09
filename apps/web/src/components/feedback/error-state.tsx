import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center"
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-2 h-10" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
