"use client";

import { useEffect, useState } from "react";
import { Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import type { TripExpenseView } from "@/types/domain";
import { getErrorMessage } from "@/lib/api";
import { useUpdateExpense } from "../hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExpenseEditDialogProps {
  tripId: string;
  expense: TripExpenseView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseEditDialog({ tripId, expense, open, onOpenChange }: ExpenseEditDialogProps) {
  const updateExpense = useUpdateExpense(tripId);
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setJustificativa(expense.justificativa);
      setError("");
    }
  }, [expense]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = justificativa.trim();
    if (value.length < 3) {
      setError("Informe uma descrição com pelo menos 3 caracteres.");
      return;
    }

    try {
      await updateExpense.mutateAsync({ expenseId: expense!.id, justificativa: value });
      toast.success("Descrição da despesa atualizada.");
      onOpenChange(false);
    } catch (submitError) {
      toast.error(getErrorMessage(submitError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" aria-hidden="true" />
            Editar descrição
          </DialogTitle>
          <DialogDescription>
            Atualize a descrição da despesa. O comprovante permanece o mesmo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Label htmlFor="editar-descricao-despesa">Descrição da despesa</Label>
          <textarea
            id="editar-descricao-despesa"
            value={justificativa}
            onChange={(event) => {
              setJustificativa(event.target.value);
              setError("");
            }}
            rows={4}
            autoFocus
            className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="mt-2 -mx-0 -mb-0 rounded-none border-0 bg-transparent p-0 sm:px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateExpense.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateExpense.isPending}>
              <Save aria-hidden="true" />
              {updateExpense.isPending ? "Salvando..." : "Salvar alteração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}