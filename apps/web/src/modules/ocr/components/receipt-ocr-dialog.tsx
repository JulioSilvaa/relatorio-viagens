"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, RefreshCw, Save } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { receiptFileUrl } from "@/modules/expenses/api";
import type { TripReceiptOcrView, TripReceiptView } from "@/types/domain";
import {
  extractReceiptOcr,
  saveReceiptOcr,
  type ReceiptOcrRecord,
} from "../api";

export interface ReceiptOcrDialogProps {
  receipt: TripReceiptView | null;
  open: boolean;
  readOnly?: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (record: ReceiptOcrRecord) => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  SUCESSO: "Extração concluída",
  FALHA: "Falha na extração",
};

function statusBadge(status: string): ReactNode {
  const variant =
    status === "SUCESSO"
      ? "secondary"
      : status === "FALHA"
        ? "destructive"
        : "outline";
  return (
    <Badge variant={variant as never}>{STATUS_LABEL[status] ?? status}</Badge>
  );
}

function initialOcr(receipt: TripReceiptView): TripReceiptOcrView {
  return (
    receipt.ocr ?? {
      status: "PENDENTE",
      origem: "MANUAL",
      cnpj: null,
      nomeEstabelecimento: null,
      data: null,
      hora: null,
      valorTotal: null,
      numeroDocumento: null,
      chaveAcesso: null,
      itens: null,
      erro: null,
      extraidoEm: null,
      conferidoPor: null,
      conferidoEm: null,
    }
  );
}

export function ReceiptOcrDialog({
  receipt,
  open,
  readOnly = false,
  onOpenChange,
  onSaved,
}: ReceiptOcrDialogProps) {
  const initial = receipt ? initialOcr(receipt) : null;
  const [processing, setProcessing] = useState(false);
  const [savingOcr, setSavingOcr] = useState(false);
  const [record, setRecord] = useState<ReceiptOcrRecord | null>(null);
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState(
    () => initial?.nomeEstabelecimento ?? "",
  );
  const [cnpj, setCnpj] = useState(() => initial?.cnpj ?? "");
  const [data, setData] = useState(() =>
    initial?.data ? initial.data.slice(0, 10) : "",
  );
  const [hora, setHora] = useState(() => initial?.hora ?? "");
  const [valorTotal, setValorTotal] = useState(() => initial?.valorTotal ?? "");
  const [numeroDocumento, setNumeroDocumento] = useState(
    () => initial?.numeroDocumento ?? "",
  );
  const [chaveAcesso, setChaveAcesso] = useState(
    () => initial?.chaveAcesso ?? "",
  );

  function applyRecord(ocr: ReceiptOcrRecord) {
    setRecord(ocr);
    setNomeEstabelecimento(ocr.nomeEstabelecimento ?? "");
    setCnpj(ocr.cnpj ?? "");
    setData(ocr.data ? ocr.data.slice(0, 10) : "");
    setHora(ocr.hora ?? "");
    setValorTotal(ocr.valorTotal ?? "");
    setNumeroDocumento(ocr.numeroDocumento ?? "");
    setChaveAcesso(ocr.chaveAcesso ?? "");
  }

  async function handleExtract() {
    if (!receipt) return;
    setProcessing(true);
    try {
      const ocr = await extractReceiptOcr(receipt.id);
      applyRecord(ocr);
      toast.success(
        ocr.status === "SUCESSO"
          ? "OCR processado. Confira os dados extraídos."
          : "Não foi possível ler o comprovante. Preencha manualmente.",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  }

  async function handleSave() {
    if (!receipt) return;
    setSavingOcr(true);
    try {
      const ocr = await saveReceiptOcr(receipt.id, {
        nomeEstabelecimento: nomeEstabelecimento.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        data: data || undefined,
        hora: hora || undefined,
        valorTotal:
          valorTotal === "" ? undefined : Number(valorTotal.replace(",", ".")),
        numeroDocumento: numeroDocumento.trim() || undefined,
        chaveAcesso: chaveAcesso.trim() || undefined,
      });
      applyRecord(ocr);
      toast.success("Dados do comprovante salvos.");
      onSaved(ocr);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingOcr(false);
    }
  }

  if (!receipt) return null;
  const status = record?.status ?? receipt.ocr?.status ?? "PENDENTE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            Dados do comprovante{readOnly ? " · somente leitura" : ""}
          </DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-2">
              <a
                href={receiptFileUrl(receipt.id)}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-3 hover:underline"
              >
                {receipt.fileName}
              </a>
              {statusBadge(status)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        {record?.erro || receipt.ocr?.erro ? (
          <p className="text-sm text-warning">
            {record?.erro ?? receipt.ocr?.erro}
          </p>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ocr-estabelecimento">Estabelecimento</Label>
            <Input
              id="ocr-estabelecimento"
              value={nomeEstabelecimento}
              onChange={(event) => setNomeEstabelecimento(event.target.value)}
              placeholder="Nome do estabelecimento"
              disabled={readOnly}
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ocr-cnpj">CNPJ</Label>
              <Input
                id="ocr-cnpj"
                value={cnpj}
                onChange={(event) => setCnpj(event.target.value)}
                placeholder="00.000.000/0000-00"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ocr-valor">Valor (R$)</Label>
              <Input
                id="ocr-valor"
                type="text"
                inputMode="decimal"
                value={valorTotal}
                onChange={(event) => setValorTotal(event.target.value)}
                placeholder="0,00"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ocr-data">Data</Label>
              <Input
                id="ocr-data"
                type="date"
                value={data}
                onChange={(event) => setData(event.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ocr-hora">Hora</Label>
              <Input
                id="ocr-hora"
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ocr-numero">Número do documento</Label>
              <Input
                id="ocr-numero"
                value={numeroDocumento}
                onChange={(event) => setNumeroDocumento(event.target.value)}
                placeholder="Ex.: 004928"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ocr-chave">Chave de acesso</Label>
              <Input
                id="ocr-chave"
                value={chaveAcesso}
                onChange={(event) => setChaveAcesso(event.target.value)}
                placeholder="44 dígitos"
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
        </DialogBody>
        <DialogFooter className="flex-wrap" showCloseButton={false}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.open(receiptFileUrl(receipt.id), "_blank", "noreferrer");
            }}
            title="Abrir o comprovante original em nova aba"
          >
            <Eye aria-hidden="true" />
            Ver original
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExtract()}
            disabled={readOnly || processing || savingOcr}
          >
            <RefreshCw aria-hidden="true" />
            {processing ? "Processando..." : "Processar OCR"}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={readOnly || savingOcr || processing}
          >
            <Save aria-hidden="true" />
            {savingOcr ? "Salvando..." : "Salvar dados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
