"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, Car } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCreateTrip } from "../hooks";
import { requestAdvance } from "@/modules/advances/api";
import { useSession } from "@/modules/auth/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UF_VALUES = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

const DEPARTAMENTOS = ["COMERCIAL", "TECNICO"] as const;

const createTripSchema = z
  .object({
    cliente: z.string().trim().min(2, "Informe o cliente."),
    cidade: z.string().trim().min(2, "Informe a cidade."),
    uf: z.enum(UF_VALUES, { message: "Informe o estado." }),
    departamento: z.enum(DEPARTAMENTOS, { message: "Informe o departamento." }),
    dataSaida: z.string().min(1, "Informe a data de saída."),
    dataRetorno: z.string().min(1, "Informe a data de retorno."),
    motivo: z.string().trim().min(3, "Informe o motivo da viagem."),
  })
  .superRefine((values, ctx) => {
    if (!values.dataSaida || !values.dataRetorno) return;
    if (new Date(values.dataRetorno) < new Date(values.dataSaida)) {
      ctx.addIssue({
        code: "custom",
        path: ["dataRetorno"],
        message: "O retorno deve ser após a saída.",
      });
    }
  });

interface FieldErrors {
  cliente?: string;
  cidade?: string;
  uf?: string;
  departamento?: string;
  dataSaida?: string;
  dataRetorno?: string;
  motivo?: string;
  veiculo?: string;
  tipoVeiculo?: string;
  kmInicial?: string;
  kmFinal?: string;
}

