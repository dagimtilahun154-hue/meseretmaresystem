-- ==========================================
-- SOLARFLOW MANAGER - MYSQL SCHEMA
-- IMPORT THIS INTO PHPMYADMIN
-- ==========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS solarflow_db;
USE solarflow_db;

-- 1. App Users
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('manager', 'finance', 'storekeeper', 'fieldwork') DEFAULT 'manager',
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    reports_to_id VARCHAR(36) NULL,
    department VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reports_to_id) REFERENCES app_users(id) ON DELETE SET NULL
);

-- 2. Products / Inventory
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity DECIMAL(10, 2) DEFAULT 0,
    cost_price DECIMAL(15, 2) DEFAULT 0,
    sell_price DECIMAL(15, 2) DEFAULT 0,
    unit VARCHAR(20),
    measurement_unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. POS Transactions
CREATE TABLE IF NOT EXISTS pos_transactions (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    customer_name VARCHAR(255),
    payment_method VARCHAR(50),
    subtotal DECIMAL(15, 2) DEFAULT 0,
    discount DECIMAL(15, 2) DEFAULT 0,
    tax DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    note TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POS Transaction Items
CREATE TABLE IF NOT EXISTS pos_transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50),
    product_id VARCHAR(50),
    product_name VARCHAR(255),
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    discount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE
);

-- 4. Field Work Jobs
CREATE TABLE IF NOT EXISTS field_jobs (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    customer_name VARCHAR(255),
    location VARCHAR(255),
    assigned_to VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    scheduled_date DATE,
    completed_date DATE,
    cost DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- FINANCE HUB TABLES
-- ==========================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    tin VARCHAR(50),
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    tin VARCHAR(50),
    balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    description TEXT,
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15, 2) DEFAULT 0,
    total_vat DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id VARCHAR(50),
    product VARCHAR(255),
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    discount DECIMAL(15, 2) DEFAULT 0,
    tax DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Purchase Bills
CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(50) PRIMARY KEY,
    vendor_id VARCHAR(50),
    vendor_name VARCHAR(255),
    date DATE NOT NULL,
    total DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

-- Bill Items
CREATE TABLE IF NOT EXISTS bill_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id VARCHAR(50),
    product VARCHAR(255),
    quantity DECIMAL(10, 2) DEFAULT 1,
    cost_price DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    reference VARCHAR(100),
    entity_id VARCHAR(50),
    entity_name VARCHAR(255),
    invoice_or_bill_id VARCHAR(50),
    amount DECIMAL(15, 2) DEFAULT 0,
    method VARCHAR(50),
    date DATE,
    type VARCHAR(20), -- 'received' or 'made'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(15, 2) DEFAULT 0,
    date DATE,
    method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(50) PRIMARY KEY,
    date DATE,
    description TEXT,
    debit_account VARCHAR(100),
    credit_account VARCHAR(100),
    amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- HR & ATTENDANCE TABLES
-- ==========================================

-- 1. Departments
CREATE TABLE IF NOT EXISTS hr_departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workers
CREATE TABLE IF NOT EXISTS hr_workers (
    id VARCHAR(50) PRIMARY KEY,
    worker_code VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    position VARCHAR(100),
    department_id VARCHAR(50),
    photo_url TEXT,
    fingerprint_id VARCHAR(100) UNIQUE,
    status ENUM('Active', 'Inactive', 'On Leave') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES hr_departments(id) ON DELETE SET NULL
);

-- 3. Settings
CREATE TABLE IF NOT EXISTS hr_settings (
    id VARCHAR(50) PRIMARY KEY,
    work_start_time TIME DEFAULT '08:00:00',
    work_end_time TIME DEFAULT '17:00:00',
    grace_period_minutes INT DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Attendance Logs
CREATE TABLE IF NOT EXISTS hr_attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id VARCHAR(50),
    date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status VARCHAR(50), -- 'Present', 'Late', 'Early Leave', 'Absent'
    late_minutes INT DEFAULT 0,
    early_leave_minutes INT DEFAULT 0,
    total_hours DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES hr_workers(id) ON DELETE CASCADE
);

-- 5. Hierarchy Requests
CREATE TABLE IF NOT EXISTS hierarchy_requests (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NULL,
    type VARCHAR(50) NOT NULL, -- 'FIELD_TRIP', 'MARKETING', 'STOCK_REORDER', 'GENERAL'
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'FORWARDED', 'APPROVED', 'REJECTED'
    created_by_id VARCHAR(36) NOT NULL,
    assigned_to_id VARCHAR(36) NOT NULL,
    field_work_job_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES app_users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_id) REFERENCES app_users(id) ON DELETE CASCADE
);

-- 6. Request Audit Logs
CREATE TABLE IF NOT EXISTS request_audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'SUBMIT', 'APPROVE', 'REJECT', 'FORWARD', 'PAY'
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES hierarchy_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

-- Alter User for presence tracking
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen DATETIME NULL;

-- 7. End of Day (EOD) Reports
CREATE TABLE IF NOT EXISTS eod_reports (
    id VARCHAR(50) PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    department VARCHAR(50) NOT NULL,
    submitted_by_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    metrics JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by_id) REFERENCES app_users(id) ON DELETE CASCADE
);

-- Insert Default Settings
INSERT INTO hr_settings (id, work_start_time, work_end_time, grace_period_minutes)
VALUES ('default', '08:00:00', '17:00:00', 15)
ON DUPLICATE KEY UPDATE work_start_time=work_start_time;

-- Insert Default Admin
INSERT INTO app_users (id, username, password_hash, role, display_name) 
VALUES (UUID(), 'admin', 'admin', 'manager', 'System Administrator')
ON DUPLICATE KEY UPDATE username=username;
