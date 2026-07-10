const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'solarflow_db'
};

const users = [
  { id: "1", username: "manager", password_hash: "123", role: "manager", display_name: "Manager" },
  { id: "2", username: "finance", password_hash: "123", role: "finance", display_name: "Finance Officer" },
  { id: "3", username: "store", password_hash: "123", role: "storekeeper", display_name: "Store Keeper" },
  { id: "4", username: "field", password_hash: "123", role: "fieldwork", display_name: "Field Work Controller" },
];

const products = [
  { id: "1", name: "PUMP CONTROLLER 5500W DC 300V-780V", category: "Pump Equipment", quantity: 20, cost_price: 450, sell_price: 650, unit: "Piece", measurement_unit: "Piece" },
  { id: "2", name: "PUMP CONTROLLER 1500W DC 80V-420V", category: "Pump Equipment", quantity: 70, cost_price: 280, sell_price: 420, unit: "Piece", measurement_unit: "Piece" },
  { id: "3", name: "PUMP CONTROLLER 7500W DC 300V-780V", category: "Pump Equipment", quantity: 30, cost_price: 520, sell_price: 780, unit: "Piece", measurement_unit: "Piece" },
  { id: "4", name: "SOLAR PANEL 330W", category: "Solar Panels", quantity: 15, cost_price: 120, sell_price: 185, unit: "Piece", measurement_unit: "Piece" },
  { id: "5", name: "SOLAR PANEL ROD", category: "Solar Panels", quantity: 35, cost_price: 35, sell_price: 55, unit: "Pack", measurement_unit: "Pack" },
  { id: "6", name: "HDPE ELBOW 4 INCH", category: "HDPE Fittings", quantity: 17, cost_price: 8, sell_price: 14, unit: "Piece", measurement_unit: "Piece" },
  { id: "7", name: "HDPE ELBOW 3 INCH", category: "HDPE Fittings", quantity: 50, cost_price: 6, sell_price: 11, unit: "Piece", measurement_unit: "Piece" },
  { id: "8", name: "HDPE ELBOW 2 INCH", category: "HDPE Fittings", quantity: 11, cost_price: 4, sell_price: 7, unit: "Piece", measurement_unit: "Piece" },
  { id: "9", name: "HDPE MALE ADAPTOR 3 INCH", category: "HDPE Fittings", quantity: 33, cost_price: 7, sell_price: 12, unit: "Piece", measurement_unit: "Piece" },
  { id: "10", name: "HDPE MALE ADAPTOR 2 INCH", category: "HDPE Fittings", quantity: 55, cost_price: 5, sell_price: 9, unit: "Piece", measurement_unit: "Piece" },
  { id: "11", name: "HDPE FEMALE ADAPTOR 3 INCH", category: "HDPE Fittings", quantity: 21, cost_price: 7, sell_price: 12, unit: "Piece", measurement_unit: "Piece" },
  { id: "12", name: "HDPE SOCKET 2 INCH", category: "HDPE Fittings", quantity: 17, cost_price: 3, sell_price: 6, unit: "Piece", measurement_unit: "Piece" },
  { id: "13", name: "HDPE TEE ½ INCH", category: "HDPE Fittings", quantity: 31, cost_price: 4, sell_price: 7, unit: "Piece", measurement_unit: "Piece" },
  { id: "14", name: "GS UNION 4 INCH", category: "GS Fittings", quantity: 25, cost_price: 12, sell_price: 20, unit: "Piece", measurement_unit: "Piece" },
  { id: "15", name: "GS UNION 2½ INCH", category: "GS Fittings", quantity: 19, cost_price: 8, sell_price: 14, unit: "Piece", measurement_unit: "Piece" },
  { id: "16", name: "GS SOCKET 4 INCH", category: "GS Fittings", quantity: 42, cost_price: 10, sell_price: 16, unit: "Piece", measurement_unit: "Piece" },
  { id: "17", name: "GS SOCKET 3 INCH", category: "GS Fittings", quantity: 22, cost_price: 8, sell_price: 13, unit: "Piece", measurement_unit: "Piece" },
  { id: "18", name: "GS NIPPLES 4 INCH", category: "GS Fittings", quantity: 46, cost_price: 5, sell_price: 9, unit: "Piece", measurement_unit: "Piece" },
  { id: "19", name: "GS NIPPLES 3 INCH", category: "GS Fittings", quantity: 28, cost_price: 4, sell_price: 7, unit: "Piece", measurement_unit: "Piece" },
  { id: "20", name: "GS BALL VALVE 4 INCH", category: "GS Fittings", quantity: 12, cost_price: 18, sell_price: 28, unit: "Piece", measurement_unit: "Piece" },
  { id: "21", name: "GS GATE VALVE 3 INCH", category: "GS Fittings", quantity: 10, cost_price: 15, sell_price: 24, unit: "Piece", measurement_unit: "Piece" },
  { id: "22", name: "IRON FOOT VALVE 3 INCH", category: "Foot Valves", quantity: 44, cost_price: 12, sell_price: 20, unit: "Piece", measurement_unit: "Piece" },
  { id: "23", name: "IRON FOOT VALVE 2 INCH", category: "Foot Valves", quantity: 29, cost_price: 8, sell_price: 14, unit: "Piece", measurement_unit: "Piece" },
  { id: "24", name: "PLASTIC FOOT VALVE 3 INCH", category: "Foot Valves", quantity: 15, cost_price: 6, sell_price: 10, unit: "Piece", measurement_unit: "Piece" },
  { id: "25", name: "PLASTIC FOOT VALVE 2 INCH", category: "Foot Valves", quantity: 38, cost_price: 4, sell_price: 7, unit: "Piece", measurement_unit: "Piece" },
  { id: "26", name: "HDPE FOOT VALVE 1 INCH", category: "Foot Valves", quantity: 45, cost_price: 3, sell_price: 6, unit: "Piece", measurement_unit: "Piece" },
  { id: "27", name: "IRON FLOAT SWITCH", category: "Accessories", quantity: 10, cost_price: 15, sell_price: 25, unit: "Piece", measurement_unit: "Piece" },
  { id: "28", name: "PLASTIC FLOAT SWITCH", category: "Accessories", quantity: 26, cost_price: 8, sell_price: 14, unit: "Piece", measurement_unit: "Piece" },
  { id: "29", name: "FASHETA 4 INCH", category: "Accessories", quantity: 39, cost_price: 2, sell_price: 4, unit: "Piece", measurement_unit: "Piece" },
  { id: "30", name: "FLEXIBLE HOSE 4 INCH", category: "Pipes", quantity: 21, cost_price: 25, sell_price: 40, unit: "Piece", measurement_unit: "Meter (m)" },
  { id: "31", name: "FLEXIBLE HOSE 2 INCH", category: "Pipes", quantity: 31, cost_price: 18, sell_price: 28, unit: "Piece", measurement_unit: "Meter (m)" },
  { id: "32", name: "HDPE PIPE 1.5 INCH (10m)", category: "Pipes", quantity: 41, cost_price: 22, sell_price: 35, unit: "Piece", measurement_unit: "Meter (m)" },
];

