"use client";

import { useState } from "react";
import { CreditCard, Pencil, Power, Plus } from "lucide-react";
import { toast } from "sonner";
import type {
  CreditCardInput,
  CreditCardView,
  UpdateCreditCardInput,
} from "../api";
import {
  useCreateCreditCard,
  useCreditCards,
  useUpdateCreditCard,
  useUpdateCreditCardStatus,
} from "../hooks";
import { getErrorMessage } from "@/lib/api";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface CardForm {
  cardholderName: string;
  cardNumber: string;
  brand: string;
}

const EMPTY_FORM: CardForm = {
  cardholderName: "",
  cardNumber: "",
  brand: "",
};

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function cleanCardNumber(value: string): string {
  return value.replace(/\D/g, "");
}

function passesLuhn(number: string): boolean {
  let sum = 0;
  let doubleDigit = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function brandLabel(brand: string | null): string {
  if (brand === "AMERICAN_EXPRESS") return "American Express";
  if (brand === "MASTERCARD") return "Mastercard";
  if (brand === "VISA") return "Visa";
  return brand ?? "Bandeira não identificada";
}

function detectBrand(number: string): string | null {
  if (/^4/.test(number)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(number)) return "Mastercard";
  if (/^3[47]/.test(number)) return "American Express";
  if (/^(6011|65|64[4-9])/.test(number)) return "Elo";
  return number.length >= 2 ? "Outra bandeira" : null;
}

export function CreditCardSection() {
  const cardsQuery = useCreditCards(true);
  const createCard = useCreateCreditCard();
  const updateCard = useUpdateCreditCard();
  const updateStatus = useUpdateCreditCardStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardView | null>(null);
  const [form, setForm] = useState<CardForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingCard(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(card: CreditCardView) {
    setEditingCard(card);
    setForm({
      cardholderName: card.cardholderName,
      cardNumber: "",
      brand: card.brand ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  function setField(field: keyof CardForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field !== "cardNumber") {
      setError(null);
      return;
    }

    const number = cleanCardNumber(value);
    if (number.length > 19) {
      setError("O número do cartão não pode ter mais de 19 dígitos.");
    } else if (number.length >= 13 && !passesLuhn(number)) {
      setError("Confira o número do cartão: ele não passou na validação.");
    } else {
      setError(null);
    }
  }

  async function handleSubmit() {
    const cardholderName = form.cardholderName.trim();
    const cardNumber = cleanCardNumber(form.cardNumber);
    if (cardholderName.length < 2) {
      setError("Informe o nome impresso no cartão.");
      return;
    }
    if (!editingCard && (cardNumber.length < 13 || cardNumber.length > 19)) {
      setError("O número do cartão deve ter entre 13 e 19 dígitos.");
      return;
    }
    if (editingCard && cardNumber.length > 0 && (cardNumber.length < 13 || cardNumber.length > 19)) {
      setError("O número do cartão deve ter entre 13 e 19 dígitos ou ficar vazio.");
      return;
    }
    if (cardNumber.length > 0 && !passesLuhn(cardNumber)) {
      setError("Confira o número do cartão: ele não passou na validação.");
      return;
    }

    try {
      if (editingCard) {
        const input: UpdateCreditCardInput = {
          cardholderName,
          brand: form.brand.trim() || null,
          ...(cardNumber ? { cardNumber } : {}),
        };
        await updateCard.mutateAsync({ cardId: editingCard.id, input });
      } else {
        const input: CreditCardInput = {
          cardholderName,
          cardNumber,
          brand: form.brand.trim() || null,
        };
        await createCard.mutateAsync(input);
      }
      setDialogOpen(false);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  }

  async function toggleStatus(card: CreditCardView) {
    try {
      await updateStatus.mutateAsync({ cardId: card.id, active: !card.active });
    } catch (statusError) {
      toast.error(getErrorMessage(statusError));
    }
  }

  const saving = createCard.isPending || updateCard.isPending;
  const cleanNumber = cleanCardNumber(form.cardNumber);
  const detectedBrand = detectBrand(cleanNumber);
  const cardNumberMaxLength = /^3[47]/.test(cleanNumber) ? 17 : 23;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
          Cartões corporativos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cadastre cartões reutilizáveis. O sistema exibe apenas os quatro últimos dígitos.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {cardsQuery.isLoading ? <Skeleton className="h-16 w-full rounded-xl" /> : null}
        {cardsQuery.isError ? (
          <ErrorState
            message={getErrorMessage(cardsQuery.error)}
            onRetry={() => void cardsQuery.refetch()}
          />
        ) : null}
        {cardsQuery.isSuccess && cardsQuery.data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            Nenhum cartão corporativo cadastrado.
          </p>
        ) : null}
        {cardsQuery.isSuccess ? (
          <div className="flex flex-col divide-y divide-border">
            {cardsQuery.data.map((card) => (
              <div key={card.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{card.cardholderName}</p>
                    <Badge variant={card.active ? "secondary" : "destructive"}>
                      {card.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {brandLabel(card.brand)} · •••• {card.last4}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Editar cartão"
                    onClick={() => openEdit(card)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={card.active ? "Desativar cartão" : "Reativar cartão"}
                    onClick={() => void toggleStatus(card)}
                    disabled={updateStatus.isPending}
                  >
                    <Power aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <Button type="button" variant="outline" onClick={openCreate} className="self-start">
          <Plus aria-hidden="true" />
          Cadastrar cartão
        </Button>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? "Editar cartão" : "Cadastrar cartão corporativo"}</DialogTitle>
            <DialogDescription>
              O número será protegido no backend e não ficará visível após o cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cartao-titular">Nome impresso no cartão</Label>
              <Input
                id="cartao-titular"
                value={form.cardholderName}
                onChange={(event) => setField("cardholderName", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cartao-numero">
                Número {editingCard ? "(preencha apenas se for substituir)" : ""}
              </Label>
              <Input
                id="cartao-numero"
                inputMode="numeric"
                autoComplete="off"
                maxLength={cardNumberMaxLength}
                value={maskCardNumber(form.cardNumber)}
                onChange={(event) => setField("cardNumber", event.target.value)}
                placeholder={editingCard ? "•••• •••• •••• ••••" : "0000 0000 0000 0000"}
                aria-invalid={Boolean(error && form.cardNumber)}
              />
              {detectedBrand ? (
                <p className="text-xs text-muted-foreground">
                  Bandeira identificada: <span className="font-medium text-foreground">{detectedBrand}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cartao-bandeira">Bandeira (opcional)</Label>
              <Input
                id="cartao-bandeira"
                value={form.brand}
                onChange={(event) => setField("brand", event.target.value)}
                placeholder="Identificada automaticamente quando possível"
              />
            </div>
            {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? "Salvando..." : editingCard ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}