import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding supplemental data...");

  // 1. Products
  const pump1 = await prisma.pumpProduct.upsert({
    where: { id: "PUMP-001" },
    update: {},
    create: {
      id: "PUMP-001",
      model: "SolarPro 500",
      brand: "MeseretMare",
      status: "Published",
      firstCategory: "Submersible",
      secondCategory: "High Head",
      power: "500W",
      voltage: "24V",
      description: "High efficiency submersible solar pump.",
    },
  });

  const product1 = await prisma.product.upsert({
    where: { id: "PROD-001" },
    update: {},
    create: {
      id: "PROD-001",
      code: "SP-500",
      name: "SolarPro 500",
      category: "Pumps",
      quantity: 50,
      costPrice: 300.00,
      sellPrice: 450.00,
      unit: "pcs",
    },
  });

  // 2. Customers & Vendors
  const customer1 = await prisma.customer.upsert({
    where: { id: "CUST-001" },
    update: {},
    create: {
      id: "CUST-001",
      name: "Abebe Kebede",
      phone: "+251911234567",
      email: "abebe@example.com",
      address: "Addis Ababa, Ethiopia",
    },
  });

  const vendor1 = await prisma.vendor.upsert({
    where: { id: "VEND-001" },
    update: {},
    create: {
      id: "VEND-001",
      name: "SolarTech Suppliers",
      phone: "+8613912345678",
      email: "sales@solartech.cn",
    },
  });

  // 3. POS Sale
  await prisma.posSale.upsert({
    where: { id: "SALE-001" },
    update: {},
    create: {
      id: "SALE-001",
      date: new Date(),
      customerName: "Abebe Kebede",
      paymentMethod: "Cash",
      subtotal: 450.00,
      discount: 0,
      tax: 67.50,
      total: 517.50,
      items: [
        {
          product_id: "PROD-001",
          product_name: "SolarPro 500",
          quantity: 1,
          unit_price: 450.00,
          total: 450.00,
        }
      ]
    },
  });

  // 4. Field Work Job
  await prisma.fieldWorkJob.upsert({
    where: { id: "JOB-001" },
    update: {},
    create: {
      id: "JOB-001",
      title: "Install SolarPro 500 at Farm",
      customerName: "Abebe Kebede",
      location: "Bishoftu",
      assignedTo: "Technician 1",
      status: "pending",
      priority: "high",
      scheduledDate: new Date(),
      cost: 100.00,
    },
  });

  // 5. HR Worker & Department
  const dept1 = await prisma.hrDepartment.upsert({
    where: { id: "DEPT-001" },
    update: {},
    create: {
      id: "DEPT-001",
      name: "Field Operations",
      description: "Technicians and installers",
    },
  });

  await prisma.hrWorker.upsert({
    where: { id: "WORKER-001" },
    update: {},
    create: {
      id: "WORKER-001",
      workerCode: "W001",
      fullName: "Dawit Alemu",
      position: "Senior Installer",
      departmentId: "DEPT-001",
      departmentName: "Field Operations",
      status: "Active",
    },
  });

  // 6. Finance Accounts & Entries
  const cashAccount = await prisma.account.upsert({
    where: { id: "ACC-CASH" },
    update: {},
    create: {
      id: "ACC-CASH",
      name: "Cash on Hand",
      type: "Asset",
      openingBalance: 10000.00,
    },
  });

  await prisma.financeJournalEntry.upsert({
    where: { id: "JRNL-001" },
    update: {},
    create: {
      id: "JRNL-001",
      date: new Date(),
      description: "Initial Capital",
      debitAccount: "Cash on Hand",
      creditAccount: "Owner Equity",
      amount: 10000.00,
    },
  });

  console.log("Supplemental data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