export default function NewTripPage() {
  const createTrip = useCreateTrip();
  const router = useRouter();
  const { user } = useSession();

  const canSolicitarAdiantamento =
    user?.roleCode === "EMPLOYEE" || user?.roleCode === "MANAGER_ADMIN";

  const [values, setValues] = useState({
    cliente: "",
    cidade: "",
    uf: "",
    departamento: "",
    dataSaida: "",
    dataRetorno: "",
    motivo: "",
    veiculo: "",
    tipoVeiculo: "",
    kmInicial: "",
    kmFinal: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [adiantamento, setAdiantamento] = useState({
    ativo: false,
    valorSolicitado: "",
    justificativaSolicitacao: "",
  });
  const [adiantamentoErro, setAdiantamentoErro] = useState<string | null>(null);

  function setField(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setAdvanceField(
    field: keyof typeof adiantamento,
    value: string | boolean,
  ) {
    setAdiantamento((current) => ({ ...current, [field]: value }));
    setAdiantamentoErro(null);
  }

  function toggleAdiantamento() {
    setAdiantamento((current) => ({ ...current, ativo: !current.ativo }));
    setAdiantamentoErro(null);
  }

  function toCents(value: string): number {
    return Math.round(Number(value) * 100);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createTripSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (adiantamento.ativo) {
      if (!adiantamento.valorSolicitado || toCents(adiantamento.valorSolicitado) <= 0) {
        setAdiantamentoErro("Informe o valor solicitado.");
        return;
      }
      if (adiantamento.justificativaSolicitacao.trim().length < 5) {
        setAdiantamentoErro("Justificativa deve ter pelo menos 5 caracteres.");
        return;
      }
    }

    const kmInicial = values.kmInicial === "" ? null : Number(values.kmInicial);
    const kmFinal = values.kmFinal === "" ? null : Number(values.kmFinal);

    const kmErrors: FieldErrors = {};
    if (kmInicial !== null && Number.isNaN(kmInicial)) {
      kmErrors.kmInicial = "Informe o KM inicial.";
    }
    if (kmFinal !== null && Number.isNaN(kmFinal)) {
      kmErrors.kmFinal = "Informe o KM final.";
    }
    if (
      kmInicial !== null &&
      kmFinal !== null &&
      !Number.isNaN(kmInicial) &&
      !Number.isNaN(kmFinal) &&
      kmFinal < kmInicial
    ) {
      kmErrors.kmFinal = "O KM final deve ser maior ou igual ao inicial.";
    }
    if (Object.keys(kmErrors).length > 0) {
      setErrors((current) => ({ ...current, ...kmErrors }));
      return;
    }

    try {
      const trip = await createTrip.mutateAsync({
        ...parsed.data,
        dataSaida: new Date(parsed.data.dataSaida).toISOString(),
        dataRetorno: new Date(parsed.data.dataRetorno).toISOString(),
        veiculo:
          values.veiculo.trim() === "" ? null : values.veiculo.trim(),
        tipoVeiculo: values.tipoVeiculo === "" ? null : values.tipoVeiculo,
        kmInicial,
        kmFinal,
      });

      if (adiantamento.ativo) {
        try {
          await requestAdvance(trip.id, {
            valorSolicitado: adiantamento.valorSolicitado,
            justificativaSolicitacao: adiantamento.justificativaSolicitacao.trim(),
          });
          toast.success("Viagem criada com adiantamento solicitado.");
        } catch (advanceError) {
          toast.warning(
            advanceError instanceof Error
              ? `Viagem criada, mas o adiantamento não foi solicitado: ${advanceError.message}`
              : "Viagem criada, mas o adiantamento não foi solicitado.",
          );
        }
      } else {
        toast.success("Viagem criada.");
      }
      router.push(`/viagens/${trip.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a viagem.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild aria-label="Voltar">
          <Link href="/viagens">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Nova viagem</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                placeholder="Ex.: Cutrale"
                value={values.cliente}
                onChange={(event) => setField("cliente", event.target.value)}
                aria-invalid={Boolean(errors.cliente)}
              />
              {errors.cliente ? (
                <p className="text-sm text-danger">{errors.cliente}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                placeholder="Ex.: Colina"
                value={values.cidade}
                onChange={(event) => setField("cidade", event.target.value)}
                aria-invalid={Boolean(errors.cidade)}
              />
              {errors.cidade ? (
                <p className="text-sm text-danger">{errors.cidade}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="uf">Estado</Label>
              <Select
                value={values.uf}
                onValueChange={(value) => setField("uf", value)}
              >
                <SelectTrigger id="uf" className="w-full">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {UF_VALUES.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.uf ? (
                <p className="text-sm text-danger">{errors.uf}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Select
                value={values.departamento}
                onValueChange={(value) => setField("departamento", value)}
              >
                <SelectTrigger id="departamento" className="w-full">
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DEPARTAMENTOS.map((departamento) => (
                      <SelectItem key={departamento} value={departamento}>
                        {departamento === "COMERCIAL" ? "Comercial" : "Técnico"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.departamento ? (
                <p className="text-sm text-danger">{errors.departamento}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataSaida">Saída</Label>
                <Input
                  id="dataSaida"
                  type="date"
                  value={values.dataSaida}
                  onChange={(event) =>
                    setField("dataSaida", event.target.value)
                  }
                  aria-invalid={Boolean(errors.dataSaida)}
                />
                {errors.dataSaida ? (
                  <p className="text-sm text-danger">{errors.dataSaida}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataRetorno">Retorno</Label>
                <Input
                  id="dataRetorno"
                  type="date"
                  value={values.dataRetorno}
                  onChange={(event) =>
                    setField("dataRetorno", event.target.value)
                  }
                  aria-invalid={Boolean(errors.dataRetorno)}
                />
                {errors.dataRetorno ? (
                  <p className="text-sm text-danger">{errors.dataRetorno}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                placeholder="Ex.: Visita técnica ao cliente"
                value={values.motivo}
                onChange={(event) => setField("motivo", event.target.value)}
                aria-invalid={Boolean(errors.motivo)}
              />
              {errors.motivo ? (
                <p className="text-sm text-danger">{errors.motivo}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {canSolicitarAdiantamento ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Solicitar adiantamento?</p>
                  <p className="text-xs text-muted-foreground">
                    Opcional. O gestor define o valor aprovado depois.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={adiantamento.ativo ? "default" : "outline"}
                  className="shrink-0"
                  onClick={toggleAdiantamento}
                  aria-pressed={adiantamento.ativo}
                >
                  <Banknote aria-hidden="true" />
                  {adiantamento.ativo ? "Adiantamento incluído" : "Solicitar"}
                </Button>
              </div>

              {adiantamento.ativo ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="adiantamento-valor">Valor solicitado</Label>
                    <MoneyInput
                      id="adiantamento-valor"
                      value={adiantamento.valorSolicitado}
                      onValueChange={(value) =>
                        setAdvanceField("valorSolicitado", value)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="adiantamento-justificativa">
                      Justificativa
                    </Label>
                    <Input
                      id="adiantamento-justificativa"
                      placeholder="Ex.: Diárias e hospedagem antecipadas"
                      value={adiantamento.justificativaSolicitacao}
                      onChange={(event) =>
                        setAdvanceField(
                          "justificativaSolicitacao",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}

              {adiantamentoErro ? (
                <p className="text-sm text-danger">{adiantamentoErro}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <Car className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">Veículo e quilometragem</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional. Necessário para calcular o reembolso por km.
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tipoVeiculo">Tipo do veículo</Label>
              <Select
                value={values.tipoVeiculo}
                onValueChange={(value) => setField("tipoVeiculo", value)}
              >
                <SelectTrigger id="tipoVeiculo" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="PROPRIO">Próprio</SelectItem>
                    <SelectItem value="EMPRESA">Empresa</SelectItem>
                    <SelectItem value="ALUGADO">Alugado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="veiculo">Veículo</Label>
              <Input
                id="veiculo"
                placeholder="Ex.: Fiat Strada 2022"
                value={values.veiculo}
                onChange={(event) => setField("veiculo", event.target.value)}
                aria-invalid={Boolean(errors.veiculo)}
              />
              {errors.veiculo ? (
                <p className="text-sm text-danger">{errors.veiculo}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="kmInicial">KM inicial</Label>
                <Input
                  id="kmInicial"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={values.kmInicial}
                  onChange={(event) => setField("kmInicial", event.target.value)}
                  aria-invalid={Boolean(errors.kmInicial)}
                />
                {errors.kmInicial ? (
                  <p className="text-sm text-danger">{errors.kmInicial}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="kmFinal">KM final</Label>
                <Input
                  id="kmFinal"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={values.kmFinal}
                  onChange={(event) => setField("kmFinal", event.target.value)}
                  aria-invalid={Boolean(errors.kmFinal)}
                />
                {errors.kmFinal ? (
                  <p className="text-sm text-danger">{errors.kmFinal}</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base"
          disabled={createTrip.isPending}
        >
          {createTrip.isPending ? "Criando..." : "Criar viagem"}
        </Button>
      </form>
    </div>
  );
}
