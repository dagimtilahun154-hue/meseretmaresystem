-- ==========================================
-- SOLARFLOW MANAGER - SUPABASE SCHEMA START
-- ==========================================

-- 1. App Users
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'manager',
    display_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products / Inventory
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    sell_price NUMERIC DEFAULT 0,
    unit TEXT,
    measurement_unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. POS Transactions
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    customer_name TEXT,
    payment_method TEXT,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    note TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Transaction Items
CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
    id BIGSERIAL PRIMARY KEY,
    transaction_id TEXT REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0
);

-- 4. Field Work Jobs
CREATE TABLE IF NOT EXISTS public.field_jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    customer_name TEXT,
    location TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    scheduled_date DATE,
    completed_date DATE,
    cost NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FINANCE HUB TABLES
-- ==========================================

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    tin TEXT,
    credit_limit NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    tin TEXT,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    opening_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    date DATE NOT NULL,
    due_date DATE,
    subtotal NUMERIC DEFAULT 0,
    total_vat NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    product TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0
);

-- Purchase Bills
CREATE TABLE IF NOT EXISTS public.bills (
    id TEXT PRIMARY KEY,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    date DATE NOT NULL,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill Items
CREATE TABLE IF NOT EXISTS public.bill_items (
    id BIGSERIAL PRIMARY KEY,
    bill_id TEXT REFERENCES public.bills(id) ON DELETE CASCADE,
    product TEXT,
    quantity NUMERIC DEFAULT 1,
    cost_price NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    reference TEXT,
    entity_id TEXT,
    entity_name TEXT,
    invoice_or_bill_id TEXT,
    amount NUMERIC DEFAULT 0,
    method TEXT,
    date DATE,
    type TEXT, -- 'received' or 'made'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    category TEXT,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    date DATE,
    method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id TEXT PRIMARY KEY,
    date DATE,
    description TEXT,
    debit_account TEXT,
    credit_account TEXT,
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) and set to allow all operations temporarily
-- For production, these policies should be secured based on `app_users` roles.
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Temporary public access policies (Warning: only for development/internal use without Auth tokens)
CREATE POLICY "Allow all select" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.app_users FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.app_users FOR DELETE USING (true);

-- Apply similar generic policies to other tables if using anon key without real user sessions
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all on pos_transactions" ON public.pos_transactions FOR ALL USING (true);
CREATE POLICY "Allow all on pos_transaction_items" ON public.pos_transaction_items FOR ALL USING (true);
CREATE POLICY "Allow all on field_jobs" ON public.field_jobs FOR ALL USING (true);
CREATE POLICY "Allow all on customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow all on vendors" ON public.vendors FOR ALL USING (true);
CREATE POLICY "Allow all on accounts" ON public.accounts FOR ALL USING (true);
CREATE POLICY "Allow all on invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Allow all on invoice_items" ON public.invoice_items FOR ALL USING (true);
CREATE POLICY "Allow all on bills" ON public.bills FOR ALL USING (true);
CREATE POLICY "Allow all on bill_items" ON public.bill_items FOR ALL USING (true);
CREATE POLICY "Allow all on payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all on expenses" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow all on journal_entries" ON public.journal_entries FOR ALL USING (true);

-- ==========================================
-- HR & ATTENDANCE MANAGEMENT TABLES
-- ==========================================

-- Departments
CREATE TABLE IF NOT EXISTS public.hr_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Settings
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
    status TEXT DEFAULT 'Active', -- 'Active', 'Inactive'
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
    status TEXT DEFAULT 'Present', -- 'Present', 'Late', 'Absent', 'Half Day', 'Early Leave'
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for HR Tables
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Generic development policies (Allow all for now)
CREATE POLICY "Allow all on hr_departments" ON public.hr_departments FOR ALL USING (true);
CREATE POLICY "Allow all on hr_settings" ON public.hr_settings FOR ALL USING (true);
CREATE POLICY "Allow all on hr_workers" ON public.hr_workers FOR ALL USING (true);
CREATE POLICY "Allow all on hr_attendance_logs" ON public.hr_attendance_logs FOR ALL USING (true);

-- Insert default settings if not exists
INSERT INTO public.hr_settings (work_start_time, work_end_time, grace_period_minutes, company_name)
VALUES ('08:00', '17:00', 15, 'SolarFlow Manager HR')
ON CONFLICT DO NOTHING;

-- Insert a default admin user
INSERT INTO public.app_users (username, password_hash, role, display_name) 
VALUES ('admin', 'admin', 'manager', 'System Administrator')
ON CONFLICT (username) DO NOTHING;
