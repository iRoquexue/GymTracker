import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { GhostBtn, Modal } from "@/components/forms";
import {
  clearWorkoutHistory,
  formatDuration,
  getWorkoutHistory,
  subscribeWorkoutHistory,
  type WorkoutHistoryEntry,
} from "@/lib/workout-history";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — GymTracker" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [selected, setSelected] = useState<WorkoutHistoryEntry | null>(null);

  useEffect(() => {
    const sync = () => setHistory(getWorkoutHistory());
    sync();
    const unsubscribe = subscribeWorkoutHistory(sync);
    return unsubscribe;
  }, []);

  const stats = history.reduce(
    (acc, item) => ({
      total: acc.total + 1,
      strength: acc.strength + item.durationStrengthSeconds,
      cardio: acc.cardio + item.durationCardioSeconds,
      all: acc.all + item.totalSeconds,
    }),
    { total: 0, strength: 0, cardio: 0, all: 0 },
  );
  const average = stats.total ? Math.round(stats.all / stats.total) : 0;

  const clearHistory = () => {
    if (!confirm("Limpar todo o histórico de treinos?")) return;
    clearWorkoutHistory();
    setHistory([]);
    setSelected(null);
    toast.success("Histórico limpo");
  };

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Histórico" subtitle="Treinos concluídos" />
        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="mt-2 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground"
          >
            Limpar histórico
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Treinos" value={stats.total.toString()} />
        <Stat label="Tempo total" value={formatDuration(stats.all)} />
        <Stat label="Musculação" value={formatDuration(stats.strength)} />
        <Stat label="Cardio" value={formatDuration(stats.cardio)} />
        <Stat label="Média" value={formatDuration(average)} />
      </div>

      <h3 className="mt-7 mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Treinos concluídos
      </h3>

      {history.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Nenhum treino concluído ainda.
        </p>
      )}

      <ul className="space-y-2">
        {history.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="w-full rounded-2xl border border-border/60 bg-card p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.workoutName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatHistoryDate(item.finishedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  {item.exerciseCount} exercícios
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Metric label="Musculação" value={formatDuration(item.durationStrengthSeconds)} />
                <Metric label="Cardio" value={formatDuration(item.durationCardioSeconds)} />
                <Metric label="Total" value={formatDuration(item.totalSeconds)} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Cardio: {cardioStatusLabel(item)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {selected && <HistoryModal entry={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cardioStatusLabel(entry: WorkoutHistoryEntry) {
  if (entry.cardioPerformed) return "realizado";
  if (entry.durationCardioSeconds > 0) return "realizado";
  if (entry.cardioPlanned) return "não realizado";
  return "não tinha cardio";
}

function HistoryModal({ entry, onClose }: { entry: WorkoutHistoryEntry; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Treino concluído">
      <div className="space-y-4">
        <div>
          <p className="font-display text-xl font-semibold">{entry.workoutName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatHistoryDate(entry.startedAt)} até {formatHistoryDate(entry.finishedAt)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Musculação" value={formatDuration(entry.durationStrengthSeconds)} />
          <Metric label="Cardio" value={formatDuration(entry.durationCardioSeconds)} />
          <Metric label="Total" value={formatDuration(entry.totalSeconds)} />
        </div>

        <div className="rounded-xl bg-background/40 p-3 text-xs text-muted-foreground">
          Cardio {cardioStatusLabel(entry)}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Exercícios realizados
          </p>
          {entry.exercises.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background p-4 text-center text-xs text-muted-foreground">
              Nenhum exercício registrado.
            </p>
          ) : (
            <ul className="space-y-2">
              {entry.exercises.map((exercise, index) => (
                <li
                  key={`${entry.id}-${exercise.name}-${index}`}
                  className="rounded-xl border border-border/60 bg-background p-3"
                >
                  <p className="text-sm font-semibold">{exercise.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {exercise.sets}x{exercise.reps}
                    {exercise.weight_kg ? ` · ${exercise.weight_kg}kg` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <GhostBtn type="button" onClick={onClose}>
          Fechar
        </GhostBtn>
      </div>
    </Modal>
  );
}
