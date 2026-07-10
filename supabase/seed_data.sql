-- ==========================================
-- SOLARFLOW MANAGER - SYSTEM DATA MIGRATION
-- ==========================================

-- 1. App Users
INSERT INTO public.app_users (id, username, password_hash, role, display_name) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin', 'admin', 'manager', 'System Administrator'),
('550e8400-e29b-41d4-a716-446655440002', 'manager', '123', 'manager', 'Manager'),
('550e8400-e29b-41d4-a716-446655440003', 'finance', '123', 'finance', 'Finance Officer'),
('550e8400-e29b-41d4-a716-446655440004', 'store', '123', 'storekeeper', 'Store Keeper'),
('550e8400-e29b-41d4-a716-446655440005', 'field', '123', 'fieldwork', 'Field Work Controller')
ON CONFLICT (username) DO NOTHING;

-- 2. Products / Inventory
INSERT INTO public.products (id, name, category, quantity, cost_price, sell_price, unit, measurement_unit) VALUES
('1', 'PUMP CONTROLLER 5500W DC 300V-780V', 'Pump Equipment', 20, 450, 650, 'Piece', 'Piece'),
('2', 'PUMP CONTROLLER 1500W DC 80V-420V', 'Pump Equipment', 70, 280, 420, 'Piece', 'Piece'),
('3', 'PUMP CONTROLLER 7500W DC 300V-780V', 'Pump Equipment', 30, 520, 780, 'Piece', 'Piece'),
('4', 'SOLAR PANEL 330W', 'Solar Panels', 15, 120, 185, 'Piece', 'Piece'),
('5', 'SOLAR PANEL ROD', 'Solar Panels', 35, 35, 55, 'Pack', 'Pack'),
('6', 'HDPE ELBOW 4 INCH', 'HDPE Fittings', 17, 8, 14, 'Piece', 'Piece'),
('7', 'HDPE ELBOW 3 INCH', 'HDPE Fittings', 50, 6, 11, 'Piece', 'Piece'),
('8', 'HDPE ELBOW 2 INCH', 'HDPE Fittings', 11, 4, 7, 'Piece', 'Piece'),
('9', 'HDPE MALE ADAPTOR 3 INCH', 'HDPE Fittings', 33, 7, 12, 'Piece', 'Piece'),
('10', 'HDPE MALE ADAPTOR 2 INCH', 'HDPE Fittings', 55, 5, 9, 'Piece', 'Piece'),
('11', 'HDPE FEMALE ADAPTOR 3 INCH', 'HDPE Fittings', 21, 7, 12, 'Piece', 'Piece'),
('12', 'HDPE SOCKET 2 INCH', 'HDPE Fittings', 17, 3, 6, 'Piece', 'Piece'),
('13', 'HDPE TEE ½ INCH', 'HDPE Fittings', 31, 4, 7, 'Piece', 'Piece'),
('14', 'GS UNION 4 INCH', 'GS Fittings', 25, 12, 20, 'Piece', 'Piece'),
('15', 'GS UNION 2½ INCH', 'GS Fittings', 19, 8, 14, 'Piece', 'Piece'),
('16', 'GS SOCKET 4 INCH', 'GS Fittings', 42, 10, 16, 'Piece', 'Piece'),
('17', 'GS SOCKET 3 INCH', 'GS Fittings', 22, 8, 13, 'Piece', 'Piece'),
('18', 'GS NIPPLES 4 INCH', 'GS Fittings', 46, 5, 9, 'Piece', 'Piece'),
('19', 'GS NIPPLES 3 INCH', 'GS Fittings', 28, 4, 7, 'Piece', 'Piece'),
('20', 'GS BALL VALVE 4 INCH', 'GS Fittings', 12, 18, 28, 'Piece', 'Piece'),
('21', 'GS GATE VALVE 3 INCH', 'GS Fittings', 10, 15, 24, 'Piece', 'Piece'),
('22', 'IRON FOOT VALVE 3 INCH', 'Foot Valves', 44, 12, 20, 'Piece', 'Piece'),
('23', 'IRON FOOT VALVE 2 INCH', 'Foot Valves', 29, 8, 14, 'Piece', 'Piece'),
('24', 'PLASTIC FOOT VALVE 3 INCH', 'Foot Valves', 15, 6, 10, 'Piece', 'Piece'),
('25', 'PLASTIC FOOT VALVE 2 INCH', 'Foot Valves', 38, 4, 7, 'Piece', 'Piece'),
('26', 'HDPE FOOT VALVE 1 INCH', 'Foot Valves', 45, 3, 6, 'Piece', 'Piece'),
('27', 'IRON FLOAT SWITCH', 'Accessories', 10, 15, 25, 'Piece', 'Piece'),
('28', 'PLASTIC FLOAT SWITCH', 'Accessories', 26, 8, 14, 'Piece', 'Piece'),
('29', 'FASHETA 4 INCH', 'Accessories', 39, 2, 4, 'Piece', 'Piece'),
('30', 'FLEXIBLE HOSE 4 INCH', 'Pipes', 21, 25, 40, 'Piece', 'Meter (m)'),
('31', 'FLEXIBLE HOSE 2 INCH', 'Pipes', 31, 18, 28, 'Piece', 'Meter (m)'),
('32', 'HDPE PIPE 1.5 INCH (10m)', 'Pipes', 41, 22, 35, 'Piece', 'Meter (m)')
ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- 3. Field Jobs
INSERT INTO public.field_jobs (id, title, customer_name, location, status, priority, scheduled_date, completed_date, cost, notes) VALUES
('FW001', 'Pump Installation Hawassa', 'Ahmed Hassan', 'Hawassa', 'completed', 'medium', '2026-03-05', '2026-03-07', 3000, 'Installation completed successfully.'),
('FW002', 'Maintenance Service Dire Dawa', 'Solomon Bekele', 'Dire Dawa', 'in-progress', 'high', '2026-03-08', NULL, 5000, 'Installation starts tomorrow.')
ON CONFLICT (id) DO NOTHING;

