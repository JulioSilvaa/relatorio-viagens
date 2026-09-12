"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptInvite } from "../api";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError("Informe o token do convite.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    try {
      setSubmitting(true);
      await acceptInvite(token.trim(), password);
      toast.success("Senha criada. Agora você já pode entrar.");
      router.replace("/login");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <img
            src="/vaiefecha-logo-horizontal-light.svg"
            alt="vaiefecha"
            className="h-10 w-auto dark:hidden"
          />
          <img
            src="/vaiefecha-logo-horizontal-dark.svg"
            alt="vaiefecha"
            className="hidden h-10 w-auto dark:block"
          />
          <h1 className="text-xl font-semibold tracking-tight">Aceitar convite</h1>
          <p className="text-sm text-muted-foreground">
            Crie sua senha para acessar viagens e despesas.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definir senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-token">Token do convite</Label>
                <Input
                  id="invite-token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Cole o token recebido"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-password">Nova senha</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-confirmation">Confirmar senha</Label>
                <Input
                  id="invite-confirmation"
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Salvando..." : "Criar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}