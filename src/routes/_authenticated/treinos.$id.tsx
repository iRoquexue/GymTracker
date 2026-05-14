import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Heart,
  Dumbbell,
  Play,
  Square,
  Check,
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
  BackLink,
  useForm,
} from "@/components/forms";
import { toast } from "sonner";
import {
  addWorkoutHistoryEntry,
  createWorkoutHistoryId,
  type WorkoutHistoryExercise,
} from "@/lib/workout-history";

export const Route = createFileRoute("/_authenticated/treinos/$id")({
  head: () => ({ meta: [{ title: "Treino — GymTracker" }] }),
  component: WorkoutDetail,
});

type Day = {
  id: string;
  name: string;
  planned_duration_min: number;
};

type Strength = {
  id: string;
  workout_day_id: string;
  user_id: string;
  name: string;
  sets: number;
  reps: string;
  weight_kg: number;
  rest_sec: number;
  position: number;
  notes: string | null;
};

type Cardio = {
  id: string;
  workout_day_id: string;
  user_id: string;
  name: string;
  duration_min: number;
  intensity: string;
  position: number;
  completed: boolean;
};

type SessionPhase =
  | "idle"
  | "strength_running"
  | "strength_finished"
  | "cardio_running"
  | "completed";

function elapsedSec(startedAt: number | null, now: number) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function fmtSec(total: number) {
  const safeTotal = Math.max(0, Math.floor(total));
  const h = Math.floor(safeTotal / 3600);
  const m = Math.floor((safeTotal % 3600) / 60);
  const s = safeTotal % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function WorkoutDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const [day, setDay] = useState<Day | null>(null);
  const [strength, setStrength] = useState<Strength[]>([]);
  const [cardio, setCardio] = useState<Cardio[]>([]);

  const [editingStr, setEditingStr] = useState<Strength | null>(null);
  const [editingCar, setEditingCar] = useState<Cardio | null>(null);
  const [creatingStr, setCreatingStr] = useState(false);
  const [creatingCar, setCreatingCar] = useState(false);

  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const [cardioStatus, setCardioStatus] = useState<
    "none" | "pending" | "running" | "completed" | "skipped"
  >("none");

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [savedHistoryId, setSavedHistoryId] = useState<string | null>(null);
  const [strengthStartedAt, setStrengthStartedAt] = useState<number | null>(null);
  const [cardioStartedAt, setCardioStartedAt] = useState<number | null>(null);
  const [strengthDurationSec, setStrengthDurationSec] = useState(0);
  const [cardioDurationSec, setCardioDurationSec] = useState(0);
  const [now, setNow] = useState(Date.now());

  const hasCardio = cardio.length > 0;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    if (!user) return;
    const [{ data: d }, { data: s }, { data: c }] = await Promise.all([
      supabase.from("workout_days").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
      supabase
        .from("strength_exercises")
        .select("*")
        .eq("workout_day_id", id)
        .eq("user_id", user.id)
        .order("position"),
      supabase
        .from("cardio_sessions")
        .select("*")
        .eq("workout_day_id", id)
        .eq("user_id", user.id)
        .order("position"),
    ]);

    setDay((d as Day) ?? null);
    setStrength((s as Strength[]) ?? []);
    setCardio((c as Cardio[]) ?? []);
    setCompletedExerciseIds([]);
    setCardioStatus(((c as Cardio[]) ?? []).length ? "pending" : "none");
  };

  useEffect(() => {
    load();
  }, [user, id]);

  const workout = useMemo(
    () => ({
      exercises: strength,
      cardio: hasCardio ? cardio : null,
    }),
    [strength, cardio, hasCardio],
  );

  const totalExercises = workout.exercises?.length ?? 0;
  const completedExercises = completedExerciseIds.length;
  const hasCardioByWorkout = Boolean(workout.cardio);
  const cardioCompleted = cardioStatus === "completed";
  const totalItems = totalExercises + (hasCardioByWorkout ? 1 : 0);
  const completedItems = completedExercises + (cardioCompleted ? 1 : 0);
  const strengthProgress =
    totalExercises > 0 ? Math.min(100, Math.max(0, (completedExercises / totalExercises) * 100)) : 0;
  const cardioProgress = hasCardioByWorkout
    ? cardioStatus === "completed"
      ? 100
      : cardioStatus === "running"
        ? 50
        : 0
    : 0;
  const overallProgress =
    totalItems > 0 ? Math.min(100, Math.max(0, (completedItems / totalItems) * 100)) : 0;
  const overallProgressBarValue = overallProgress;

  const strengthElapsedSec =
    sessionPhase === "strength_running"
      ? strengthDurationSec + elapsedSec(strengthStartedAt, now)
      : strengthDurationSec;
  const cardioElapsedSec =
    sessionPhase === "cardio_running" ? cardioDurationSec + elapsedSec(cardioStartedAt, now) : cardioDurationSec;
  const totalElapsedSec = strengthElapsedSec + cardioElapsedSec;
  const visibleTimerSec =
    sessionPhase === "strength_running"
      ? strengthElapsedSec
      : sessionPhase === "cardio_running"
        ? cardioElapsedSec
        : sessionPhase === "strength_finished" || sessionPhase === "completed"
          ? totalElapsedSec
          : 0;

  const toggleExerciseCompleted = (exerciseId: string) => {
    setCompletedExerciseIds((prev) => {
      const next = prev.includes(exerciseId)
        ? prev.filter((item) => item !== exerciseId)
        : [...prev, exerciseId];
      return next;
    });
  };

  const markAllExercisesCompleted = () => {
    const allExerciseIds = strength.map((exercise) => exercise.id);
    setCompletedExerciseIds(allExerciseIds);
  };

  const toggleCar = (item: Cardio) => {
    const next = cardioStatus !== "completed";
    setCardioStatus(next ? "completed" : "pending");
    setCardio((list) => list.map((c) => (c.id === item.id ? { ...c, completed: next } : c)));
  };

  const startWorkout = () => {
    if (strength.length === 0 && !hasCardioByWorkout) {
      toast.error("Adicione musculação ou cardio antes de iniciar");
      return;
    }
    setSessionStartedAt(new Date().toISOString());
    setSavedHistoryId(null);
    setSessionPhase(strength.length === 0 && hasCardioByWorkout ? "cardio_running" : "strength_running");
    setStrengthStartedAt(strength.length ? Date.now() : null);
    setCardioStartedAt(strength.length ? null : Date.now());
    setStrengthDurationSec(0);
    setCardioDurationSec(0);
    setCompletedExerciseIds([]);
    setCardioStatus(hasCardioByWorkout ? (strength.length ? "pending" : "running") : "none");
    toast.success("Treino iniciado");
  };

  const saveHistory = (
    durationStrengthSeconds: number,
    durationCardioSeconds: number,
    cardioFinalStatus: "completed" | "skipped" | "none",
  ) => {
    if (!day || !sessionStartedAt) return;
    const historyId = createWorkoutHistoryId(id, sessionStartedAt);
    if (savedHistoryId === historyId) return;

    const exercises: WorkoutHistoryExercise[] = strength.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight_kg: exercise.weight_kg ?? null,
    }));

    const finishedAt = new Date().toISOString();
    const totalDurationSeconds = durationStrengthSeconds + durationCardioSeconds;

    addWorkoutHistoryEntry({
      id: historyId,
      workoutId: id,
      workoutName: day.name,
      startedAt: sessionStartedAt,
      finishedAt,
      endedAt: finishedAt,
      durationStrengthSeconds,
      strengthDurationSeconds: durationStrengthSeconds,
      durationCardioSeconds,
      cardioDurationSeconds: durationCardioSeconds,
      totalSeconds: totalDurationSeconds,
      totalDurationSeconds,
      cardioStatus: cardioFinalStatus,
      cardioPlanned: hasCardioByWorkout,
      cardioPerformed: cardioFinalStatus === "completed",
      exerciseCount: strength.length,
      exercisesCount: strength.length,
      completedExercisesCount: completedExerciseIds.length,
      exercises,
      createdAt: finishedAt,
      status: "completed",
    });
    setSavedHistoryId(historyId);
  };

  const finishStrength = () => {
    if (totalExercises > 0) markAllExercisesCompleted();

    const duration = strengthDurationSec + elapsedSec(strengthStartedAt, Date.now());
    setStrengthDurationSec(duration);
    setStrengthStartedAt(null);

    if (!hasCardioByWorkout) {
      setCardioStatus("none");
      saveHistory(duration, 0, "none");
      setSessionPhase("completed");
      toast.success("Treino finalizado");
      return;
    }

    setCardioStatus("pending");
    setSessionPhase("strength_finished");
    toast.success("Musculação finalizada");
  };

  const startCardio = () => {
    setSessionPhase("cardio_running");
    setCardioStatus("running");
    setCardioStartedAt(Date.now());
    toast.success("Cardio iniciado");
  };

  const skipCardio = () => {
    setCardioStartedAt(null);
    setCardioDurationSec(0);
    setCardioStatus("skipped");
    saveHistory(strengthDurationSec, 0, "skipped");
    setSessionPhase("completed");
    toast.success("Cardio pulado");
  };

  const finishCardio = () => {
    const duration = cardioDurationSec + elapsedSec(cardioStartedAt, Date.now());
    setCardioDurationSec(duration);
    setCardioStartedAt(null);
    setCardioStatus("completed");
    setCardio((list) => list.map((c) => ({ ...c, completed: true })));
    saveHistory(strengthDurationSec, duration, "completed");
    setSessionPhase("completed");
    toast.success("Treino finalizado");
  };

  const removeStr = async (sid: string) => {
    if (!confirm("Remover?")) return;
    if (!user) return;
    const { error } = await supabase.from("strength_exercises").delete().eq("id", sid).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    load();
  };

  const removeCar = async (cid: string) => {
    if (!confirm("Remover?")) return;
    if (!user) return;
    const { error } = await supabase.from("cardio_sessions").delete().eq("id", cid).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    load();
  };

  const moveStr = async (item: Strength, dir: -1 | 1) => {
    const idx = strength.findIndex((x) => x.id === item.id);
    const swap = strength[idx + dir];
    if (!swap) return;
    const [first, second] = await Promise.all([
      supabase.from("strength_exercises").update({ position: swap.position }).eq("id", item.id).eq("user_id", item.user_id),
      supabase.from("strength_exercises").update({ position: item.position }).eq("id", swap.id).eq("user_id", swap.user_id),
    ]);
    if (first.error || second.error) return toast.error(first.error?.message ?? second.error?.message);
    load();
  };

  const moveCar = async (item: Cardio, dir: -1 | 1) => {
    const idx = cardio.findIndex((x) => x.id === item.id);
    const swap = cardio[idx + dir];
    if (!swap) return;
    const [first, second] = await Promise.all([
      supabase.from("cardio_sessions").update({ position: swap.position }).eq("id", item.id).eq("user_id", item.user_id),
      supabase.from("cardio_sessions").update({ position: item.position }).eq("id", swap.id).eq("user_id", swap.user_id),
    ]);
    if (first.error || second.error) return toast.error(first.error?.message ?? second.error?.message);
    load();
  };

  const statusLabel =
    sessionPhase === "strength_running"
      ? "Musculação em andamento"
      : sessionPhase === "strength_finished"
        ? "Musculação finalizada"
        : sessionPhase === "cardio_running"
          ? "Cardio em andamento"
          : sessionPhase === "completed"
            ? "Concluído"
            : "Pendente";

  return (
    <AppShell>
      <BackLink to="/treinos" />
      {day && (
        <header className="mb-5">
          <h1 className="text-3xl font-semibold">{day.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {strength.length} exercício{strength.length !== 1 ? "s" : ""} · {cardio.length} cardio ·{" "}
            {day.planned_duration_min} min
          </p>
        </header>
      )}

      <section className="mb-5 rounded-3xl gradient-card border border-border/60 p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{statusLabel}</p>
          <span className="font-display text-xl font-semibold tabular-nums text-primary">{fmtSec(visibleTimerSec)}</span>
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso geral</span>
            <span>{overallProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${overallProgressBarValue}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div>
              Musculação <span className="text-foreground">{strengthProgress.toFixed(0)}%</span>
            </div>
            <div>
              Cardio <span className="text-foreground">{hasCardioByWorkout ? `${cardioProgress}%` : "sem cardio"}</span>
            </div>
          </div>
        </div>

        {sessionPhase === "strength_finished" && hasCardioByWorkout && (
          <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-sm font-semibold">Musculação finalizada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Exercícios concluídos: {completedExercises}/{strength.length}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={startCardio}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-current" /> Iniciar cardio
              </button>
              <button
                type="button"
                onClick={skipCardio}
                className="flex w-full items-center justify-center rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground active:scale-[0.98]"
              >
                Pular cardio
              </button>
            </div>
          </div>
        )}

        {sessionPhase === "idle" ? (
          <button
            type="button"
            onClick={startWorkout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" /> Iniciar treino
          </button>
        ) : sessionPhase === "strength_running" ? (
          <button
            type="button"
            onClick={finishStrength}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <Square className="h-4 w-4 fill-current" /> Finalizar musculação
          </button>
        ) : sessionPhase === "cardio_running" ? (
          <button
            type="button"
            onClick={finishCardio}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <Square className="h-4 w-4 fill-current" /> Finalizar cardio
          </button>
        ) : sessionPhase === "completed" ? (
          <div className="rounded-xl bg-success/10 px-4 py-3 text-center text-sm font-semibold text-success">
            Treino finalizado
          </div>
        ) : null}
      </section>

      <SectionHeader icon={<Dumbbell className="h-3.5 w-3.5" />} title="Musculação" onAdd={() => setCreatingStr(true)} />
      {strength.length > 0 && (
        <button
          type="button"
          onClick={markAllExercisesCompleted}
          className="mb-3 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
        >
          Marcar todos como concluídos
        </button>
      )}
      {strength.length === 0 && <Empty label="Adicione exercícios de musculação" />}
      <ul className="space-y-2">
        {strength.map((e, i) => (
          <li
            key={e.id}
            className={`rounded-2xl border bg-card p-4 transition ${
              completedExerciseIds.includes(e.id) ? "border-success/40 opacity-70" : "border-border/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <label className="mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={completedExerciseIds.includes(e.id)}
                  onChange={() => toggleExerciseCompleted(e.id)}
                />
                {completedExerciseIds.includes(e.id) && <Check className="h-3.5 w-3.5" />}
              </label>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${completedExerciseIds.includes(e.id) ? "line-through" : ""}`}>{e.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.sets}x{e.reps} · {e.weight_kg}kg · descanso {e.rest_sec}s
                </p>
              </div>
              <RowActions
                onUp={() => moveStr(e, -1)}
                upDisabled={i === 0}
                onDown={() => moveStr(e, 1)}
                downDisabled={i === strength.length - 1}
                onEdit={() => setEditingStr(e)}
                onDelete={() => removeStr(e.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <SectionHeader icon={<Heart className="h-3.5 w-3.5" />} title="Cardio" onAdd={() => setCreatingCar(true)} />
        {cardio.length === 0 && <Empty label="Adicione sessões de cardio" />}
        <ul className="space-y-2">
          {cardio.map((c, i) => (
            <li
              key={c.id}
              className={`rounded-2xl border bg-card p-4 transition ${c.completed ? "border-success/40 opacity-70" : "border-border/60"}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleCar(c)}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    c.completed ? "border-success bg-success text-primary-foreground" : "border-border"
                  }`}
                >
                  {c.completed && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${c.completed ? "line-through" : ""}`}>{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.duration_min} min · {c.intensity}
                  </p>
                </div>
                <RowActions
                  onUp={() => moveCar(c, -1)}
                  upDisabled={i === 0}
                  onDown={() => moveCar(c, 1)}
                  downDisabled={i === cardio.length - 1}
                  onEdit={() => setEditingCar(c)}
                  onDelete={() => removeCar(c.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {(creatingStr || editingStr) && (
        <StrengthForm
          dayId={id}
          initial={editingStr}
          nextPos={strength.length}
          onClose={() => {
            setEditingStr(null);
            setCreatingStr(false);
          }}
          onSaved={() => {
            setEditingStr(null);
            setCreatingStr(false);
            load();
          }}
        />
      )}
      {(creatingCar || editingCar) && (
        <CardioForm
          dayId={id}
          initial={editingCar}
          nextPos={cardio.length}
          onClose={() => {
            setEditingCar(null);
            setCreatingCar(false);
          }}
          onSaved={() => {
            setEditingCar(null);
            setCreatingCar(false);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function SectionHeader({
  icon,
  title,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  onAdd: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <button
        type="button"
        aria-label={`Adicionar ${title.toLowerCase()}`}
        onClick={onAdd}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="mb-2 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function RowActions({
  onUp,
  upDisabled,
  onDown,
  downDisabled,
  onEdit,
  onDelete,
}: {
  onUp: () => void;
  upDisabled: boolean;
  onDown: () => void;
  downDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onUp}
        disabled={upDisabled}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={downDisabled}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-destructive hover:bg-secondary">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StrengthForm({
  dayId,
  initial,
  nextPos,
  onClose,
  onSaved,
}: {
  dayId: string;
  initial: Strength | null;
  nextPos: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, set] = useForm({
    name: initial?.name ?? "",
    sets: initial?.sets ?? 3,
    reps: initial?.reps ?? "10",
    weight_kg: initial?.weight_kg ?? 0,
    rest_sec: initial?.rest_sec ?? 60,
    notes: initial?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        workout_day_id: dayId,
        user_id: user.id,
        name: form.name,
        sets: form.sets,
        reps: form.reps,
        weight_kg: form.weight_kg,
        rest_sec: form.rest_sec,
        notes: form.notes || null,
        position: initial?.position ?? nextPos,
      };
      const res = initial
        ? await supabase.from("strength_exercises").update(payload).eq("id", initial.id).eq("user_id", user.id)
        : await supabase.from("strength_exercises").insert(payload);
      if (res.error) throw res.error;
      toast.success("Salvo");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar exercício");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Editar exercício" : "Novo exercício"}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Nome">
          <TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Séries">
            <TextInput type="number" min={1} value={form.sets} onChange={(e) => set("sets", Number(e.target.value))} />
          </Field>
          <Field label="Reps">
            <TextInput value={form.reps} onChange={(e) => set("reps", e.target.value)} />
          </Field>
          <Field label="Carga (kg)">
            <TextInput type="number" step="0.5" value={form.weight_kg} onChange={(e) => set("weight_kg", Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Descanso (s)">
          <TextInput type="number" min={0} value={form.rest_sec} onChange={(e) => set("rest_sec", Number(e.target.value))} />
        </Field>
        <Field label="Observações">
          <TextArea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
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

function CardioForm({
  dayId,
  initial,
  nextPos,
  onClose,
  onSaved,
}: {
  dayId: string;
  initial: Cardio | null;
  nextPos: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, set] = useForm({
    name: initial?.name ?? "",
    duration_min: initial?.duration_min ?? 20,
    intensity: initial?.intensity ?? "Moderada",
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        workout_day_id: dayId,
        user_id: user.id,
        name: form.name,
        duration_min: form.duration_min,
        intensity: form.intensity,
        position: initial?.position ?? nextPos,
      };
      const res = initial
        ? await supabase.from("cardio_sessions").update(payload).eq("id", initial.id).eq("user_id", user.id)
        : await supabase.from("cardio_sessions").insert(payload);
      if (res.error) throw res.error;
      toast.success("Salvo");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cardio");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Editar cardio" : "Novo cardio"}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Nome">
          <TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} />
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
              <option>Leve</option>
              <option>Moderada</option>
              <option>Alta</option>
              <option>Intervalado</option>
            </select>
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
