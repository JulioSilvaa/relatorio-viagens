"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RefreshCw, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useExpenseCategories, useCreateExpense } from "../hooks";
import { preAnalyzeReceipt } from "../api";
import { saveReceiptOcr } from "@/modules/ocr/api";
import { formatDate, formatMoney, parseMoneyInput } from "@/lib/format";
import type { ReceiptTypeValue } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
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

function ReceiptPreview({ file }: { file: File }) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  const revokeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (revokeTimer.current !== null) {
      window.clearTimeout(revokeTimer.current);
      revokeTimer.current = null;
    }
    return () => {
      revokeTimer.current = window.setTimeout(() => {
        URL.revokeObjectURL(src);
        revokeTimer.current = null;
      }, 0);
    };
  }, [src]);

  return (
    <img
      src={src}
      alt={`Pré-visualização de ${file.name}`}
      className="size-16 shrink-0 rounded-lg border border-border object-cover"
    />
  );
}

const FISCAL_LABELS: Record<string, string> = {
  ncm: "NCM",
  cfop: "CFOP",
  cstCsosn: "CST/CSOSN",
  icms: "ICMS",
  pis: "PIS",
  cofins: "COFINS",
};

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function structuredOcrItems(items: unknown[] | undefined): Array<{
  descricao: string;
  quantidade: string;
  valorUnitario: number | null;
  desconto: number | null;
  valorTotal: number | null;
  fiscal: string;
}> {
  return (items ?? []).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const descricao = typeof record.descricao === "string"
      ? record.descricao
      : typeof record.produto === "string"
        ? record.produto
        : "";
    if (!descricao) return [];
    const quantidade = typeof record.quantidade === "number" || typeof record.quantidade === "string"
      ? String(record.quantidade)
      : "-";
    const fiscal = ["ncm", "cfop", "cstCsosn", "icms", "pis", "cofins"]
      .flatMap((key) => typeof record[key] === "string" && record[key] ? `${FISCAL_LABELS[key] ?? key}: ${record[key]}` : [])
      .join(" · ");
    return [{
      descricao,
      quantidade,
      valorUnitario: numberValue(record.valorUnitario),
      desconto: numberValue(record.desconto),
      valorTotal: numberValue(record.valorTotal),
      fiscal,
    }];
  });
}

type OcrConfidence = "alta" | "media" | "baixa";

const CONFIDENCE_LABELS: Record<OcrConfidence, string> = {
  alta: "Alta confiança",
  media: "Confiança média",
  baixa: "Baixa confiança",
};

function confidenceClass(value: OcrConfidence): string {
  if (value === "baixa") return "text-danger";
  if (value === "media") return "text-warning";
  return "text-primary";
}

const OCR_TO_RECEIPT_TYPE: Record<string, ReceiptTypeValue> = {
  NFC_E: "CUPOM_FISCAL",
  CFE_SAT: "CUPOM_FISCAL",
  NFE: "NOTA_FISCAL",
};

