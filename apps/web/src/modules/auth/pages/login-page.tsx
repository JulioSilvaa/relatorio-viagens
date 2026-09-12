"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/modules/auth/session-context";
import { LoginForm } from "@/modules/auth/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/inicio");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-full flex-1 flex-col justify-center px-4 py-10">
        <Skeleton className="mx-auto h-10 w-40" />
        <Skeleton className="mt-8 h-64 w-full max-w-sm self-center rounded-2xl" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
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
          <h1 className="text-xl font-semibold tracking-tight">
            Viagens e Despesas
          </h1>
          <p className="text-sm text-muted-foreground">Entre para continuar.</p>
        </header>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Acessar</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
