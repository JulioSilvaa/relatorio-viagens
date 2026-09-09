"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCreateTrip } from "../hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export default function NewTripPage() {
  const createTrip = useCreateTrip();
  const router = useRouter();

  const [values, setValues] = useState({
    cliente: "",
    cidade: "",
    uf: "",
    departamento: "",
    dataSaida: "",
    dataRetorno: "",
    motivo: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function setField(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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

    try {
      const trip = await createTrip.mutateAsync({
        ...parsed.data,
        dataSaida: new Date(parsed.data.dataSaida).toISOString(),
        dataRetorno: new Date(parsed.data.dataRetorno).toISOString(),
      });
      toast.success("Viagem criada.");
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
