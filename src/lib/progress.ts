export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function percentage(completed: number, total: number) {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return 0;
  return clampPercentage((completed / total) * 100);
}

export type CardioProgressStatus = "none" | "pending" | "running" | "completed" | "skipped";

export function calculateWorkoutProgress({
  totalExercises,
  completedExercises,
  hasCardio,
  cardioStatus,
}: {
  totalExercises: number;
  completedExercises: number;
  hasCardio: boolean;
  cardioStatus: CardioProgressStatus;
}) {
  const safeTotalExercises = Math.max(0, Math.floor(totalExercises));
  const safeCompletedExercises = Math.min(
    safeTotalExercises,
    Math.max(0, Math.floor(completedExercises)),
  );
  const totalItems = safeTotalExercises + (hasCardio ? 1 : 0);
  const completedItems =
    safeCompletedExercises + (hasCardio && cardioStatus === "completed" ? 1 : 0);

  return percentage(completedItems, totalItems);
}

export function calculateCardioProgress(cardioStatus: CardioProgressStatus) {
  if (cardioStatus === "completed") return 100;
  if (cardioStatus === "running") return 50;
  return 0;
}
