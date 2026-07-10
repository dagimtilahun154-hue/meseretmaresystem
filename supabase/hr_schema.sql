-- ==========================================
-- HR & ATTENDANCE MANAGEMENT - RUN THIS IN
-- YOUR SUPABASE SQL EDITOR
-- ==========================================

-- Departments
CREATE TABLE IF NOT EXISTS public.hr_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Settings (one row per company)
CREATE TABLE IF NOT EXISTS public.hr_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_start_time TIME NOT NULL DEFAULT '08:00',
    work_end_time TIME NOT NULL DEFAULT '17:00',
    grace_period_minutes INTEGER DEFAULT 15,
    company_name TEXT DEFAULT 'My Company',
    company_logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workers
CREATE TABLE IF NOT EXISTS public.hr_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    position TEXT,
    department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    photo_url TEXT,
    fingerprint_id TEXT UNIQUE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Logs
CREATE TABLE IF NOT EXISTS public.hr_attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES public.hr_workers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    total_hours NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Present',
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for development - using service role key anyway)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_departments' AND policyname = 'Allow all on hr_departments') THEN
    CREATE POLICY "Allow all on hr_departments" ON public.hr_departments FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_settings' AND policyname = 'Allow all on hr_settings') THEN
    CREATE POLICY "Allow all on hr_settings" ON public.hr_settings FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_workers' AND policyname = 'Allow all on hr_workers') THEN
    CREATE POLICY "Allow all on hr_workers" ON public.hr_workers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_attendance_logs' AND policyname = 'Allow all on hr_attendance_logs') THEN
    CREATE POLICY "Allow all on hr_attendance_logs" ON public.hr_attendance_logs FOR ALL USING (true);
  END IF;
END $$;

-- Insert default settings row
INSERT INTO public.hr_settings (work_start_time, work_end_time, grace_period_minutes, company_name)
VALUES ('08:00', '17:00', 15, 'SolarFlow Manager HR')
ON CONFLICT DO NOTHING;

-- Confirm success
SELECT 'HR tables created successfully!' AS result;
