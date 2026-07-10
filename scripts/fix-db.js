// Database fix script - adds missing columns to payments table
const SUPABASE_URL = 'https://ibkceiovgdviibswfosl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlia2NlaW92Z2R2aWlic3dmb3NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjAwOTY3NCwiZXhwIjoyMDkxNTg1Njc0fQ.ueWetvNnPfhYrpxl6KgIwX9sLFGG7cAlxTHupLI1rcU';

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql })
  });
  return res.json();
}

async function checkColumns() {
  // Try inserting a test record to see what columns exist
  const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&limit=0`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'return=representation',
    }
  });
  const headers = {};
  res.headers.forEach((v, k) => headers[k] = v);
  console.log('Response status:', res.status);
  
  // Check schema via PostgREST openapi
  const schema = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    }
  });
  const schemaJson = await schema.json();
  const paymentsSchema = schemaJson?.definitions?.payments;
  if (paymentsSchema) {
    console.log('\n=== PAYMENTS TABLE COLUMNS ===');
    Object.keys(paymentsSchema.properties || {}).forEach(col => {
      console.log(' -', col, ':', paymentsSchema.properties[col].type || paymentsSchema.properties[col].format);
    });
  } else {
    console.log('Could not fetch schema definition');
    console.log('Available definitions:', Object.keys(schemaJson?.definitions || {}).slice(0, 20));
  }
}

async function fixSchema() {
  console.log('Checking and fixing payments table schema...\n');
  
  // Test insert to see current columns
  const testInsert = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      id: 'TEST-SCHEMA-CHECK',
      reference: 'TEST',
      entity_id: 'test',
      entity_name: 'Test',
      invoice_or_bill_id: 'test',
      amount: 0,
      method: 'Cash',
      bank_name: 'Test Bank',
      note: 'schema test',
      date: '2026-01-01',
      type: 'received'
    })
  });
  
  const insertResult = await testInsert.json();
  console.log('Test insert result:', JSON.stringify(insertResult, null, 2));
  
  if (insertResult.code === '42703') {
    console.log('\n❌ COLUMN MISSING! Need to add columns via Supabase SQL Editor');
    console.log('Run this SQL in Supabase Dashboard → SQL Editor:');
    console.log(`
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;
    `);
  } else if (Array.isArray(insertResult) && insertResult[0]) {
    console.log('\n✅ bank_name column EXISTS and works!');
    console.log('Columns in inserted record:', Object.keys(insertResult[0]));
    // Clean up test record
    await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.TEST-SCHEMA-CHECK`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      }
    });
    console.log('Test record cleaned up.');
  } else {
    console.log('\nUnexpected result - checking raw error...');
    const msg = insertResult.message || insertResult.error || JSON.stringify(insertResult);
    console.log('Message:', msg);
    
    if (msg.includes('bank_name') || msg.includes('column')) {
      console.log('\n❌ COLUMN MISSING! Run this SQL in Supabase SQL Editor:');
      console.log('ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;');
      console.log('ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;');
    }
  }
}

async function checkPOSTransactions() {
  console.log('\n=== Checking pos_transactions table ===');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pos_transactions?select=*&limit=5&order=date.desc`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    }
  });
  const data = await res.json();
  console.log('Recent POS transactions:', JSON.stringify(data, null, 2));
}

async function main() {
  await checkColumns();
  await fixSchema();
  await checkPOSTransactions();
}

main().catch(console.error);
