// Fix database schema - add missing columns
const PROJECT_REF = 'ibkceiovgdviibswfosl';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlia2NlaW92Z2R2aWlic3dmb3NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjAwOTY3NCwiZXhwIjoyMDkxNTg1Njc0fQ.ueWetvNnPfhYrpxl6KgIwX9sLFGG7cAlxTHupLI1rcU';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Use PostgREST SQL execution via the pg endpoint
async function runMigration() {
  console.log('Running database migration...\n');

  // Supabase allows running arbitrary SQL via the SQL API endpoint for service role
  const migrationSQL = `
    -- Add bank_name column to payments table
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
    
    -- Add note column to payments table  
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;
    
    -- Add bank_name column to pos_transactions table
    ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS bank_name TEXT;
  `;

  // Use the Supabase Management API to run SQL
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: migrationSQL })
  });
  
  const result = await res.json();
  console.log('Migration API result:', JSON.stringify(result, null, 2));

  // Alternative: use pg directly via supabase admin
  if (!res.ok || result.error) {
    console.log('\nTrying alternative approach via supabase rpc...');
    
    // Try to call an RPC function if available
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: migrationSQL })
    });
    const rpcResult = await rpcRes.json();
    console.log('RPC result:', JSON.stringify(rpcResult, null, 2));
  }
}

async function verifyFix() {
  console.log('\nVerifying fix...');
  
  // Test payments table
  const testP = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&limit=0`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    }
  });
  console.log('Payments table status:', testP.status);
  
  // Test insert with bank_name
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      id: 'TEST-VERIFY-001',
      reference: 'TEST',
      entity_id: 'test-id',
      entity_name: 'Test Customer',
      invoice_or_bill_id: 'TEST',
      amount: 500000,
      method: 'Bank Transfer',
      bank_name: 'Dashen Bank',
      note: 'POS Sale test',
      date: '2026-05-03',
      type: 'received'
    })
  });
  
  const insertResult = await insertRes.json();
  
  if (Array.isArray(insertResult) && insertResult[0]?.bank_name) {
    console.log('\n✅ SUCCESS! bank_name column now works!');
    console.log('Test record:', JSON.stringify(insertResult[0], null, 2));
    
    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.TEST-VERIFY-001`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      }
    });
    console.log('Test record cleaned up.');
  } else {
    console.log('\n❌ Still failing:', JSON.stringify(insertResult, null, 2));
    console.log('\nYou must run this SQL manually in Supabase Dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql');
    console.log('2. Run this SQL:');
    console.log('   ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name TEXT;');
    console.log('   ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;');
    console.log('   ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS bank_name TEXT;');
  }
}

async function main() {
  await runMigration();
  await new Promise(r => setTimeout(r, 2000));
  await verifyFix();
}

main().catch(console.error);
