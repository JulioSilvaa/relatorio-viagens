"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "../session-context";
import { formatCnpj, isValidCnpj, stripCnpj } from "../utils/cnpj";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const PASSWORD_MIN_LENGTH = 8;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(200),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(PASSWORD_MIN_LENGTH, `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
  confirmation: z.string().min(1, "Confirme sua senha"),
  companyName: z.string().trim().min(2, "Nome da empresa deve ter ao menos 2 caracteres").max(200),
  cnpj: z.string().refine((value) => isValidCnpj(value), "CNPJ inválido"),
}).refine((data) => data.password === data.confirmation, {
  message: "As senhas não conferem.",
  path: ["confirmation"],
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: registerSession } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterValues, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleCnpjChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = stripCnpj(event.target.value);
    const formatted = formatCnpj(raw);
    setCnpj(formatted);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);

    const parsed = registerSchema.safeParse({ name, email, password, confirmation, companyName, cnpj });
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof RegisterValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RegisterValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      setSubmitting(true);
      await registerSession({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        companyName: parsed.data.companyName,
        cnpj: parsed.data.cnpj,
      });
      toast.success("Conta criada. Bem-vindo!");
      router.replace("/inicio");
    } catch (error) {
      const message = getErrorMessage(error);
      if (error instanceof Error && "fields" in error && error.fields) {
        const fields = error.fields as Record<string, string>;
        const fieldErrors: Partial<Record<keyof RegisterValues, string>> = {};
        for (const [key, msg] of Object.entries(fields)) {
          if (key in fieldErrors) {
            fieldErrors[key as keyof RegisterValues] = msg;
          }
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }
      if (error instanceof Error && "code" in error) {
        const code = (error as { code: string }).code;
        if (code === "USER_EMAIL_ALREADY_EXISTS") {
          setErrors({ email: "E-mail já cadastrado." });
          return;
        }
        if (code === "COMPANY_CNPJ_ALREADY_USED") {
          setErrors({ cnpj: "CNPJ já cadastrado." });
          return;
        }
      }
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <p className="text-sm font-medium text-foreground">Sua conta</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Seu nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@empresa.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? <p className="text-sm text-danger">{errors.email}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? <p className="text-sm text-danger">{errors.password}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmation">Confirmar senha</Label>
        <Input
          id="confirmation"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          aria-invalid={Boolean(errors.confirmation)}
        />
        {errors.confirmation ? <p className="text-sm text-danger">{errors.confirmation}</p> : null}
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Sua empresa</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Você passa a ser o administrador desta conta.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="companyName">Nome da empresa</Label>
        <Input
          id="companyName"
          type="text"
          autoComplete="organization"
          placeholder="Nome da sua empresa"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          aria-invalid={Boolean(errors.companyName)}
        />
        {errors.companyName ? <p className="text-sm text-danger">{errors.companyName}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          type="text"
          inputMode="numeric"
          maxLength={18}
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={handleCnpjChange}
          aria-invalid={Boolean(errors.cnpj)}
        />
        {errors.cnpj ? <p className="text-sm text-danger">{errors.cnpj}</p> : null}
      </div>

      {serverError ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={submitting}>
        {submitting ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta? <Link href="/login" className="text-primary underline-offset-4 hover:underline font-medium">Entrar</Link>
      </p>
    </form>
  );
}