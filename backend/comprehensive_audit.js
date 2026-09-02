const { PrismaClient } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient();

function getApi(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:4000/api/v1${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on("error", reject);
  });
}

async function runAudit() {
  console.log("===============================================================");
  console.log(" SOLARFLOW ERP & PEACHTREE INTEGRATION COMPREHENSIVE AUDIT ");
  console.log("===============================================================\n");

  const results = { passed: 0, failed: 0, warnings: 0, checks: [] };

  function record(category, testName, pass, details) {
    if (pass) {
      results.passed++;
      console.log(` [PASS] [${category}] ${testName}`);
    } else {
      results.failed++;
      console.log(`❌ [FAIL] [${category}] ${testName}: ${details}`);
    }
    results.checks.push({ category, testName, pass, details });
  }

  // -------------------------------------------------------------
  // 1. DATABASE AUDIT: Invoices Table
  // -------------------------------------------------------------
  console.log("--- 1. DATABASE INTEGRITY AUDIT ---");
  const invoiceCount = await prisma.invoice.count();
  record("Database", "Invoices record count >= 200", invoiceCount >= 200, `Found ${invoiceCount}`);

  const dirtyCusts = await prisma.invoice.count({
    where: {
      OR: [
        { customerName: { contains: "@" } },
        { customerName: { contains: "001" } },
        { customerName: { in: ["001", "002", "beg", "synced", "sys"] } }
      ]
    }
  });
  record("Database", "Zero dirty customer tokens (001@, @) in Invoices", dirtyCusts === 0, `Found ${dirtyCusts} dirty names`);

  const futureDates = await prisma.invoice.count({
    where: { date: { gte: new Date("2026-01-01") } }
  });
  record("Database", "Zero future 2026 dates on historical Invoices", futureDates === 0, `Found ${futureDates} future dates`);

  const totalInvoicedSum = await prisma.invoice.aggregate({
    _sum: { total: true }
  });
  const sumETB = Number(totalInvoicedSum._sum.total || 0);
  record("Database", "Total Invoiced sum matches commercial volume (19M - 20M ETB)", sumETB >= 19000000 && sumETB <= 20000000, `Sum: ${sumETB.toLocaleString()} ETB`);

  const statusCounts = await prisma.invoice.groupBy({
    by: ["status"],
    _count: { id: true },
    _sum: { total: true }
  });
  console.log("   Invoice Status Distribution:");
  statusCounts.forEach(s => {
    console.log(`     • ${s.status}: ${s._count.id} records, Total: ${Number(s._sum.total || 0).toLocaleString()} ETB`);
  });

  // -------------------------------------------------------------
  // 2. DATABASE AUDIT: Customers & Receivables
  // -------------------------------------------------------------
  const custCount = await prisma.customer.count();
  record("Database", "Customer master count >= 50", custCount >= 50, `Found ${custCount}`);

  const custBalSum = await prisma.customer.aggregate({ _sum: { balance: true } });
  const arTotal = Number(custBalSum._sum.balance || 0);
  record("Database", "Accounts Receivable balance >= 6,000,000 ETB", arTotal >= 6000000, `AR: ${arTotal.toLocaleString()} ETB`);

  // -------------------------------------------------------------
  // 3. DATABASE AUDIT: Accounts & Treasury
  // -------------------------------------------------------------
  const acctCount = await prisma.account.count();
  record("Database", "Chart of Accounts record count >= 25", acctCount >= 25, `Found ${acctCount}`);

  const bankAccts = await prisma.account.findMany({
    where: { id: { startsWith: "11-" } }
  });
  const totalBankBal = bankAccts.reduce((sum, a) => sum + Number(a.openingBalance || 0), 0);
  record("Database", "Cash & Bank accounts exist in Chart of Accounts", bankAccts.length >= 3 && totalBankBal > 0, `Accounts: ${bankAccts.length}, Total: ${totalBankBal.toLocaleString()} ETB`);

  // -------------------------------------------------------------
  // 4. BACKEND API ENDPOINTS AUDIT
  // -------------------------------------------------------------
  console.log("\n--- 2. BACKEND API ENDPOINTS AUDIT ---");
  try {
    const ptData = await getApi("/sync/peachtree/data");
    record("API", "GET /sync/peachtree/data returns 200 with structured payload", ptData.status === 200 && Array.isArray(ptData.body.invoices), `Status: ${ptData.status}`);
    record("API", "GET /sync/peachtree/data invoices count >= 200", ptData.body.invoices?.length >= 200, `Invoices: ${ptData.body.invoices?.length}`);

    const heartbeat = await getApi("/sync/peachtree/heartbeat");
    record("API", "GET /sync/peachtree/heartbeat returns 200", heartbeat.status === 200, `Status: ${heartbeat.status}`);
    record("API", "Heartbeat peachtreeRunning accurately reflects boolean", typeof heartbeat.body.peachtreeRunning === "boolean", `Value: ${heartbeat.body.peachtreeRunning}`);

    const vault = await getApi("/sync/peachtree/vault");
    record("API", "GET /sync/peachtree/vault returns 200 with vault status", vault.status === 200, `Status: ${vault.status}`);
  } catch (e) {
    record("API", "Backend API reachable", false, e.message);
  }

  console.log("\n===============================================================");
  console.log(` AUDIT SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log("===============================================================");

  await prisma.$disconnect();
}

runAudit().catch(e => {
  console.error("Audit crashed:", e);
  process.exit(1);
});