-- 4. Accounts (Standard Chart of Accounts)
INSERT INTO public.accounts (id, name, type, description, opening_balance) VALUES
('acc-1001', 'Main Bank Account', 'Assets', 'Business Cash Account', 1000000),
('acc-1200', 'Inventory Asset', 'Assets', 'Stock Value', 0),
('acc-2100', 'VAT Payable', 'Liabilities', 'Collected VAT', 0),
('acc-3000', 'Owner Equity', 'Equity', 'Initial Investment', 1000000),
('acc-4100', 'Sales Revenue', 'Revenue', 'Income from installations', 0),
('acc-5100', 'Payroll Expense', 'Expenses', 'Employee salaries', 0)
ON CONFLICT (id) DO NOTHING;

-- 5. Expenses (From Mock Data)
INSERT INTO public.expenses (id, category, description, amount, date, method) VALUES
('e1', 'Per Diem', 'Ahmed Ali - 4 days', 2000, '2026-03-17', 'Cash'),
('cf4', 'Transport', 'Field vehicle rental', 3500, '2026-03-12', 'Cash'),
('cf6', 'Inventory', 'HDPE pipe restock', 25000, '2026-03-08', 'Bank Transfer')
ON CONFLICT (id) DO NOTHING;

-- 6. Customers (From Mock Data)
INSERT INTO public.customers (id, name, phone, email, address, tin, credit_limit, balance) VALUES
('cust-1', 'Ahmed Hassan', '0911223344', 'ahmed@example.com', 'Hawassa', 'TIN-001', 50000, 0),
('cust-2', 'Solomon Bekele', '0912334455', 'solomon@example.com', 'Dire Dawa', 'TIN-002', 100000, 0),
('cust-3', 'Kebede Farm', '0913445566', 'kebede@farm.com', 'Addis Ababa', 'TIN-003', 200000, 4500)
ON CONFLICT (id) DO NOTHING;

-- 7. Journal Entries (From Mock Data)
INSERT INTO public.journal_entries (id, date, description, debit_account, credit_account, amount) VALUES
('je1', '2026-03-01', 'Opening Balance - Owner Investment', 'acc-1001', 'acc-3000', 1000000),
('je2', '2026-03-05', 'Inventory Purchase - HDPE Pipes', 'acc-1200', 'acc-1001', 25000),
('je3', '2026-03-10', 'Solar Pump Installation Revenue - Kebede Farm', 'acc-1001', 'acc-4100', 30000),
('je4', '2026-03-14', 'Payroll Payment - February', 'acc-5100', 'acc-1001', 8000)
ON CONFLICT (id) DO NOTHING;
