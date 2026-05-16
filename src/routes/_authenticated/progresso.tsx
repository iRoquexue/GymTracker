import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Modal, Field, TextInput, PrimaryBtn, GhostBtn, useForm } from "@/components/forms";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/progresso")({
  head: () => ({ meta: [{ title: "Progresso — GymTracker" }] }),
  component: ProgressoPage,
});

type Weight = { id: string; weight_kg: number; logged_at: string; note: string | null };
type Photo = { id: string; photo_url: string; taken_at: string; note: string | null };

function ProgressoPage() {
  const { user } = useAuth();
  const [weights, setWeights] = useState<Weight[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editing, setEditing] = useState<Weight | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false }),
      supabase
        .from("progress_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("taken_at", { ascending: false }),
    ]);
    setWeights((w as Weight[]) ?? []);
    setPhotos((p as Photo[]) ?? []);
  };
  useEffect(() => {
    load();
  }, [user]);

  const removeWeight = async (id: string) => {
    if (!confirm("Excluir registro?")) return;
    if (!user) return;
    const { error } = await supabase
      .from("weight_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };
  const removePhoto = async (p: Photo) => {
    if (!confirm("Excluir foto?")) return;
    if (!user) return;
    const path = p.photo_url.split("/progress/")[1];
    if (path) {
      const { error } = await supabase.storage.from("progress").remove([path]);
      if (error) return toast.error(error.message);
    }
    const { error } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", p.id)
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    load();
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("progress").upload(path, file);
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("progress").getPublicUrl(path);
    const { error: insertError } = await supabase
      .from("progress_photos")
      .insert({ user_id: user.id, photo_url: pub.publicUrl });
    if (insertError) return toast.error(insertError.message);
    toast.success("Foto enviada");
    load();
  };

  const current = weights[0]?.weight_kg ?? null;
  const previous = weights[1]?.weight_kg ?? null;
  const diff = current !== null && previous !== null ? Number(current) - Number(previous) : 0;

  const max = Math.max(...weights.map((w) => Number(w.weight_kg)), 1);
  const min = Math.min(...weights.map((w) => Number(w.weight_kg)), max);
  const range = Math.max(max - min, 1);
  const chart = [...weights].reverse().slice(-12);
  return (
    <AppShell>
      <div className="flex items-start justify-between">
        <PageHeader title="Progresso" subtitle="Sua evolução" />
        <button
          type="button"
          aria-label="Adicionar registro de peso"
          onClick={() => setCreating(true)}
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Mini
          label="Peso atual"
          value={current ? `${current}` : "—"}
          unit="kg"
          trend={diff !== 0 ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg` : "—"}
          down={diff < 0}
        />
        <Mini label="Registros" value={weights.length.toString()} unit="" trend="" />
        <Mini label="Fotos" value={photos.length.toString()} unit="" trend="" />
        <Mini label="Variação" value={(max - min).toFixed(1)} unit="kg" trend="" />
      </div>

      {chart.length > 0 && (
        <section className="mt-6 rounded-3xl gradient-card border border-border/60 p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Evolução do peso
          </p>
          <div className="mt-4 flex h-32 items-end gap-1.5">
            {chart.map((w) => {
              const h = ((Number(w.weight_kg) - min) / range) * 90 + 10;
              return (
                <div
                  key={w.id}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-primary/40 to-primary"
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        </section>
      )}

      <h3 className="mt-7 mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Registros de peso
      </h3>
      {weights.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Adicione seu primeiro registro.
        </p>
      )}
      <ul className="space-y-2">
        {weights.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4"
          >
            <div>
              <p className="font-display text-lg font-semibold text-primary">
                {w.weight_kg} <span className="text-xs text-muted-foreground">kg</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(w.logged_at).toLocaleDateString("pt-BR")} {w.note ? `· ${w.note}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={`Editar peso de ${w.weight_kg} kg`}
                onClick={() => setEditing(w)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Excluir peso de ${w.weight_kg} kg`}
                onClick={() => removeWeight(w.id)}
                className="rounded-lg p-1.5 text-destructive hover:bg-secondary"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-7 mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Fotos de progresso
        </h3>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          <Camera className="h-3.5 w-3.5" /> Adicionar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-border/60"
          >
            <img
              src={p.photo_url}
              alt={p.note ?? "progresso"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              aria-label="Excluir foto de progresso"
              onClick={() => removePhoto(p)}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <WeightForm
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

function Mini({
  label,
  value,
  unit,
  trend,
  down,
}: {
  label: string;
  value: string;
  unit: string;
  trend: string;
  down?: boolean;
}) {
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {trend && (
        <div
          className={`mt-1 flex items-center gap-1 text-xs ${down ? "text-success" : "text-primary"}`}
        >
          <Icon className="h-3 w-3" /> {trend}
        </div>
      )}
    </div>
  );
}

function WeightForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Weight | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, set] = useForm({
    weight_kg: initial?.weight_kg ?? 75,
    logged_at: initial?.logged_at ?? new Date().toISOString().slice(0, 10),
    note: initial?.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = { ...form, user_id: user.id };
      const res = initial
        ? await supabase
            .from("weight_logs")
            .update(payload)
            .eq("id", initial.id)
            .eq("user_id", user.id)
        : await supabase.from("weight_logs").insert(payload);
      if (res.error) throw res.error;
      toast.success("Salvo");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar peso");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={initial ? "Editar peso" : "Novo registro"}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)">
            <TextInput
              type="number"
              step="0.1"
              required
              value={form.weight_kg}
              onChange={(e) => set("weight_kg", Number(e.target.value))}
            />
          </Field>
          <Field label="Data">
            <TextInput
              type="date"
              value={form.logged_at}
              onChange={(e) => set("logged_at", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Observação">
          <TextInput
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
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