const fieldJobs = [
  { id: "FW001", title: "Pump Installation Hawassa", customer_name: "Ahmed Hassan", location: "Hawassa", status: "completed", priority: "medium", scheduled_date: "2026-03-05", completed_date: "2026-03-07", cost: 3000, notes: "Installation completed successfully." },
  { id: "FW002", title: "Maintenance Service Dire Dawa", customer_name: "Solomon Bekele", location: "Dire Dawa", status: "in-progress", priority: "high", scheduled_date: "2026-03-08", completed_date: null, cost: 5000, notes: "Installation starts tomorrow." },
];

async function seed() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL for seeding...');

  try {
    // 1. Seed Users
    console.log('Seeding users...');
    for (const user of users) {
      await connection.execute(
        'INSERT INTO app_users (id, username, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=username',
        [user.id, user.username, user.password_hash, user.role, user.display_name]
      );
    }

    // 2. Seed Products
    console.log('Seeding products...');
    for (const prod of products) {
      await connection.execute(
        'INSERT INTO products (id, name, category, quantity, cost_price, sell_price, unit, measurement_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        [prod.id, prod.name, prod.category, prod.quantity, prod.cost_price, prod.sell_price, prod.unit, prod.measurement_unit]
      );
    }

    // 3. Seed Field Jobs
    console.log('Seeding field jobs...');
    for (const job of fieldJobs) {
      await connection.execute(
        'INSERT INTO field_jobs (id, title, customer_name, location, status, priority, scheduled_date, completed_date, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title)',
        [
          job.id, 
          job.title, 
          job.customer_name || null, 
          job.location || null, 
          job.status || 'pending', 
          job.priority || 'medium', 
          job.scheduled_date || null, 
          job.completed_date || null, 
          job.cost || 0, 
          job.notes || null
        ]
      );
    }

    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await connection.end();
  }
}

seed();
