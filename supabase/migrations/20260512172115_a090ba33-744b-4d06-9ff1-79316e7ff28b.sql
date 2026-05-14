
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.workouts CASCADE;

CREATE TABLE public.workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  weekday smallint,
  scheduled_date date,
  status text NOT NULL DEFAULT 'planned',
  planned_duration_min integer NOT NULL DEFAULT 60,
  duration_actual_sec integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wd all" ON public.workout_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_wd_updated BEFORE UPDATE ON public.workout_days FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.strength_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sets integer NOT NULL DEFAULT 3,
  reps text NOT NULL DEFAULT '10',
  weight_kg numeric NOT NULL DEFAULT 0,
  rest_sec integer NOT NULL DEFAULT 60,
  position integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.strength_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own se all" ON public.strength_exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_se_updated BEFORE UPDATE ON public.strength_exercises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_se_day ON public.strength_exercises(workout_day_id);

CREATE TABLE public.cardio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  duration_min integer NOT NULL DEFAULT 20,
  intensity text NOT NULL DEFAULT 'Moderada',
  position integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cs all" ON public.cardio_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.cardio_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cs_day ON public.cardio_sessions(workout_day_id);
