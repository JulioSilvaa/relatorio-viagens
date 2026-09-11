"use client";

import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { useExpenseCategories, useCreateExpense } from "../hooks";
import { parseMoneyInput } from "@/lib/format";
import { RECEIPT_TYPES, type ReceiptTypeValue } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";

const MAX_RECEIPTS = 5;

function ReceiptPreview({ file }: { file: File }) {
  const [src] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(src);
  }, [src]);

  return (
    <img
      src={src}
      alt={`Pré-visualização de ${file.name}`}
      className="size-16 shrink-0 rounded-lg border border-border object-cover"
    />
  );
}

const RECEIPT_TYPE_LABELS: Record<ReceiptTypeValue, string> = {
  NOTA_FISCAL: "Nota fiscal",
  CUPOM_FISCAL: "Cupom fiscal",
  NOTA_MANUAL: "Nota manual",
  COMPROVANTE_CARTAO: "Comprovante de cartão",
  OUTRO: "Outro",
};

interface ExpenseFormDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseFormDialog({
  tripId,
  open,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const categoriesQuery = useExpenseCategories();
  const createExpense = useCreateExpense(tripId);

  const categories = categoriesQuery.data ?? [];

  const [categoryCode, setCategoryCode] = useState("");
  const [tipoComprovante, setTipoComprovante] = useState<ReceiptTypeValue>(
    "OUTRO",
  );
  const [dataDespesa, setDataDespesa] = useState("");
  const [valor, setValor] = useState("");
  const [reembolsavel, setReembolsavel] = useState("true");
  const [justificativa, setJustificativa] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCategoryCode("");
      setTipoComprovante("OUTRO");
      setDataDespesa(new Date().toISOString().slice(0, 10));
      setValor("");
      setReembolsavel("true");
      setJustificativa("");
      setFiles([]);
      setErrors({});
    }
  }

  const isKmRodados = categoryCode === "KM_RODADOS";

  function setField(key: string, value: string) {
    if (key === "categoryCode") {
      if (value !== "KM_RODADOS") setValor("");
      setCategoryCode(value);
    } else if (key === "tipoComprovante") {
      setTipoComprovante(value as ReceiptTypeValue);
    } else if (key === "dataDespesa") {
      setDataDespesa(value);
    } else if (key === "reembolsavel") {
      setReembolsavel(value);
    } else if (key === "justificativa") {
      setJustificativa(value);
    }
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, MAX_RECEIPTS);
    setFiles(selected);
    setErrors((current) => ({ ...current, files: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedValor = isKmRodados ? null : parseMoneyInput(valor);
    const fieldErrors: Record<string, string> = {};

    if (!categoryCode) fieldErrors.categoryCode = "Selecione a categoria.";
    if (!dataDespesa) fieldErrors.dataDespesa = "Informe a data.";
    if (!isKmRodados && parsedValor === null) {
      fieldErrors.valor = "Informe um valor válido.";
    } else if (!isKmRodados && parsedValor !== null && parsedValor <= 0) {
      fieldErrors.valor = "O valor deve ser maior que zero.";
    }
    if (!justificativa.trim() || justificativa.trim().length < 3) {
      fieldErrors.justificativa = "Informe a justificativa (mín. 3 caracteres).";
    }
    if (files.length === 0) {
      fieldErrors.files = "Adicione ao menos 1 comprovante.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    try {
      await createExpense.mutateAsync({
        input: {
          tripId,
          categoryCode,
          valor: parsedValor,
          dataDespesa,
          reembolsavel: reembolsavel === "true",
          justificativa: justificativa.trim(),
          tipoComprovante,
        },
        files,
      });
      toast.success("Despesa registrada.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a despesa.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
          <DialogDescription>
            Informe os dados e anexe os comprovantes.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoryCode} onValueChange={(value) => setField("categoryCode", value)}>
              <SelectTrigger id="categoria" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.code}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.categoryCode ? (
              <p className="text-sm text-danger">{errors.categoryCode}</p>
            ) : null}
          </div>

          {!isKmRodados ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor</Label>
              <MoneyInput
                id="valor"
                value={valor}
                onValueChange={(value) => {
                  setValor(value);
                  setErrors((current) => ({ ...current, valor: undefined }));
                }}
                aria-invalid={Boolean(errors.valor)}
              />
              {errors.valor ? (
                <p className="text-sm text-danger">{errors.valor}</p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Valor calculado a partir do KM percorrido da viagem.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="dataDespesa">Data da despesa</Label>
            <Input
              id="dataDespesa"
              type="date"
              value={dataDespesa}
              onChange={(event) => setField("dataDespesa", event.target.value)}
              aria-invalid={Boolean(errors.dataDespesa)}
            />
            {errors.dataDespesa ? (
              <p className="text-sm text-danger">{errors.dataDespesa}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reembolsavel">Reembolsável</Label>
            <Select
              value={reembolsavel}
              onValueChange={(value) => setField("reembolsavel", value)}
            >
              <SelectTrigger id="reembolsavel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tipoComprovante">Tipo de comprovante</Label>
            <Select
              value={tipoComprovante}
              onValueChange={(value) => setField("tipoComprovante", value)}
            >
              <SelectTrigger id="tipoComprovante" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RECEIPT_TYPES.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {RECEIPT_TYPE_LABELS[tipo]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="justificativa">Justificativa</Label>
            <textarea
              id="justificativa"
              value={justificativa}
              onChange={(event) => setField("justificativa", event.target.value)}
              rows={3}
              placeholder="Ex.: Deslocamento até o cliente"
              aria-invalid={Boolean(errors.justificativa)}
              className={cn(
                "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
              )}
            />
            {errors.justificativa ? (
              <p className="text-sm text-danger">{errors.justificativa}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="comprovantes">Comprovantes</Label>
            <input
              id="comprovantes"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />
            <label
              htmlFor="comprovantes"
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-3 py-6 text-center transition-colors hover:bg-muted/50",
                errors.files && "border-destructive",
              )}
            >
              <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">
                Adicionar comprovantes
              </span>
              <span className="text-xs text-muted-foreground">
                Até {MAX_RECEIPTS} imagens (foto ou arquivo)
              </span>
            </label>
            {files.length > 0 ? (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-muted p-2"
                  >
                    <ReceiptPreview file={file} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {errors.files ? (
              <p className="text-sm text-danger">{errors.files}</p>
            ) : null}
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createExpense.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createExpense.isPending || categoriesQuery.isLoading}
            >
              {createExpense.isPending ? "Salvando..." : "Salvar despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}