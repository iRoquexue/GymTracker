ALTER TABLE public.workout_days
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS muscle_group text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'strength';

ALTER TABLE public.strength_exercises
  ADD COLUMN IF NOT EXISTS notes text;