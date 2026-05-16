export type WorkoutHistoryExercise = {
  name: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
};

export type WorkoutHistoryEntry = {
  id: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  durationStrengthSeconds: number;
  durationCardioSeconds: number;
  totalSeconds: number;
  endedAt?: string;
  strengthDurationSeconds?: number;
  cardioDurationSeconds?: number;
  totalDurationSeconds?: number;
  cardioStatus?: "completed" | "skipped" | "none";
  exercisesCount?: number;
  completedExercisesCount?: number;
  createdAt?: string;
  cardioPlanned?: boolean;
  cardioPerformed: boolean;
  exerciseCount: number;
  exercises: WorkoutHistoryExercise[];
  status: "completed";
};

const STORAGE_KEY = "fitcore.workout-history";
const HISTORY_UPDATED_EVENT = "fitcore.workout-history.updated";

function readRawHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: WorkoutHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

export function getWorkoutHistory(): WorkoutHistoryEntry[] {
  return readRawHistory()
    .filter((entry): entry is WorkoutHistoryEntry => {
      return (
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.workoutId === "string" &&
        entry.status === "completed"
      );
    })
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime());
}

export function addWorkoutHistoryEntry(entry: WorkoutHistoryEntry) {
  const current = getWorkoutHistory();
  if (current.some((item) => item.id === entry.id)) return current;
  const next = [entry, ...current];
  writeHistory(next);
  return next;
}

export function clearWorkoutHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

export function createWorkoutHistoryId(workoutId: string, startedAt: string) {
  return `${workoutId}-${new Date(startedAt).getTime()}`;
}

export function formatDuration(total: number) {
  const safeTotal = Math.max(0, Math.floor(total));
  const h = Math.floor(safeTotal / 3600);
  const m = Math.floor((safeTotal % 3600) / 60);
  const s = safeTotal % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function subscribeWorkoutHistory(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(HISTORY_UPDATED_EVENT, listener);
  return () => window.removeEventListener(HISTORY_UPDATED_EVENT, listener);
}
