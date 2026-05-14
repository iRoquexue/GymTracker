import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Camera, LogOut, Pencil, Trash2, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Modal, Field, TextInput, PrimaryBtn, GhostBtn, useForm } from "@/components/forms";
import { toast } from "sonner";
import {
  emptyLocalUserProfile,
  getLocalUserProfile,
  getProfileInitials,
  saveLocalUserProfile,
  type LocalUserProfile,
} from "@/lib/user-profile";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — GymTracker" }] }),
  component: PerfilPage,
});

type Profile = {
  display_name: string | null;
  height_cm: number | null;
  goal_weight_kg: number | null;
  focus: string | null;
  daily_kcal_goal: number | null;
  daily_water_goal_ml: number | null;
};

function PerfilPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalUserProfile>(emptyLocalUserProfile);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select(
        "display_name, height_cm, goal_weight_kg, focus, daily_kcal_goal, daily_water_goal_ml",
      )
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data as Profile);
    setLocalProfile(getLocalUserProfile(user.id));
  };

  useEffect(() => {
    load();
  }, [user]);

  const displayProfile: LocalUserProfile = {
    displayName: localProfile.displayName || profile?.display_name || "",
    age: localProfile.age,
    weightKg: localProfile.weightKg,
    heightCm: localProfile.heightCm ?? profile?.height_cm ?? null,
    goalWeightKg: localProfile.goalWeightKg ?? profile?.goal_weight_kg ?? null,
    objective: localProfile.objective || profile?.focus || "",
    dailyKcalGoal: localProfile.dailyKcalGoal ?? profile?.daily_kcal_goal ?? null,
    dailyWaterGoalMl: localProfile.dailyWaterGoalMl ?? profile?.daily_water_goal_ml ?? null,
    avatarDataUrl: localProfile.avatarDataUrl,
  };

  const persistLocalProfile = (next: LocalUserProfile) => {
    if (!user) return;
    saveLocalUserProfile(user.id, next);
    setLocalProfile(next);
  };

  const changePhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        toast.error("Não foi possível carregar a foto");
        return;
      }
      persistLocalProfile({ ...displayProfile, avatarDataUrl: result });
      toast.success("Foto atualizada");
    };
    reader.onerror = () => toast.error("Não foi possível carregar a foto");
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    persistLocalProfile({ ...displayProfile, avatarDataUrl: null });
    toast.success("Foto removida");
  };

  const logout = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <AppShell>
      <PageHeader title="Perfil" subtitle={user?.email ?? ""} />

      <section className="rounded-3xl gradient-card border border-border/60 p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-primary">
            {displayProfile.avatarDataUrl ? (
              <img
                src={displayProfile.avatarDataUrl}
                className="h-full w-full object-cover"
                alt="avatar"
              />
            ) : displayProfile.displayName ? (
              <span className="font-display text-xl font-semibold">
                {getProfileInitials(displayProfile.displayName, user?.email)}
              </span>
            ) : (
              <UserIcon className="h-7 w-7" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold">
              {displayProfile.displayName || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {displayProfile.objective || "Defina seu objetivo"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                <Camera className="h-3.5 w-3.5" /> Alterar foto
              </button>
              {displayProfile.avatarDataUrl && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) changePhoto(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          <button
            type="button"
            aria-label="Editar perfil"
            onClick={() => setEditing(true)}
            className="rounded-full bg-secondary p-2 text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Info label="Idade" value={displayProfile.age ? `${displayProfile.age} anos` : "—"} />
        <Info
          label="Peso"
          value={displayProfile.weightKg ? `${displayProfile.weightKg} kg` : "—"}
        />
        <Info
          label="Altura"
          value={displayProfile.heightCm ? `${displayProfile.heightCm} cm` : "—"}
        />
        <Info
          label="Meta peso"
          value={displayProfile.goalWeightKg ? `${displayProfile.goalWeightKg} kg` : "—"}
        />
        <Info
          label="Meta kcal"
          value={displayProfile.dailyKcalGoal ? `${displayProfile.dailyKcalGoal}` : "—"}
        />
        <Info
          label="Meta água"
          value={displayProfile.dailyWaterGoalMl ? `${displayProfile.dailyWaterGoalMl} ml` : "—"}
        />
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>

      {editing && (
        <ProfileForm
          initial={displayProfile}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            persistLocalProfile(next);
            setEditing(false);
          }}
        />
      )}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function ProfileForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: LocalUserProfile;
  onClose: () => void;
  onSaved: (profile: LocalUserProfile) => void;
}) {
  const [form, set] = useForm({
    displayName: initial.displayName,
    age: initial.age ?? 0,
    weightKg: initial.weightKg ?? 0,
    heightCm: initial.heightCm ?? 0,
    goalWeightKg: initial.goalWeightKg ?? 0,
    objective: initial.objective,
    dailyKcalGoal: initial.dailyKcalGoal ?? 2600,
    dailyWaterGoalMl: initial.dailyWaterGoalMl ?? 3000,
  });
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      onSaved({
        displayName: form.displayName.trim(),
        age: form.age || null,
        weightKg: form.weightKg || null,
        heightCm: form.heightCm || null,
        goalWeightKg: form.goalWeightKg || null,
        objective: form.objective.trim(),
        dailyKcalGoal: form.dailyKcalGoal || null,
        dailyWaterGoalMl: form.dailyWaterGoalMl || null,
        avatarDataUrl: initial.avatarDataUrl,
      });
      toast.success("Perfil atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar perfil");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Editar perfil">
      <form onSubmit={save} className="space-y-3">
        <Field label="Nome">
          <TextInput
            value={form.displayName}
            onChange={(event) => set("displayName", event.target.value)}
          />
        </Field>
        <Field label="Objetivo">
          <TextInput
            value={form.objective}
            onChange={(event) => set("objective", event.target.value)}
            placeholder="Hipertrofia, perda de gordura..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade">
            <TextInput
              type="number"
              min={0}
              value={form.age}
              onChange={(event) => set("age", Number(event.target.value))}
            />
          </Field>
          <Field label="Peso (kg)">
            <TextInput
              type="number"
              step="0.1"
              min={0}
              value={form.weightKg}
              onChange={(event) => set("weightKg", Number(event.target.value))}
            />
          </Field>
          <Field label="Altura (cm)">
            <TextInput
              type="number"
              min={0}
              value={form.heightCm}
              onChange={(event) => set("heightCm", Number(event.target.value))}
            />
          </Field>
          <Field label="Meta peso (kg)">
            <TextInput
              type="number"
              step="0.1"
              min={0}
              value={form.goalWeightKg}
              onChange={(event) => set("goalWeightKg", Number(event.target.value))}
            />
          </Field>
          <Field label="Meta kcal">
            <TextInput
              type="number"
              min={0}
              value={form.dailyKcalGoal}
              onChange={(event) => set("dailyKcalGoal", Number(event.target.value))}
            />
          </Field>
          <Field label="Meta água (ml)">
            <TextInput
              type="number"
              min={0}
              value={form.dailyWaterGoalMl}
              onChange={(event) => set("dailyWaterGoalMl", Number(event.target.value))}
            />
          </Field>
        </div>
        <div className="flex gap-2 pt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn disabled={busy}>{busy ? "Salvando..." : "Salvar"}</PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}
