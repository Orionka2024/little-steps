CREATE TABLE IF NOT EXISTS public.classroom_records (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT 'local_seedy',
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classroom_records_owner ON public.classroom_records(owner);
CREATE INDEX IF NOT EXISTS idx_classroom_records_kind ON public.classroom_records(kind);

CREATE TABLE IF NOT EXISTS public.classroom_submissions_archive (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT 'local_seedy',
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classroom_files (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  base64_data TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.classroom_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access for service and app" ON public.classroom_records;
CREATE POLICY "Allow full access for service and app" ON public.classroom_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access for service and app" ON public.classroom_submissions_archive;
CREATE POLICY "Allow full access for service and app" ON public.classroom_submissions_archive FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access for service and app" ON public.classroom_files;
CREATE POLICY "Allow full access for service and app" ON public.classroom_files FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.classroom_records TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.classroom_submissions_archive TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.classroom_files TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
