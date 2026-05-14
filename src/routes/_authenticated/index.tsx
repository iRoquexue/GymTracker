import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Dumbbell, Heart, Play, Flame, Scale, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getGreeting, getDailyPhrase } from "@/lib/greeting";
import { percentage } from "@/lib/progress";
import { getLocalUserProfile } from "@/lib/user-profile";
import { formatDuration, getWorkoutHistory, subscribeWorkoutHistory } from "@/lib/workout-history";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Início — GymTracker" }] }),
  component: HomePage,
});

type Day = {
  id: string;
  name: string;
  weekday: number | null;
  planned_duration_min: number;
  status: string;
  duration_actual_sec: number;
};
type MealSummary = { kcal: number | null };
type WeightSummary = { weight_kg: number | null };
type ExerciseProgress = { workout_day_id: string; completed: boolean | null };

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("Atleta");
  const [todayDays, setTodayDays] = useState<Day[]>([]);
  const [counts, setCounts] = useState<
    Record<string, { s: number; sd: number; c: number; cd: number }>
  >({});
  const [kcalToday, setKcalToday] = useState(0);
  const [kcalGoal, setKcalGoal] = useState(2600);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    window.localStorage.removeItem("fitcore.active-workout");
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeWorkoutHistory(() => setHistoryTick((v) => v + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const weekday = new Date().getDay();
    (async () => {
      const [{ data: profile }, { data: days }, { data: meals }, { data: w }, { count }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, daily_kcal_goal")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("workout_days")
            .select("*")
            .eq("user_id", user.id)
            .eq("weekday", weekday)
            .order("position"),
          supabase.from("meals").select("kcal").eq("user_id", user.id),
          supabase
            .from("weight_logs")
            .select("weight_kg")
            .eq("user_id", user.id)
            .order("logged_at", { ascending: false })
            .limit(1),
          supabase
            .from("workout_days")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "completed"),
        ]);
      const localProfile = getLocalUserProfile(user.id);
      if (localProfile.displayName || profile?.display_name) {
        setName(localProfile.displayName || profile?.display_name || "Atleta");
      }
      if (localProfile.dailyKcalGoal || profile?.daily_kcal_goal) {
        setKcalGoal(localProfile.dailyKcalGoal || profile?.daily_kcal_goal || 2600);
      }
      const list = (days as Day[]) ?? [];
      setTodayDays(list);
      setKcalToday(((meals as MealSummary[]) ?? []).reduce((a, m) => a + (m.kcal ?? 0), 0));
      setLastWeight(localProfile.weightKg ?? (w as WeightSummary[])?.[0]?.weight_kg ?? null);
      setStreak(count ?? 0);

      if (list.length) {
        const ids = list.map((d) => d.id);
        const [{ data: ses }, { data: cs }] = await Promise.all([
          supabase
            .from("strength_exercises")
            .select("workout_day_id, completed")
            .in("workout_day_id", ids),
          supabase
            .from("cardio_sessions")
            .select("workout_day_id, completed")
            .in("workout_day_id", ids),
        ]);
        const map: typeof counts = {};
        for (const id of ids) map[id] = { s: 0, sd: 0, c: 0, cd: 0 };
        for (const r of (ses as ExerciseProgress[]) ?? []) {
          map[r.workout_day_id].s++;
          if (r.completed) map[r.workout_day_id].sd++;
        }
        for (const r of (cs as ExerciseProgress[]) ?? []) {
          map[r.workout_day_id].c++;
          if (r.completed) map[r.workout_day_id].cd++;
        }
        setCounts(map);
      }
    })();
  }, [user, historyTick]);

  const today = todayDays[0];
  const todayHistoryEntry = (() => {
    if (!today) return null;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    return getWorkoutHistory().find((entry) => {
      if (entry.workoutId !== today.id) return false;
      const finishedAt = new Date(entry.finishedAt);
      return (
        finishedAt.getFullYear() === y &&
        finishedAt.getMonth() === m &&
        finishedAt.getDate() === d
      );
    });
  })();
  const c = today
    ? (counts[today.id] ?? { s: 0, sd: 0, c: 0, cd: 0 })
    : { s: 0, sd: 0, c: 0, cd: 0 };
  const totalMin = todayDays.reduce((a, d) => a + (d.planned_duration_min ?? 0), 0);
  const strPct = todayHistoryEntry ? 100 : percentage(c.sd, c.s);
  const carPct = todayHistoryEntry
    ? todayHistoryEntry.cardioStatus === "completed"
      ? 100
      : 0
    : percentage(c.cd, c.c);
  const cardioSummary = todayHistoryEntry
    ? todayHistoryEntry.cardioStatus === "skipped"
      ? "Não realizado"
      : todayHistoryEntry.cardioStatus === "none"
        ? "sem cardio"
        : `${carPct}%`
    : c.c
      ? `${c.cd}/${c.c}`
      : "sem cardio";

  const startTodayWorkout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ to: "/treinos" });
  };

  return (
    <AppShell>
      <header className="mb-7">
        <p className="text-sm font-medium text-muted-foreground">
          {getGreeting()}, {name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight">O que vamos fazer hoje?</h1>
        <p className="mt-2 text-sm text-muted-foreground text-balance">{getDailyPhrase()}</p>
      </header>

      <section className="rounded-3xl gradient-card border border-border/60 p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Treino de hoje
            </p>
            <h2 className="mt-1 text-xl font-semibold">{today?.name ?? "Sem treino agendado"}</h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Clock className="h-3.5 w-3.5" /> {fmtMin(totalMin)}
          </div>
        </div>

        <Block
          icon={<Dumbbell className="h-5 w-5" />}
          label="Musculação"
          pct={strPct}
          count={c.s ? `${c.sd}/${c.s}` : "0/0"}
        />
        <div className="my-4 h-px bg-border/60" />
        <Block
          icon={<Heart className="h-5 w-5" />}
          label="Cardio"
          pct={carPct}
          count={cardioSummary}
        />

        {todayHistoryEntry && (
          <div className="mt-4 rounded-xl bg-background/40 p-3 text-xs text-muted-foreground">
            <div>Musculação: {formatDuration(todayHistoryEntry.durationStrengthSeconds)}</div>
            <div>
              Cardio:{" "}
              {todayHistoryEntry.cardioStatus === "skipped"
                ? "Não realizado"
                : formatDuration(todayHistoryEntry.durationCardioSeconds)}
            </div>
            <div>Total: {formatDuration(todayHistoryEntry.totalSeconds)}</div>
          </div>
        )}

        {today && (today.status === "completed" || !!todayHistoryEntry) && (
          <Link
            to="/treinos/$id"
            params={{ id: today.id }}
            className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" /> Concluído
          </Link>
        )}
        {today && today.status !== "completed" && (
          <button
            type="button"
            onClick={startTodayWorkout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" /> Iniciar treino
          </button>
        )}
        {!today && (
          <Link
            to="/treinos"
            className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold active:scale-[0.98]"
          >
            Criar treino
          </Link>
        )}
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Resumo de hoje
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={<Flame className="h-4 w-4" />}
            label="Calorias"
            value={kcalToday.toLocaleString("pt-BR")}
            hint={`/ ${kcalGoal} kcal`}
          />
          <Stat
            icon={<Scale className="h-4 w-4" />}
            label="Peso"
            value={lastWeight ? lastWeight.toString().replace(".", ",") : "—"}
            hint="kg"
          />
          <Stat
            icon={<Trophy className="h-4 w-4" />}
            label="Concluídos"
            value={streak.toString()}
            hint="treinos"
            highlight
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Hoje"
            value={todayDays.length.toString()}
            hint="agenda"
          />
        </div>
      </section>
    </AppShell>
  );
}

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function Block({
  icon,
  label,
  pct,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  count: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold">{count}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 p-4 ${highlight ? "bg-primary/10" : "bg-card"}`}
    >
      <div
        className={`flex items-center gap-2 text-xs ${highlight ? "text-primary" : "text-muted-foreground"}`}
      >
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-semibold">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
