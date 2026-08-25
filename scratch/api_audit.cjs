const http = require('http');

async function login(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function request(path, method = 'GET', token = null, postData = null, companyId = 'MM') {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (companyId) headers['x-company-id'] = companyId;
    let data = null;
    if (postData) {
      data = typeof postData === 'string' ? postData : JSON.stringify(postData);
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1${path}`,
      method,
      headers
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function runAudit() {
  console.log('--- Testing Auth for all known roles ---');
  const roles = [
    { u: 'admin', p: '123' },
    { u: 'manager', p: '123' },
    { u: 'finance', p: '123' },
    { u: 'store', p: '123' },
    { u: 'field', p: '123' },
    { u: 'ttl', p: '123' },
    { u: 'hr', p: '123' },
    { u: 'accountant', p: '123' },
    { u: 'cashier', p: '123' },
    { u: 'tech_manager', p: '123' },
    { u: 'tech_leader', p: '123' },
    { u: 'invalid_user', p: 'badpass' }
  ];

  let managerToken = null;
  let adminToken = null;
  let storeToken = null;
  let financeToken = null;
  let fieldToken = null;

  for (const r of roles) {
    const res = await login(r.u, r.p);
    console.log(`Login [${r.u}]: status=${res.status}`, res.body?.user ? `OK (roles: ${res.body.user.roles?.map(x=>x.name||x).join(',')})` : res.body?.message || res.raw);
    if (r.u === 'manager' && res.body?.accessToken) managerToken = res.body.accessToken;
    if (r.u === 'admin' && res.body?.accessToken) adminToken = res.body.accessToken;
    if (r.u === 'store' && res.body?.accessToken) storeToken = res.body.accessToken;
    if (r.u === 'finance' && res.body?.accessToken) financeToken = res.body.accessToken;
    if (r.u === 'field' && res.body?.accessToken) fieldToken = res.body.accessToken;
  }

  console.log('\n--- Testing Endpoints with Manager / Admin Token ---');
  const endpoints = [
    { p: '/health', m: 'GET', auth: false },
    { p: '/users', m: 'GET', token: adminToken },
    { p: '/users/me', m: 'GET', token: managerToken },
    { p: '/users/organization/hierarchy', m: 'GET', token: managerToken },
    { p: '/companies', m: 'GET', token: managerToken },
    { p: '/companies/active', m: 'GET', token: managerToken },
    { p: '/data/products', m: 'GET', token: managerToken },
    { p: '/data/pos-sales', m: 'GET', token: managerToken },
    { p: '/data/customers', m: 'GET', token: managerToken },
    { p: '/data/field-work-jobs', m: 'GET', token: managerToken },
    { p: '/data/finance/invoices', m: 'GET', token: financeToken },
    { p: '/data/finance/bills', m: 'GET', token: financeToken },
    { p: '/data/finance/payments', m: 'GET', token: financeToken },
    { p: '/data/finance/accounts', m: 'GET', token: financeToken },
    { p: '/data/finance/journal-entries', m: 'GET', token: financeToken },
    { p: '/data/hr/workers', m: 'GET', token: managerToken },
    { p: '/data/hr/attendance', m: 'GET', token: managerToken },
    { p: '/data/hr/settings', m: 'GET', token: managerToken },
    { p: '/data/peachtree/records', m: 'GET', token: financeToken },
    { p: '/data/audit-logs', m: 'GET', token: adminToken },
    { p: '/data/analytics/sales-trend', m: 'GET', token: managerToken },
    { p: '/data/analytics/cash-flow', m: 'GET', token: financeToken },
    { p: '/data/analytics/inventory-summary', m: 'GET', token: storeToken },
    { p: '/sizing/products', m: 'GET', token: managerToken },
    { p: '/sizing/categories', m: 'GET', token: managerToken },
    { p: '/sizing/calculate', m: 'POST', token: managerToken, data: { flowRate: 10, totalHead: 50, pumpType: 'solar' } },
    { p: '/assets/company', m: 'GET', token: managerToken },
    { p: '/assets/field-work', m: 'GET', token: managerToken },
    { p: '/inventory/releases', m: 'GET', token: storeToken },
    { p: '/inventory/transactions', m: 'GET', token: storeToken },
    { p: '/inventory/audits', m: 'GET', token: storeToken },
    { p: '/tasks', m: 'GET', token: managerToken },
    { p: '/chat/channels', m: 'GET', token: managerToken },
    { p: '/notifications', m: 'GET', token: managerToken },
    { p: '/sync/status', m: 'GET', token: managerToken },
  ];

  for (const ep of endpoints) {
    const res = await request(ep.p, ep.m, ep.token || (ep.auth === false ? null : managerToken), ep.data);
    const isSuccess = res.status >= 200 && res.status < 300;
    console.log(`${isSuccess ? '✅' : '❌'} [${ep.m}] ${ep.p} -> ${res.status}`, isSuccess ? (Array.isArray(res.data) ? `Array(${res.data.length})` : typeof res.data === 'object' ? Object.keys(res.data) : res.data) : res.data);
  }
}

runAudit().catch(console.error);
