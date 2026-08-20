-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the completions table
CREATE TABLE IF NOT EXISTS public.completions (
  id            text PRIMARY KEY,          -- task ID, e.g. "p0-t2"
  task_name     text,                      -- the actual text of the task
  completed_by  text NOT NULL,             -- name entered in the modal
  completed_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;

-- 3. Policies — anyone with the anon key can read, insert, and delete
--    (suitable for a closed team sharing the link; add auth if you want per-user control)
CREATE POLICY "public read"
  ON public.completions FOR SELECT
  USING (true);

CREATE POLICY "public insert"
  ON public.completions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public delete"
  ON public.completions FOR DELETE
  USING (true);

-- 4. Enable Realtime for the table (required for live sync across tabs/browsers)
--    Supabase dashboard: Database → Replication → completions → toggle ON
--    OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.completions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Discrepancies Table (Audit Log for Unchecks)
-- ─────────────────────────────────────────────────────────────────────────────

-- 5. Create the discrepancies table
CREATE TABLE IF NOT EXISTS public.discrepancies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id text NOT NULL,
  task_name text,
  original_author text NOT NULL,
  unchecked_by text NOT NULL,
  reason text NOT NULL,
  unchecked_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable Row Level Security
ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;

-- 7. Policies — anyone can insert and read
CREATE POLICY "public read discrepancies"
  ON public.discrepancies FOR SELECT
  USING (true);

CREATE POLICY "public insert discrepancies"
  ON public.discrepancies FOR INSERT
  WITH CHECK (true);

-- 8. Enable Realtime for discrepancies (optional, if you want live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.discrepancies;
