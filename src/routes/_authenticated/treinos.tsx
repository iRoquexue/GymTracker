import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Copy,
  MoreVertical,
  CheckCircle2,
  Play,
  Dumbbell,
  Heart,
  History,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Modal,
  Field,
  TextInput,
  TextArea,
  PrimaryBtn,
  GhostBtn,
  useForm,
} from "@/components/forms";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({ meta: [{ title: "Treinos — GymTracker" }] }),
  component: TreinosPage,
});

type Day = {
  id: string;
  user_id: string;
  name: string;
  weekday: number | null;
  planned_duration_min: number;
  status: string;
  notes: string | null;
  position: number;
  description: string | null;
  muscle_group: string | null;
  type: string;
};

type DraftStrength = {
  tempId: string;
  name: string;
  sets: number;
  reps: string;
  weight_kg: number;
  rest_sec: number;
  notes: string;
};
type DraftCardio = {
  tempId: string;
  name: string;
  duration_min: number;
  intensity: string;
  notes: string;
};
type EditableCardio = DraftCardio & {
  id?: string;
  position: number;
};
type StoredCardio = {
  id: string;
  name: string;
  duration_min: number;
  intensity: string;
  position: number;
};
type CopiedStrength = {
  name: string;
  sets: number;
  reps: string;
  weight_kg: number;
  rest_sec: number;
  notes: string | null;
  position: number;
};
type CopiedCardio = {
  name: string;
  duration_min: number;
  intensity: string;
  position: number;
};
type DraftActionsProps = {
  onUp: () => void;
  upDisabled: boolean;
  onDown: () => void;
  downDisabled: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TYPES = [
  { value: "strength", label: "Musculação" },
  { value: "cardio", label: "Cardio" },
  { value: "mixed", label: "Misto" },
];
const CARDIO_TYPES = ["Caminhada", "Corrida", "Bike", "Escada", "Elíptico", "Outro"];
const INTENSITIES = ["Leve", "Moderada", "Intensa"];

function formatCardioName(name: string, notes: string) {
  const cleanName = name.trim();
  const cleanNotes = notes.trim();
  return cleanNotes ? `${cleanName} — ${cleanNotes}` : cleanName;
}

function parseCardioName(value: string | null | undefined) {
  const [name, ...notesParts] = (value ?? "").split(" — ");
  return {
    name: name || "Caminhada",
    notes: notesParts.join(" — "),
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function TreinosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [items, setItems] = useState<Day[]>([]);
  const [editing, setEditing] = useState<Day | null>(null);
  const [creating, setCreating] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_days")
      .select("*")
      .eq("user_id", user.id)
      .order("weekday")
      .order("position");
    setItems((data as Day[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Excluir este treino?")) return;
    if (!user) return;
    const { error } = await supabase
      .from("workout_days")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  const duplicate = async (w: Day) => {
    if (!user) return;
    const { data: created, error } = await supabase
      .from("workout_days")
      .insert({
        user_id: user.id,
        name: `${w.name} (cópia)`,
        weekday: w.weekday,
        planned_duration_min: w.planned_duration_min,
        notes: w.notes,
        position: w.position + 1,
        description: w.description,
        muscle_group: w.muscle_group,
        type: w.type,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const [{ data: ses }, { data: cs }] = await Promise.all([
      supabase
        .from("strength_exercises")
        .select("*")
        .eq("workout_day_id", w.id)
        .eq("user_id", user.id),
      supabase
        .from("cardio_sessions")
        .select("*")
        .eq("workout_day_id", w.id)
        .eq("user_id", user.id),
    ]);
    if (ses?.length && created) {
      const { error: strengthError } = await supabase.from("strength_exercises").insert(
        (ses as CopiedStrength[]).map((e) => ({
          workout_day_id: created.id,
          user_id: user.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight_kg: e.weight_kg,
          rest_sec: e.rest_sec,
          notes: e.notes,
          position: e.position,
        })),
      );
      if (strengthError) return toast.error(strengthError.message);
    }
    if (cs?.length && created) {
      const { error: cardioError } = await supabase.from("cardio_sessions").insert(
        (cs as CopiedCardio[]).map((c) => ({
          workout_day_id: created.id,
          user_id: user.id,
          name: c.name,
          duration_min: c.duration_min,
          intensity: c.intensity,
          position: c.position,
        })),
      );
      if (cardioError) return toast.error(cardioError.message);
    }
    toast.success("Duplicado");
    load();
  };

  const openWorkout = (workoutId: string) => {
    navigate({ to: "/treinos/$id", params: { id: workoutId } });
  };

  const openWorkoutFromKeyboard = (event: React.KeyboardEvent, workoutId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openWorkout(workoutId);
  };

  if (pathname !== "/treinos") {
    return <Outlet />;
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between">
        <PageHeader title="Treinos" subtitle="Seu plano da semana" />
        <button
          type="button"
          aria-label="Criar treino"
          onClick={() => setCreating(true)}
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <Link
        to="/historico"
        className="mb-4 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4"
      >
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Histórico</p>
          <p className="mt-0.5 text-sm font-semibold">Ver treinos concluídos</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </div>
      </Link>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum treino ainda. Toque em "+" para criar.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((w) => (
          <li
            key={w.id}
            role="link"
            tabIndex={0}
            onClick={() => openWorkout(w.id)}
            onKeyDown={(event) => openWorkoutFromKeyboard(event, w.id)}
            className="relative cursor-pointer rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/40 hover:bg-card-elevated focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-secondary">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {w.weekday !== null ? DAYS[w.weekday] : "—"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={w.status} />
                  <TypePill type={w.type} />
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold">{w.name}</p>
                <p className="text-xs text-muted-foreground">
                  {w.muscle_group ? `${w.muscle_group} · ` : ""}
                  {w.planned_duration_min} min
                </p>
              </div>
              <button
                type="button"
                aria-label={`Abrir ações de ${w.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenMenu(openMenu === w.id ? null : w.id);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            {openMenu === w.id && (
              <div
                className="absolute right-3 top-14 z-10 w-44 overflow-hidden rounded-xl border border-border bg-card-elevated shadow-card"
                onClick={(event) => event.stopPropagation()}
              >
                <MenuItem
                  onClick={() => {
                    setOpenMenu(null);
                    setEditing(w);
                  }}
                  icon={<Pencil className="h-3.5 w-3.5" />}
                >
                  Editar
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOpenMenu(null);
                    duplicate(w);
                  }}
                  icon={<Copy className="h-3.5 w-3.5" />}
                >
                  Duplicar
                </MenuItem>
                <MenuItem
                  danger
                  onClick={() => {
                    setOpenMenu(null);
                    remove(w.id);
                  }}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Excluir
                </MenuItem>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 py-4 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Criar novo treino
      </button>

      {creating && (
        <NewWorkoutModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <EditDayModal
          day={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-success">
        <CheckCircle2 className="h-3 w-3" /> Concluído
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary">
        <Play className="h-3 w-3 fill-current" /> Em andamento
      </span>
    );
  return (
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Planejado</span>
  );
}

function TypePill({ type }: { type: string }) {
  const t = TYPES.find((x) => x.value === type);
  if (!t) return null;
  return (
    <span className="rounded-full border border-border/70 px-1.5 py-px text-[9px] uppercase tracking-wider text-muted-foreground">
      {t.label}
    </span>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary ${danger ? "text-destructive" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------- New Workout Modal (with inline exercises & cardio) ---------- */

function NewWorkoutModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, set] = useForm({
    name: "",
    weekday: new Date().getDay(),
    planned_duration_min: 60,
    description: "",
    muscle_group: "",
    type: "strength",
    notes: "",
  });
  const [strength, setStrength] = useState<DraftStrength[]>([]);
  const [cardio, setCardio] = useState<DraftCardio[]>([]);
  const [editStr, setEditStr] = useState<DraftStrength | null>(null);
  const [editCar, setEditCar] = useState<DraftCardio | null>(null);
  const [addingStr, setAddingStr] = useState(false);
  const [addingCar, setAddingCar] = useState(false);
  const [busy, setBusy] = useState(false);

  const moveStr = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= strength.length) return;
    const arr = [...strength];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setStrength(arr);
  };
  const moveCar = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cardio.length) return;
    const arr = [...cardio];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setCardio(arr);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Dê um nome ao treino");
      return;
    }
    setBusy(true);
    try {
      const { data: day, error } = await supabase
        .from("workout_days")
        .insert({
          user_id: user.id,
          name: form.name,
          weekday: form.weekday,
          planned_duration_min: form.planned_duration_min,
          description: form.description || null,
          muscle_group: form.muscle_group || null,
          type: form.type,
          notes: form.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (strength.length) {
        const { error: e1 } = await supabase.from("strength_exercises").insert(
          strength.map((s, i) => ({
            workout_day_id: day.id,
            user_id: user.id,
            name: s.name,
            sets: s.sets,
            reps: s.reps,
            weight_kg: s.weight_kg,
            rest_sec: s.rest_sec,
            notes: s.notes || null,
            position: i,
          })),
        );
        if (e1) throw e1;
      }
      if (cardio.length) {
        const { error: e2 } = await supabase.from("cardio_sessions").insert(
          cardio.map((c, i) => ({
            workout_day_id: day.id,
            user_id: user.id,
            name: formatCardioName(c.name, c.notes),
            duration_min: c.duration_min,
            intensity: c.intensity,
            position: i,
          })),
        );
        if (e2) throw e2;
      }
      toast.success("Treino criado");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar treino");
    } finally {
      setBusy(false);
    }
  };

  const showStrength = form.type !== "cardio";
  const showCardio = true;

  return (
    <Modal open onClose={onClose} title="Novo treino">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nome">
          <TextInput
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Push — Peito & Tríceps"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grupo muscular">
            <TextInput
              value={form.muscle_group}
              onChange={(e) => set("muscle_group", e.target.value)}
              placeholder="Peito, Tríceps"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia da semana">
            <select
              value={form.weekday}
              onChange={(e) => set("weekday", Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duração (min)">
            <TextInput
              type="number"
              min={1}
              value={form.planned_duration_min}
              onChange={(e) => set("planned_duration_min", Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Descrição">
          <TextArea
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Opcional"
          />
        </Field>

        {showStrength && (
          <div>
            <DraftHeader
              icon={<Dumbbell className="h-3.5 w-3.5" />}
              title="Exercícios"
              onAdd={() => setAddingStr(true)}
            />
            {strength.length === 0 ? (
              <DraftEmpty label="Nenhum exercício adicionado" />
            ) : (
              <ul className="space-y-2">
                {strength.map((s, i) => (
                  <li
                    key={s.tempId}
                    className="rounded-xl border border-border/60 bg-background p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.sets}x{s.reps} · {s.weight_kg}kg · {s.rest_sec}s
                        </p>
                        {s.notes && (
                          <p className="mt-1 text-xs italic text-muted-foreground">{s.notes}</p>
                        )}
                      </div>
                      <DraftActions
                        onUp={() => moveStr(i, -1)}
                        upDisabled={i === 0}
                        onDown={() => moveStr(i, 1)}
                        downDisabled={i === strength.length - 1}
                        onEdit={() => setEditStr(s)}
                        onDuplicate={() =>
                          setStrength([
                            ...strength.slice(0, i + 1),
                            { ...s, tempId: uid() },
                            ...strength.slice(i + 1),
                          ])
                        }
                        onDelete={() => setStrength(strength.filter((x) => x.tempId !== s.tempId))}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setAddingStr(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar exercício
            </button>
          </div>
        )}

        {showCardio && (
          <div>
            <DraftHeader
              icon={<Heart className="h-3.5 w-3.5" />}
              title="Cardio"
              onAdd={() => setAddingCar(true)}
            />
            {cardio.length === 0 ? (
              <DraftEmpty label="Nenhuma sessão de cardio" />
            ) : (
              <ul className="space-y-2">
                {cardio.map((c, i) => (
                  <li
                    key={c.tempId}
                    className="rounded-xl border border-border/60 bg-background p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.duration_min} min · {c.intensity}
                        </p>
                      </div>
                      <DraftActions
                        onUp={() => moveCar(i, -1)}
                        upDisabled={i === 0}
                        onDown={() => moveCar(i, 1)}
                        downDisabled={i === cardio.length - 1}
                        onEdit={() => setEditCar(c)}
                        onDuplicate={() =>
                          setCardio([
                            ...cardio.slice(0, i + 1),
                            { ...c, tempId: uid() },
                            ...cardio.slice(i + 1),
                          ])
                        }
                        onDelete={() => setCardio(cardio.filter((x) => x.tempId !== c.tempId))}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setAddingCar(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar cardio
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn disabled={busy}>{busy ? "Salvando..." : "Criar treino"}</PrimaryBtn>
        </div>
      </form>

      {(addingStr || editStr) && (
        <DraftStrengthForm
          initial={editStr}
          onClose={() => {
            setAddingStr(false);
            setEditStr(null);
          }}
          onSave={(s) => {
            if (editStr) setStrength(strength.map((x) => (x.tempId === editStr.tempId ? s : x)));
            else setStrength([...strength, s]);
            setAddingStr(false);
            setEditStr(null);
          }}
        />
      )}
      {(addingCar || editCar) && (
        <DraftCardioForm
          initial={editCar}
          onClose={() => {
            setAddingCar(false);
            setEditCar(null);
          }}
          onSave={(c) => {
            if (editCar) setCardio(cardio.map((x) => (x.tempId === editCar.tempId ? c : x)));
            else setCardio([...cardio, c]);
            setAddingCar(false);
            setEditCar(null);
          }}
        />
      )}
    </Modal>
  );
}

function DraftHeader({
  icon,
  title,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  onAdd: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h4>
      <button
        type="button"
        aria-label={`Adicionar ${title.toLowerCase()}`}
        onClick={onAdd}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DraftEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function DraftActions({
  onUp,
  upDisabled,
  onDown,
  downDisabled,
  onEdit,
  onDuplicate,
  onDelete,
}: DraftActionsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Mover para cima"
        onClick={onUp}
        disabled={upDisabled}
        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Mover para baixo"
        onClick={onDown}
        disabled={downDisabled}
        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Editar item"
        onClick={onEdit}
        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Duplicar item"
        onClick={onDuplicate}
        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Remover item"
        onClick={onDelete}
        className="rounded-lg p-1 text-destructive hover:bg-secondary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DraftStrengthForm({
  initial,
  onClose,
  onSave,
}: {
  initial: DraftStrength | null;
  onClose: () => void;
  onSave: (s: DraftStrength) => void;
}) {
  const [form, set] = useForm({
    name: initial?.name ?? "",
    sets: initial?.sets ?? 3,
    reps: initial?.reps ?? "10",
    weight_kg: initial?.weight_kg ?? 0,
    rest_sec: initial?.rest_sec ?? 60,
    notes: initial?.notes ?? "",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.name.trim()) {
      toast.error("Dê um nome ao exercício");
      return;
    }
    onSave({ tempId: initial?.tempId ?? uid(), ...form });
  };
  return (
    <Modal open onClose={onClose} title={initial ? "Editar exercício" : "Novo exercício"}>
      <div className="space-y-3">
        <Field label="Nome">
          <TextInput
            autoFocus
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Supino reto"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Séries">
            <TextInput
              type="number"
              min={1}
              value={form.sets}
              onChange={(e) => set("sets", Number(e.target.value))}
            />
          </Field>
          <Field label="Reps">
            <TextInput
              value={form.reps}
              onChange={(e) => set("reps", e.target.value)}
              placeholder="8-12"
            />
          </Field>
          <Field label="Carga (kg)">
            <TextInput
              type="number"
              step="0.5"
              value={form.weight_kg}
              onChange={(e) => set("weight_kg", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Descanso (s)">
          <TextInput
            type="number"
            min={0}
            value={form.rest_sec}
            onChange={(e) => set("rest_sec", Number(e.target.value))}
          />
        </Field>
        <Field label="Observações">
          <TextArea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
        <div className="flex gap-2 pt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn type="button" onClick={submit}>
            {initial ? "Salvar" : "Adicionar"}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

function DraftCardioForm({
  initial,
  onClose,
  onSave,
}: {
  initial: DraftCardio | null;
  onClose: () => void;
  onSave: (c: DraftCardio) => void;
}) {
  const [form, set] = useForm({
    name: initial?.name ?? "Caminhada",
    duration_min: initial?.duration_min ?? 20,
    intensity: initial?.intensity ?? "Moderada",
    notes: initial?.notes ?? "",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!form.name.trim()) {
      toast.error("Dê um nome ao cardio");
      return;
    }
    onSave({ tempId: initial?.tempId ?? uid(), ...form });
  };
  return (
    <Modal open onClose={onClose} title={initial ? "Editar cardio" : "Nova sessão de cardio"}>
      <div className="space-y-3">
        <Field label="Tipo de cardio">
          <select
            autoFocus
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {CARDIO_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duração (min)">
            <TextInput
              type="number"
              min={1}
              value={form.duration_min}
              onChange={(e) => set("duration_min", Number(e.target.value))}
            />
          </Field>
          <Field label="Intensidade">
            <select
              value={form.intensity}
              onChange={(e) => set("intensity", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {INTENSITIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Observações">
          <TextArea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
        <div className="flex gap-2 pt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn type="button" onClick={submit}>
            {initial ? "Salvar" : "Adicionar"}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Edit Day (basic fields only — exercícios via página de detalhe) ---------- */

function EditDayModal({
  day,
  onClose,
  onSaved,
}: {
  day: Day;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, set] = useForm({
    name: day.name,
    weekday: day.weekday ?? new Date().getDay(),
    planned_duration_min: day.planned_duration_min,
    type: day.type ?? "strength",
    muscle_group: day.muscle_group ?? "",
    description: day.description ?? "",
    notes: day.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [cardioItems, setCardioItems] = useState<EditableCardio[]>([]);
  const [addingCar, setAddingCar] = useState(false);
  const [editCar, setEditCar] = useState<EditableCardio | null>(null);
  const [removedCardioIds, setRemovedCardioIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cardio_sessions")
        .select("id, name, duration_min, intensity, position")
        .eq("workout_day_id", day.id)
        .eq("user_id", day.user_id)
        .order("position");
      setCardioItems(
        ((data as StoredCardio[]) ?? []).map((item) => {
          const parsed = parseCardioName(item.name);
          return {
            id: item.id,
            tempId: item.id,
            name: parsed.name,
            notes: parsed.notes,
            duration_min: item.duration_min,
            intensity: item.intensity,
            position: item.position,
          };
        }),
      );
      setRemovedCardioIds([]);
    })();
  }, [day.id, day.user_id]);

  const removeCardioItem = (item: EditableCardio) => {
    if (item.id) setRemovedCardioIds((ids) => [...ids, item.id as string]);
    setCardioItems((items) => items.filter((current) => current.tempId !== item.tempId));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("workout_days")
        .update({
          name: form.name,
          weekday: form.weekday,
          planned_duration_min: form.planned_duration_min,
          type: form.type,
          muscle_group: form.muscle_group || null,
          description: form.description || null,
          notes: form.notes || null,
        })
        .eq("id", day.id)
        .eq("user_id", day.user_id);
      if (error) throw error;

      if (removedCardioIds.length) {
        const { error: deleteError } = await supabase
          .from("cardio_sessions")
          .delete()
          .in("id", removedCardioIds)
          .eq("user_id", day.user_id);
        if (deleteError) throw deleteError;
      }

      for (const [index, item] of cardioItems.entries()) {
        const payload = {
          workout_day_id: day.id,
          user_id: day.user_id,
          name: formatCardioName(item.name, item.notes),
          duration_min: item.duration_min,
          intensity: item.intensity,
          position: index,
        };
        const result = item.id
          ? await supabase
              .from("cardio_sessions")
              .update(payload)
              .eq("id", item.id)
              .eq("user_id", day.user_id)
          : await supabase.from("cardio_sessions").insert(payload);
        if (result.error) throw result.error;
      }

      toast.success("Atualizado");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar treino");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Editar treino">
      <form onSubmit={save} className="space-y-3">
        <Field label="Nome">
          <TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grupo muscular">
            <TextInput
              value={form.muscle_group}
              onChange={(e) => set("muscle_group", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia da semana">
            <select
              value={form.weekday}
              onChange={(e) => set("weekday", Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duração (min)">
            <TextInput
              type="number"
              min={1}
              value={form.planned_duration_min}
              onChange={(e) => set("planned_duration_min", Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Descrição">
          <TextArea
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <div>
          <DraftHeader
            icon={<Heart className="h-3.5 w-3.5" />}
            title="Cardio"
            onAdd={() => setAddingCar(true)}
          />
          {cardioItems.length === 0 ? (
            <DraftEmpty label="Nenhum cardio adicionado" />
          ) : (
            <ul className="space-y-2">
              {cardioItems.map((item) => (
                <li
                  key={item.tempId}
                  className="rounded-xl border border-border/60 bg-background p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.duration_min} min · {item.intensity}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Editar cardio"
                        onClick={() => setEditCar(item)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Remover cardio"
                        onClick={() => removeCardioItem(item)}
                        className="rounded-lg p-1 text-destructive hover:bg-secondary"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setAddingCar(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar cardio
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <GhostBtn type="button" onClick={onClose}>
            Cancelar
          </GhostBtn>
          <PrimaryBtn disabled={busy}>{busy ? "Salvando..." : "Salvar"}</PrimaryBtn>
        </div>
      </form>

      {(addingCar || editCar) && (
        <DraftCardioForm
          initial={editCar}
          onClose={() => {
            setAddingCar(false);
            setEditCar(null);
          }}
          onSave={(cardio) => {
            if (editCar) {
              setCardioItems((items) =>
                items.map((item) =>
                  item.tempId === editCar.tempId
                    ? { ...cardio, id: editCar.id, position: editCar.position }
                    : item,
                ),
              );
            } else {
              setCardioItems((items) => [...items, { ...cardio, position: items.length }]);
            }
            setAddingCar(false);
            setEditCar(null);
          }}
        />
      )}
    </Modal>
  );
}