function ocrTypeLabel(value: string | undefined): string {
  const labels: Record<string, string> = {
    NFC_E: "NFC-e",
    CFE_SAT: "CF-e SAT",
    NFE: "NF-e",
    RECIBO: "Recibo",
    COMPROVANTE_PAGAMENTO: "Comprovante de pagamento",
    OUTRO: "Outro documento",
    NAO_IDENTIFICADO: "Não identificado",
  };
  return labels[value ?? ""] ?? value ?? "Não identificado";
}

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
  const [dataDespesa, setDataDespesa] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [valor, setValor] = useState("");
  const [reembolsavel, setReembolsavel] = useState("true");
  const [justificativa, setJustificativa] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<NonNullable<Awaited<ReturnType<typeof preAnalyzeReceipt>>['data']> | null>(null);
  const [confirmadoOcr, setConfirmadoOcr] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const isKmRodados = categoryCode === "KM_RODADOS";
  const allOcrItems = useMemo(
    () => structuredOcrItems(ocrData?.itens),
    [ocrData],
  );

  function setField(key: string, value: string) {
    if (key === "categoryCode") {
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

  function normalizeOcrDate(value: string | undefined): string {
    if (!value) return "";
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const brazilian = value.match(/^(\d{2})[\/.](\d{2})[\/.](\d{4})/);
    return brazilian ? `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}` : "";
  }

  function inferCategoryCode(data: NonNullable<typeof ocrData>): string {
    const source = [data.nomeEstabelecimento, data.textoOriginal]
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const rules: Array<[string, RegExp]> = [
      ["HOTEL", /hotel|pousada|hospedagem/],
      ["COMBUSTIVEL", /posto|gasolina|etanol|diesel|combustivel/],
      ["ESTACIONAMENTO", /estacionamento|parking/],
      ["UBER_TAXI", /uber|taxi|\b99\s*(?:pop|taxi)\b/],
      ["PASSAGENS_AEREAS", /companhia\s*aerea|passagem\s*aerea|aeroporto|latam|gol\s*linhas|azul\s*linhas/],
      ["ALIMENTACAO", /restaurante|lanchonete|padaria|cafeteria|cafe|bar\b|refeicao/],
      ["PEDAGIO", /pedagio/],
      ["METRO", /metro|metrô/],
      ["OUTROS", /farmacia|drogaria/],
    ];
    return rules.find(([, pattern]) => pattern.test(source))?.[0] ?? "";
  }

  function ocrValueNumber(value: string | number | undefined): number | null {
    if (value === undefined || value === null) return null;
    const raw = String(value).replace(/R\$\s*/g, "").replace(/\s/g, "").trim();
    if (!raw) return null;
    const normalized = raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function fillFieldsFromOcr(
    ocr: NonNullable<Awaited<ReturnType<typeof preAnalyzeReceipt>>["data"]>,
  ) {
    const value =
      ocrValueNumber(ocr.valorTotal) ??
      ocrValueNumber(ocr.valorPago) ??
      ocrValueNumber(ocr.valorProdutos);
    if (value !== null) setValor((current) => current || value.toFixed(2));
    const normalizedDate = normalizeOcrDate(ocr.data);
    if (normalizedDate) setDataDespesa(normalizedDate);
    const inferredCategory = inferCategoryCode(ocr);
    if (inferredCategory && categories.some((category) => category.code === inferredCategory)) {
      setCategoryCode(inferredCategory);
    }
    if (ocr.nomeEstabelecimento) setJustificativa(ocr.nomeEstabelecimento);
    if (tipoComprovante === "OUTRO" && ocr.tipoDocumento) {
      const inferredType = OCR_TO_RECEIPT_TYPE[ocr.tipoDocumento];
      if (inferredType) setTipoComprovante(inferredType);
    }
  }

  async function analyzeFile(firstFile: File) {
    setAnalyzing(true);
    setAnalysisMessage(null);
    try {
      const result = await preAnalyzeReceipt(firstFile);
      const ocr = result.data ?? null;
      setOcrData(ocr);
      setConfirmadoOcr(false);
      if (ocr) fillFieldsFromOcr(ocr);
      const hasUsefulFields = Boolean(
        ocr && (ocr.valorTotal || ocr.valorProdutos || ocr.nomeEstabelecimento || ocr.numeroDocumento || ocr.chaveAcesso),
      );
      if (result.status === "SUCESSO" && ocr) {
        setAnalysisMessage(
          hasUsefulFields
            ? "Dados preenchidos pelo OCR. Revise antes de salvar."
            : "Leitura parcial: apenas alguns dados foram reconhecidos. Confira e preencha o restante.",
        );
      } else if (ocr) {
        setAnalysisMessage(
          "A leitura estruturada precisa de revisão. Os dados preliminares do comprovante foram preservados; revise antes de salvar.",
        );
      } else {
        setAnalysisMessage(result.erro ?? "Não foi possível ler o comprovante. Preencha os dados manualmente.");
      }
    } catch {
      setAnalysisMessage("Não foi possível analisar a imagem. Preencha os dados manualmente.");
    } finally {
      setAnalyzing(false);
      setFormStarted(true);
    }
  }

  async function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, 1);
    setFiles(selected);
    setErrors((current) => ({ ...current, files: undefined }));
    const firstFile = selected[0];
    if (firstFile) await analyzeFile(firstFile);
  }

  function removeFile(inputId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.value = "";
    setFiles([]);
    setOcrData(null);
    setConfirmadoOcr(false);
    setAnalysisMessage(null);
    setAnalyzing(false);
    setFormStarted(false);
  }

  function retryAnalysis() {
    const firstFile = files[0];
    if (firstFile) void analyzeFile(firstFile);
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
      fieldErrors.justificativa = "Informe a descrição (mín. 3 caracteres).";
    }
    if (files.length === 0) {
      fieldErrors.files = "Adicione ao menos 1 comprovante.";
    }
    if (ocrData && !confirmadoOcr) {
      fieldErrors.confirmacaoOcr = ocrData.alertaReconciliacao
        ? "Há divergência apontada pela leitura. Verifique e confirme que os dados conferem com o comprovante."
        : "Confirme que os dados conferem com o comprovante antes de salvar.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    try {
      const createdExpense = await createExpense.mutateAsync({
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
      const receipt = createdExpense.receipts?.find((item) => item.ativo) ?? createdExpense.receipts?.[0];
      if (receipt) {
        try {
          await saveReceiptOcr(receipt.id, {
            cnpj: ocrData?.cnpj,
            nomeEstabelecimento: ocrData?.nomeEstabelecimento,
            data: dataDespesa,
            hora: ocrData?.hora,
            valorTotal: parsedValor ?? undefined,
            numeroDocumento: ocrData?.numeroDocumento,
            chaveAcesso: ocrData?.chaveAcesso,
            itens: ocrData?.itens,
            dadosOriginais: ocrData ?? undefined,
          });
        } catch {
          toast.warning("Despesa salva, mas não foi possível confirmar os dados da IA.");
        }
      }
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
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{formStarted ? "Nova despesa" : "Adicionar comprovante"}</DialogTitle>
          <DialogDescription>
            {formStarted
              ? "Revise os dados reconhecidos e complemente o que faltar."
              : "Escolha primeiro a foto do comprovante para tentar preencher os dados automaticamente."}
          </DialogDescription>
        </DialogHeader>

        {!formStarted ? (
          <div className="flex flex-col gap-3">
            <input
              id="comprovantes-inicial"
              type="file"
              accept="image/*"
              onChange={(event) => void handleFilesChange(event)}
              className="hidden"
            />
            <label
              htmlFor="comprovantes-inicial"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input px-3 py-8 text-center hover:bg-muted/50"
            >
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">Escolher comprovante</span>
              <span className="text-xs text-muted-foreground">
                A análise começa ao selecionar a imagem.
              </span>
            </label>
            {files[0] ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-2">
                <ReceiptPreview file={files[0]} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{files[0].name}</p>
                  <p className="text-xs text-muted-foreground">Pronto para análise</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remover comprovante" onClick={() => removeFile("comprovantes-inicial")}>
                  <X aria-hidden="true" />
                </Button>
              </div>
            ) : null}
            {analyzing ? (
              <p className="text-sm text-muted-foreground">
                Analisando comprovante...
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
{ocrData ? (
          <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <p className="flex items-center justify-between gap-2 font-medium text-foreground">
              <span>Dados reconhecidos por IA — revise antes de salvar</span>
              {ocrData.confiancaExtracao ? (
                <Badge variant="outline" className={`border-transparent ${confidenceClass(ocrData.confiancaExtracao)}`}>
                  {CONFIDENCE_LABELS[ocrData.confiancaExtracao]}
                </Badge>
              ) : null}
            </p>
            {ocrData.alertaReconciliacao ? (
              <p role="alert" className="flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-xs leading-snug text-warning">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                Há divergência entre os itens e o valor total reconhecidos. Verifique antes de confirmar.
              </p>
            ) : null}
            <p>Valor: R$ {ocrData.valorTotal ? formatMoney(ocrData.valorTotal) : "—"}</p>
            <p>Tipo de documento: {ocrTypeLabel(ocrData.tipoDocumento)}
              {ocrData.tipoDocumentoConfianca ? (
                <span className={`text-xs ${confidenceClass(ocrData.tipoDocumentoConfianca)}`}>
                  {" "}({CONFIDENCE_LABELS[ocrData.tipoDocumentoConfianca]})
                </span>
              ) : null}
            </p>
            {ocrData.nomeEstabelecimento ? <p>Estabelecimento: {ocrData.nomeEstabelecimento}</p> : null}
            {ocrData.nomeFantasia ? <p>Nome fantasia: {ocrData.nomeFantasia}</p> : null}
            {ocrData.cnpj ? <p>CNPJ: {ocrData.cnpj}</p> : null}
            {ocrData.endereco ? <p>Endereço: {ocrData.endereco}</p> : null}
            {ocrData.cidadeUf ? <p>Cidade/UF: {ocrData.cidadeUf}</p> : null}
            {ocrData.chaveAcesso ? (
              <p className="break-all">Chave SEFAZ: {ocrData.chaveAcesso}</p>
            ) : null}
            {ocrData.numeroDocumento ? (
              <p>Número do documento: {ocrData.numeroDocumento}</p>
            ) : null}
            {ocrData.serie ? <p>Série: {ocrData.serie}</p> : null}
            {ocrData.inscricaoEstadual ? <p>Inscrição estadual: {ocrData.inscricaoEstadual}</p> : null}
            {ocrData.emitente ? <p>Emitente: {ocrData.emitente}</p> : null}
            {ocrData.destinatario ? <p>Destinatário: {ocrData.destinatario}</p> : null}
            {ocrData.data ? <p>Data: {formatDate(ocrData.data)}</p> : null}
            {ocrData.valorProdutos ? <p>Produtos: {formatMoney(ocrData.valorProdutos)}</p> : null}
            {ocrData.desconto ? <p>Desconto: {formatMoney(ocrData.desconto)}</p> : null}
            {ocrData.tributos ? <p>Tributos: {formatMoney(ocrData.tributos)}</p> : null}
            {ocrData.formaPagamento ? <p>Pagamento: {ocrData.formaPagamento}</p> : null}
            {ocrData.protocoloAutorizacao ? <p>Protocolo: {ocrData.protocoloAutorizacao}</p> : null}
            {ocrData.numeroSat ? <p>Número do SAT: {ocrData.numeroSat}</p> : null}
            {ocrData.qrCode ? <p className="break-all">QR Code: {ocrData.qrCode}</p> : null}
            {allOcrItems.length > 0 ? (
              <div className="mt-2 border-t border-primary/20 pt-2">
                <p className="font-medium">Itens reconhecidos</p>
                <ul className="flex flex-col gap-1 text-xs">
                  {allOcrItems.map((item, index) => (
                    <li key={`${item.descricao}-${index}`} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate">{item.quantidade} × {item.descricao}</span>
                        <span className="text-muted-foreground">
                          Unit. {item.valorUnitario === null ? "-" : formatMoney(item.valorUnitario)}
                          {" · "}Desc. {item.desconto === null ? "-" : formatMoney(item.desconto)}
                        </span>
                        {item.fiscal ? <span className="block text-muted-foreground">{item.fiscal}</span> : null}
                      </span>
                      <span className="shrink-0">{item.valorTotal === null ? "-" : formatMoney(item.valorTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ocrData.informacoesComplementares ? <p>Informações complementares: {ocrData.informacoesComplementares}</p> : null}
            {ocrData.observacoes ? <p>Observações: {ocrData.observacoes}</p> : null}
            {ocrData.camposExtras?.map((field, index) => {
              const tone =
                field.confianca !== null && field.confianca !== undefined && field.confianca !== "alta"
                  ? ` text-xs ${confidenceClass(field.confianca)}`
                  : "";
              return (
                <p key={`${field.label}-${index}`}>{field.label}: {field.valor ?? "Não identificado"}{tone && field.confianca ? <span className={tone}>{` (${CONFIDENCE_LABELS[field.confianca]})`}</span> : null}</p>
              );
            })}
          </div>
        ) : null}
            {analysisMessage ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                <p className="text-sm text-muted-foreground">{analysisMessage}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={retryAnalysis}
                  disabled={analyzing}
                  className="shrink-0"
                >
                  <RefreshCw aria-hidden="true" />
                  Ler novamente
                </Button>
              </div>
            ) : null}
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
              <Label htmlFor="justificativa">Descrição</Label>
              <textarea
                id="justificativa"
                value={justificativa}
                onChange={(event) => setField("justificativa", event.target.value)}
                rows={3}
                placeholder="Ex.: Almoço com cliente ou abastecimento"
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
              <Label htmlFor="comprovante">Comprovante</Label>
              <input
                id="comprovante"
                type="file"
                accept="image/*"
                onChange={handleFilesChange}
                className="hidden"
              />
              <label
                htmlFor="comprovante"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-3 py-5 text-center transition-colors hover:bg-muted/50",
                  errors.files && "border-destructive",
                )}
              >
                <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {files[0] ? "Substituir comprovante" : "Adicionar comprovante"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Uma imagem por despesa
                </span>
              </label>
              {files[0] ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-2">
                  <ReceiptPreview file={files[0]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{files[0].name}</p>
                    <p className="text-xs text-muted-foreground">Será enviado ao salvar a despesa</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remover comprovante" onClick={() => removeFile("comprovante")}>
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
              {errors.files ? (
                <p className="text-sm text-danger">{errors.files}</p>
              ) : null}
            </div>

{ocrData ? (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                errors.confirmacaoOcr
                  ? "border-destructive bg-danger/5"
                  : "border-border bg-muted/40",
              )}
            >
              <input
                id="confirmacaoOcr"
                type="checkbox"
                checked={confirmadoOcr}
                onChange={(event) => {
                  setConfirmadoOcr(event.target.checked);
                  setErrors((current) => ({
                    ...current,
                    confirmacaoOcr: undefined,
                  }));
                }}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <label
                htmlFor="confirmacaoOcr"
                className="text-sm leading-snug text-foreground"
              >
                Confirmo que os dados conferem com o comprovante visualizado.
                {ocrData.alertaReconciliacao ? (
                  <span className="block text-xs text-warning">
                    Há divergência apontada pela leitura — verifique o valor
                    antes de confirmar.
                  </span>
                ) : null}
              </label>
            </div>
          ) : null}
          {errors.confirmacaoOcr ? (
            <p className="text-sm text-danger" role="alert">
              {errors.confirmacaoOcr}
            </p>
          ) : null}

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
        )}
      </DialogContent>
    </Dialog>
  );
}