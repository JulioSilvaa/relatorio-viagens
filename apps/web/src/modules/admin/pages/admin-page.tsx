"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Pencil, Power, Settings2, UserPlus, Users } from "lucide-react";
import { useSession } from "@/modules/auth/session-context";
import { useUsers } from "@/modules/trips/hooks";
import { parseMoneyInput } from "@/lib/format";
import {
  useRegisterUser,
  useSaveSettings,
  useSettings,
  useUpdateUser,
  useUpdateUserStatus,
} from "../hooks";
import { ErrorState } from "@/components/feedback/error-state";
import { getErrorMessage } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCardSection } from "../components/credit-card-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS = {
  EMPLOYEE: "Colaborador",
  MANAGER_ADMIN: "Gestor",
  FINANCE: "Financeiro",
  FISCAL: "Fiscal",
} as const;

const DEPARTAMENTO_LABELS = {
  COMERCIAL: "Comercial",
  TECNICO: "Técnico",
} as const;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  department: "",
  cargo: "",
  roleCode: "",
};

export default function AdminPage() {
  const { user } = useSession();
  const isAdmin = user?.roleCode === "MANAGER_ADMIN";
  const usersQuery = useUsers(isAdmin, true);
  const settingsQuery = useSettings();
  const saveSettings = useSaveSettings();
  const registerUser = useRegisterUser();
  const updateUser = useUpdateUser();
  const updateUserStatus = useUpdateUserStatus();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [taxaDraft, setTaxaDraft] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Administração</h1>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    );
  }

  function setField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
  }

  function openRegisterDialog() {
    setEditingUserId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setInviteToken(null);
    setInviteCopied(false);
    setIsRegisterOpen(true);
  }

  function openEditDialog(member: NonNullable<typeof usersQuery.data>[number]) {
    setEditingUserId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      department: member.department,
      cargo: member.cargo,
      roleCode: member.roleCode,
    });
    setFormError(null);
    setInviteToken(null);
    setInviteCopied(false);
    setIsRegisterOpen(true);
  }

  async function handleRegisterSubmit() {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const cargo = form.cargo.trim();

    if (name.length < 2) {
      setFormError("Informe o nome.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Informe um e-mail válido.");
      return;
    }
    if (form.department === "") {
      setFormError("Selecione o departamento.");
      return;
    }
    if (cargo.length === 0) {
      setFormError("Informe o cargo.");
      return;
    }
    if (form.roleCode === "") {
      setFormError("Selecione o perfil.");
      return;
    }

    try {
      const input = {
        name,
        email,
        phone: form.phone.trim() === "" ? null : form.phone.trim(),
        department: form.department as "COMERCIAL" | "TECNICO",
        roleCode: form.roleCode as
          | "EMPLOYEE"
          | "MANAGER_ADMIN"
          | "FINANCE"
          | "FISCAL",
        cargo,
      };
      if (editingUserId) {
        await updateUser.mutateAsync({ userId: editingUserId, input });
        setIsRegisterOpen(false);
      } else {
        const result = await registerUser.mutateAsync(input);
        setInviteToken(result.inviteToken ?? null);
      }
    } catch (registerError) {
      setFormError(
        registerError instanceof Error
          ? registerError.message
          : "Não foi possível cadastrar o funcionário.",
      );
    }
  }

  async function handleToggleStatus(member: NonNullable<typeof usersQuery.data>[number]) {
    try {
      await updateUserStatus.mutateAsync({
        userId: member.id,
        status: member.status === "ATIVO" ? "INATIVO" : "ATIVO",
      });
    } catch (statusError) {
      toast.error(
        statusError instanceof Error
          ? statusError.message
          : "Não foi possível alterar o status do funcionário.",
      );
    }
  }

  async function copyToken() {
    if (!inviteToken) return;
    try {
      await navigator.clipboard.writeText(inviteToken);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  }

  async function handleSaveSettings() {
    const rate =
      taxaDraft ?? settingsQuery.data?.kmReimbursementRate ?? "";
    const parsed = parseMoneyInput(rate);
    if (parsed === null || parsed <= 0) {
      toast.error("Informe um valor de taxa maior que zero.");
      return;
    }
    setSettingsSaving(true);
    try {
      await saveSettings.mutateAsync({ kmReimbursementRate: parsed });
      setTaxaDraft(null);
    } catch (settingsError) {
      toast.error(
        settingsError instanceof Error
          ? settingsError.message
          : "Não foi possível salvar os parâmetros.",
      );
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Administração</h1>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            Funcionários
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {usersQuery.isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : null}
          {usersQuery.isError ? (
            <ErrorState
              message={getErrorMessage(usersQuery.error)}
              onRetry={() => void usersQuery.refetch()}
            />
          ) : null}
          {usersQuery.isSuccess ? (
            <div className="flex flex-col divide-y divide-border divide-y-reverse">
              {(usersQuery.data ?? []).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                      </p>
                      {member.status === "INATIVO" ? (
                        <Badge variant="destructive">Inativo</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {ROLE_LABELS[member.roleCode as keyof typeof ROLE_LABELS] ??
                      member.roleCode}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Editar funcionário"
                      onClick={() => openEditDialog(member)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={member.status === "ATIVO" ? "Desativar funcionário" : "Reativar funcionário"}
                      onClick={() => void handleToggleStatus(member)}
                      disabled={updateUserStatus.isPending}
                    >
                      <Power aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={openRegisterDialog}
            className="mt-1 self-start"
          >
            <UserPlus aria-hidden="true" />
            Cadastrar funcionário
          </Button>
        </CardContent>
      </Card>

      <CreditCardSection />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            Parâmetros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="taxaReembolsoKm">
              Taxa de reembolso por km (R$)
            </Label>
            <MoneyInput
              id="taxaReembolsoKm"
              value={taxaDraft ?? settingsQuery.data?.kmReimbursementRate ?? ""}
              onValueChange={setTaxaDraft}
            />
            <p className="text-xs text-muted-foreground">
              Padrão aplicado às novas viagens com veículo próprio. Alterações
              não afetam viagens já criadas, que mantêm a taxa congelada.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void handleSaveSettings()}
            disabled={settingsSaving || saveSettings.isPending}
            className="self-start"
          >
            {settingsSaving || saveSettings.isPending
              ? "Salvando..."
              : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {editingUserId ? "Editar funcionário" : "Cadastrar funcionário"}
            </DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Atualize os dados cadastrais do colaborador."
                : "O colaborador recebe um convite pelo e-mail para definir a senha."}
            </DialogDescription>
          </DialogHeader>

          {inviteToken ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-sm font-medium">Convite criado</p>
              <p className="text-xs text-muted-foreground">
                Em desenvolvimento, copie o token para uso no aceite do convite.
              </p>
              <code className="break-all rounded-md bg-background px-2 py-1 text-xs">
                {inviteToken}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyToken()}
                className="self-start"
              >
                <Copy aria-hidden="true" />
                {inviteCopied ? "Copiado" : "Copiar"}
              </Button>
              <Button type="button" variant="outline" size="sm" asChild className="self-start">
                <Link href={`/aceitar-convite?token=${encodeURIComponent(inviteToken)}`}>
                  Abrir aceite do convite
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="func-nome">Nome</Label>
                <Input
                  id="func-nome"
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="func-email">E-mail</Label>
                <Input
                  id="func-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="func-telefone">Telefone</Label>
                <Input
                  id="func-telefone"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="func-departamento">Departamento</Label>
                <Select
                  value={form.department}
                  onValueChange={(value) => setField("department", value)}
                >
                  <SelectTrigger id="func-departamento" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(DEPARTAMENTO_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="func-cargo">Cargo</Label>
                <Input
                  id="func-cargo"
                  value={form.cargo}
                  onChange={(event) => setField("cargo", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="func-perfil">Perfil</Label>
                <Select
                  value={form.roleCode}
                  onValueChange={(value) => setField("roleCode", value)}
                >
                  <SelectTrigger id="func-perfil" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {formError ? (
                <p className="text-sm text-danger">{formError}</p>
              ) : null}
            </div>
          )}

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRegisterOpen(false)}
              disabled={registerUser.isPending || updateUser.isPending}
            >
              {inviteToken ? "Fechar" : "Cancelar"}
            </Button>
            {inviteToken ? null : (
              <Button
                type="button"
                onClick={() => void handleRegisterSubmit()}
                disabled={registerUser.isPending || updateUser.isPending}
              >
                {registerUser.isPending || updateUser.isPending
                  ? "Salvando..."
                  : editingUserId
                    ? "Salvar alterações"
                    : "Cadastrar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}