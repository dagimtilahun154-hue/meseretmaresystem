const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'solarflow_db'
};

// Create MySQL Pool
const pool = mysql.createPool(dbConfig);

console.log('Connected to MySQL Pool.');

// --- API ROUTES ---

// 1. App Users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM app_users WHERE is_active = true');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM app_users WHERE username = ? AND password_hash = ? AND is_active = true',
      [username, password]
    );

    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Products / Inventory
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY name');
    res.json(rows.map(r => ({ 
      ...r, 
      costPrice: r.cost_price, 
      sellPrice: r.sell_price, 
      measurementUnit: r.measurement_unit 
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const p = req.body;
  const values = [
    p.id, p.code, p.name, p.category, p.quantity, 
    p.costPrice || p.cost_price, p.sellPrice || p.sell_price, 
    p.unit, p.measurementUnit || p.measurement_unit
  ];
  try {
    await pool.execute(
      `INSERT INTO products (id, code, name, category, quantity, cost_price, sell_price, unit, measurement_unit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       code=VALUES(code), name=VALUES(name), category=VALUES(category), 
       quantity=VALUES(quantity), cost_price=VALUES(cost_price), 
       sell_price=VALUES(sell_price), unit=VALUES(unit), 
       measurement_unit=VALUES(measurement_unit)`,
      values
    );
    res.status(201).json({ success: true, id: p.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Customers
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers ORDER BY name');
    res.json(rows.map(r => ({ ...r, creditLimit: r.credit_limit })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const c = req.body;
  const values = [c.id, c.name, c.phone, c.email, c.address, c.tin, c.creditLimit || c.credit_limit, c.balance];
  try {
    await pool.execute(
      `INSERT INTO customers (id, name, phone, email, address, tin, credit_limit, balance) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       name=VALUES(name), phone=VALUES(phone), email=VALUES(email), 
       address=VALUES(address), tin=VALUES(tin), 
       credit_limit=VALUES(credit_limit), balance=VALUES(balance)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM vendors ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  const v = req.body;
  const values = [v.id, v.name, v.phone, v.address, v.tin, v.balance];
  try {
    await pool.execute(
      `INSERT INTO vendors (id, name, phone, address, tin, balance) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       name=VALUES(name), phone=VALUES(phone), address=VALUES(address), 
       tin=VALUES(tin), balance=VALUES(balance)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const [invoices] = await pool.execute('SELECT * FROM invoices ORDER BY date DESC');
    const [items] = await pool.execute('SELECT * FROM invoice_items');
    
    const enrichedInvoices = invoices.map(inv => ({
      ...inv,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      dueDate: inv.due_date,
      totalVat: inv.total_vat,
      items: items.filter(item => item.invoice_id === inv.id).map(item => ({ 
        ...item, 
        unitPrice: item.unit_price 
      }))
    }));
    
    res.json(enrichedInvoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  const { items, ...i } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const invValues = [
      i.id, i.customerId || i.customer_id, i.customerName || i.customer_name, 
      i.date, i.dueDate || i.due_date, i.subtotal, i.totalVat || i.total_vat, 
      i.total, i.status
    ];

    await conn.execute(
      `INSERT INTO invoices (id, customer_id, customer_name, date, due_date, subtotal, total_vat, total, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       customer_id=VALUES(customer_id), customer_name=VALUES(customer_name), 
       date=VALUES(date), due_date=VALUES(due_date), subtotal=VALUES(subtotal), 
       total_vat=VALUES(total_vat), total=VALUES(total), status=VALUES(status)`,
      invValues
    );

    await conn.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [i.id]);

    if (items && items.length > 0) {
      const itemRows = items.map(item => [
        i.id, item.product, item.quantity, item.unitPrice || item.unit_price, 
        item.discount, item.tax, item.total
      ]);
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, product, quantity, unit_price, discount, tax, total) VALUES ?',
        [itemRows]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// 6. Payments
app.get('/api/payments', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM payments ORDER BY date DESC');
    res.json(rows.map(r => ({
      ...r,
      entityId: r.entity_id,
      entityName: r.entity_name,
      invoiceOrBillId: r.invoice_or_bill_id
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  const p = req.body;
  const values = [
    p.id, p.reference, p.entityId || p.entity_id, p.entityName || p.entity_name, 
    p.invoiceOrBillId || p.invoice_or_bill_id, p.amount, p.method, p.date, p.type
  ];
  try {
    await pool.execute(
      `INSERT INTO payments (id, reference, entity_id, entity_name, invoice_or_bill_id, amount, method, date, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       reference=VALUES(reference), entity_id=VALUES(entity_id), 
       entity_name=VALUES(entity_name), invoice_or_bill_id=VALUES(invoice_or_bill_id), 
       amount=VALUES(amount), method=VALUES(method), date=VALUES(date), type=VALUES(type)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 7. POS Sales
app.get('/api/sales', async (req, res) => {
  try {
    const [transactions] = await pool.execute('SELECT * FROM pos_transactions ORDER BY date DESC');
    const [items] = await pool.execute('SELECT * FROM pos_transaction_items');
    
    res.json(transactions.map(sale => ({
      ...sale,
      items: items.filter(item => item.transaction_id === sale.id)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const { items, ...s } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const saleValues = [s.id, s.date, s.customer_name, s.payment_method, s.subtotal, s.discount, s.tax, s.total, s.note, s.created_by];
    await conn.execute(
      `INSERT INTO pos_transactions (id, date, customer_name, payment_method, subtotal, discount, tax, total, note, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       date=VALUES(date), customer_name=VALUES(customer_name), payment_method=VALUES(payment_method), 
       subtotal=VALUES(subtotal), discount=VALUES(discount), tax=VALUES(tax), 
       total=VALUES(total), note=VALUES(note), created_by=VALUES(created_by)`,
      saleValues
    );

    if (items && items.length > 0) {
      const itemRows = items.map(item => [
        s.id, item.product_id, item.product_name, item.quantity, 
        item.unit_price, item.discount, item.total
      ]);
      await conn.query(
        'INSERT INTO pos_transaction_items (transaction_id, product_id, product_name, quantity, unit_price, discount, total) VALUES ?',
        [itemRows]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// 8. Field Work
app.get('/api/fieldwork', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM field_jobs ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/fieldwork', async (req, res) => {
  const f = req.body;
  const values = [f.id, f.title, f.description, f.customer_name, f.location, f.assigned_to, f.status, f.priority, f.scheduled_date, f.completed_date, f.cost, f.notes];
  try {
    await pool.execute(
      `INSERT INTO field_jobs (id, title, description, customer_name, location, assigned_to, status, priority, scheduled_date, completed_date, cost, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       title=VALUES(title), description=VALUES(description), customer_name=VALUES(customer_name), 
       location=VALUES(location), assigned_to=VALUES(assigned_to), status=VALUES(status), 
       priority=VALUES(priority), scheduled_date=VALUES(scheduled_date), 
       completed_date=VALUES(completed_date), cost=VALUES(cost), notes=VALUES(notes)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Accounts (Finance)
app.get('/api/accounts', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM accounts ORDER BY name');
    res.json(rows.map(r => ({ ...r, openingBalance: r.opening_balance })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  const a = req.body;
  const values = [a.id, a.name, a.type, a.description, a.openingBalance || a.opening_balance];
  try {
    await pool.execute(
      `INSERT INTO accounts (id, name, type, description, opening_balance) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       name=VALUES(name), type=VALUES(type), description=VALUES(description), 
       opening_balance=VALUES(opening_balance)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Bills
app.get('/api/bills', async (req, res) => {
  try {
    const [bills] = await pool.execute('SELECT * FROM bills ORDER BY date DESC');
    const [items] = await pool.execute('SELECT * FROM bill_items');
    res.json(bills.map(bill => ({
      ...bill,
      items: items.filter(item => item.bill_id === bill.id).map(item => ({ 
        ...item, 
        costPrice: item.cost_price 
      }))
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bills', async (req, res) => {
  const { items, ...b } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const billValues = [b.id, b.vendorId || b.vendor_id, b.vendorName || b.vendor_name, b.date, b.total, b.status];
    await conn.execute(
      `INSERT INTO bills (id, vendor_id, vendor_name, date, total, status) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       vendor_id=VALUES(vendor_id), vendor_name=VALUES(vendor_name), 
       date=VALUES(date), total=VALUES(total), status=VALUES(status)`,
      billValues
    );

    await conn.execute('DELETE FROM bill_items WHERE bill_id = ?', [b.id]);

    if (items && items.length > 0) {
      const itemRows = items.map(item => [
        b.id, item.product, item.quantity, item.costPrice || item.cost_price, item.total
      ]);
      await conn.query(
        'INSERT INTO bill_items (bill_id, product, quantity, cost_price, total) VALUES ?',
        [itemRows]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// 11. Expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const e = req.body;
  const values = [e.id, e.category, e.description, e.amount, e.date, e.method];
  try {
    await pool.execute(
      `INSERT INTO expenses (id, category, description, amount, date, method) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       category=VALUES(category), description=VALUES(description), 
       amount=VALUES(amount), date=VALUES(date), method=VALUES(method)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 12. Journal Entries
app.get('/api/journal', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM journal_entries ORDER BY date DESC');
    res.json(rows.map(r => ({
      ...r,
      debitAccount: r.debit_account,
      creditAccount: r.credit_account
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/journal', async (req, res) => {
  const j = req.body;
  const values = [j.id, j.date, j.description, j.debitAccount || j.debit_account, j.creditAccount || j.credit_account, j.amount];
  try {
    await pool.execute(
      `INSERT INTO journal_entries (id, date, description, debit_account, credit_account, amount) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       date=VALUES(date), description=VALUES(description), 
       debit_account=VALUES(debit_account), credit_account=VALUES(credit_account), 
       amount=VALUES(amount)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- HR & ATTENDANCE API ---

// 13. Departments
app.get('/api/hr/departments', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM hr_departments ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/departments', async (req, res) => {
  const d = req.body;
  try {
    await pool.execute(
      'INSERT INTO hr_departments (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)',
      [d.id, d.name, d.description]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 14. Workers
app.get('/api/hr/workers', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT w.*, d.name as departmentName 
      FROM hr_workers w 
      LEFT JOIN hr_departments d ON w.department_id = d.id 
      ORDER BY w.full_name
    `);
    res.json(rows.map(w => ({
      ...w,
      workerCode: w.worker_code,
      fullName: w.full_name,
      departmentId: w.department_id,
      photoUrl: w.photo_url,
      fingerprintId: w.fingerprint_id
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/workers', async (req, res) => {
  const w = req.body;
  const values = [w.id, w.workerCode || w.worker_code, w.fullName || w.full_name, w.phone, w.position, w.departmentId || w.department_id, w.photoUrl || w.photo_url, w.fingerprintId || w.fingerprint_id, w.status];
  try {
    await pool.execute(
      `INSERT INTO hr_workers (id, worker_code, full_name, phone, position, department_id, photo_url, fingerprint_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       worker_code=VALUES(worker_code), full_name=VALUES(full_name), phone=VALUES(phone), 
       position=VALUES(position), department_id=VALUES(department_id), photo_url=VALUES(photo_url), 
       fingerprint_id=VALUES(fingerprint_id), status=VALUES(status)`,
      values
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 15. Settings
app.get('/api/hr/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM hr_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/settings', async (req, res) => {
  const s = req.body;
  try {
    await pool.execute(
      'UPDATE hr_settings SET work_start_time = ?, work_end_time = ?, grace_period_minutes = ? WHERE id = ?',
      [s.work_start_time, s.work_end_time, s.grace_period_minutes, s.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 16. Attendance Scanning Logic
app.post('/api/hr/attendance/scan', async (req, res) => {
  const { fingerprintId } = req.body;
  
  try {
    // 1. Find worker
    const [workers] = await pool.execute('SELECT * FROM hr_workers WHERE fingerprint_id = ?', [fingerprintId]);
    const worker = workers[0];

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found or fingerprint not registered.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // 2. Fetch Settings
    const [settingsRows] = await pool.execute('SELECT * FROM hr_settings LIMIT 1');
    const settings = settingsRows[0];
    const workStart = settings?.work_start_time || '08:00:00';
    const workEnd = settings?.work_end_time || '17:00:00';
    const gracePeriod = settings?.grace_period_minutes || 0;

    // 3. Check for today's log
    const [logs] = await pool.execute('SELECT * FROM hr_attendance_logs WHERE worker_id = ? AND date = ?', [worker.id, today]);
    const existingLog = logs[0];

    if (!existingLog) {
      // CHECK-IN
      const [startH, startM] = workStart.split(':').map(Number);
      const scheduledStart = new Date(now);
      scheduledStart.setHours(startH, startM, 0, 0);
      
      let lateMinutes = 0;
      let status = 'Present';
      
      const diffMs = now - scheduledStart;
      if (diffMs > gracePeriod * 60 * 1000) {
        lateMinutes = Math.floor(diffMs / (1000 * 60));
        status = 'Late';
      }

      await pool.execute(
        'INSERT INTO hr_attendance_logs (worker_id, date, check_in_time, status, late_minutes) VALUES (?, ?, ?, ?, ?)',
        [worker.id, today, now, status, lateMinutes]
      );
      
      return res.json({ message: 'Check-in successful', type: 'check-in', worker });

    } else if (!existingLog.check_out_time) {
      // CHECK-OUT
      const checkInTime = new Date(existingLog.check_in_time);
      const [endH, endM] = workEnd.split(':').map(Number);
      const scheduledEnd = new Date(now);
      scheduledEnd.setHours(endH, endM, 0, 0);

      let earlyLeaveMinutes = 0;
      if (now < scheduledEnd) {
        earlyLeaveMinutes = Math.floor((scheduledEnd - now) / (1000 * 60));
      }

      const totalHours = Number(((now - checkInTime) / (1000 * 60 * 60)).toFixed(2));
      
      const finalStatus = existingLog.status === 'Late' ? 'Late' : (earlyLeaveMinutes > 0 ? 'Early Leave' : 'Present');

      await pool.execute(
        'UPDATE hr_attendance_logs SET check_out_time = ?, total_hours = ?, early_leave_minutes = ?, status = ? WHERE id = ?',
        [now, totalHours, earlyLeaveMinutes, finalStatus, existingLog.id]
      );

      return res.json({ message: 'Check-out successful', type: 'check-out', worker });

    } else {
      return res.status(400).json({ message: 'Attendance already completed for today.', worker });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 17. Reports
app.get('/api/hr/attendance/logs', async (req, res) => {
  const { startDate, endDate, workerId } = req.query;
  
  try {
    let query = 'SELECT l.*, w.full_name as workerName FROM hr_attendance_logs l JOIN hr_workers w ON l.worker_id = w.id WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND l.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND l.date <= ?';
      params.push(endDate);
    }
    if (workerId) {
      query += ' AND l.worker_id = ?';
      params.push(workerId);
    }

    query += ' ORDER BY l.date DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with MySQL Backend`);
});

