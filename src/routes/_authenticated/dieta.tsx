import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Flame, Beef, Wheat, Droplet, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Modal, Field, TextInput, PrimaryBtn, GhostBtn, useForm } from "@/components/forms";
import { toast } from "sonner";
import { percentage } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/dieta")({
  head: () => ({ meta: [{ title: "Dieta — GymTracker" }] }),
  component: DietaPage,
});

type Meal = {
  id: string;
  name: string;
  time: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string | null;
};

function DietaPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [goal, setGoal] = useState(2600);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data }, { data: prof }] = await Promise.all([
      supabase.from("meals").select("*").eq("user_id", user.id).order("time"),
      supabase.from("profiles").select("daily_kcal_goal").eq("id", user.id).maybeSingle(),
    ]);
    setMeals((data as Meal[]) ?? []);
    if (prof?.daily_kcal_goal) setGoal(prof.daily_kcal_goal);
  };
  useEffect(() => {
    load();
  }, [user]);

  const total = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      p: a.p + Number(m.protein_g),
      c: a.c + Number(m.carbs_g),
      f: a.f + Number(m.fat_g),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const pct = percentage(total.kcal, goal);

  const remove = async (id: string) => {
    if (!confirm("Excluir refeição?")) return;
    if (!user) return;
    const { error } = await supabase.from("meals").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    load();
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between">
        <PageHeader title="Dieta" subtitle="Plano nutricional do dia" />
        <button
          type="button"
          aria-label="Adicionar refeição"
          onClick={() => setCreating(true)}
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <section className="rounded-3xl gradient-card border border-border/60 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Calorias</p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {total.kcal.toLocaleString("pt-BR")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {goal.toLocaleString("pt-BR")} kcal
              </span>
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Flame className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Macro
            icon={<Beef className="h-3.5 w-3.5" />}
            label="Proteína"
            value={`${Math.round(total.p)}g`}
          />
          <Macro
            icon={<Wheat className="h-3.5 w-3.5" />}
            label="Carbo"
            value={`${Math.round(total.c)}g`}
          />
          <Macro
            icon={<Droplet className="h-3.5 w-3.5" />}
            label="Gordura"
            value={`${Math.round(total.f)}g`}
          />
        </div>
      </section>

      <h3 className="mt-7 mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Refeições
      </h3>

      {meals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma refeição cadastrada.</p>
        </div>
      )}

      <ul className="space-y-3">
        {meals.map((m) => (
          <li key={m.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.time ?? "—"} · {m.items ?? ""}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  P {m.protein_g}g · C {m.carbs_g}g · G {m.fat_g}g
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  {m.kcal} kcal
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Editar refeição ${m.name}`}
                    onClick={() => setEditing(m)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir refeição ${m.name}`}
                    onClick={() => remove(m.id)}
                    className="rounded-lg p-1.5 text-destructive hover:bg-secondary"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(creating || editing) && (
        <MealForm
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function Macro({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-display text-base font-semibold">{value}</p>
    </div>
  );
}

function MealForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Meal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, set] = useForm({
    name: initial?.name ?? "",
    time: initial?.time ?? "08:00",
    kcal: initial?.kcal ?? 0,
    protein_g: initial?.protein_g ?? 0,
    carbs_g: initial?.carbs_g ?? 0,
    fat_g: initial?.fat_g ?? 0,
    items: initial?.items ?? "",
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = { ...form, user_id: user.id };
      const res = initial
        ? await supabase.from("meals").update(payload).eq("id", initial.id).eq("user_id", user.id)
        : await supabase.from("meals").insert(payload);
      if (res.error) throw res.error;
      toast.success(initial ? "Atualizada" : "Criada");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar refeição");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Editar refeição" : "Nova refeição"}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <TextInput
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Almoço"
            />
          </Field>
          <Field label="Horário">
            <TextInput
              type="time"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Itens">
          <TextInput
            value={form.items}
            onChange={(e) => set("items", e.target.value)}
            placeholder="Frango, arroz, salada..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calorias">
            <TextInput
              type="number"
              value={form.kcal}
              onChange={(e) => set("kcal", Number(e.target.value))}
            />
          </Field>
          <Field label="Proteína (g)">
            <TextInput
              type="number"
              step="0.1"
              value={form.protein_g}
              onChange={(e) => set("protein_g", Number(e.target.value))}
            />
          </Field>
          <Field label="Carbo (g)">
            <TextInput
              type="number"
              step="0.1"
              value={form.carbs_g}
              onChange={(e) => set("carbs_g", Number(e.target.value))}
            />
          </Field>
          <Field label="Gordura (g)">
            <TextInput
              type="number"
              step="0.1"
              value={form.fat_g}
              onChange={(e) => set("fat_g", Number(e.target.value))}
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
