import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const roleDefinitions = [
  { name: "admin", label: "Administrator" },
  { name: "manager", label: "Manager" },
  { name: "finance", label: "Finance" },
  { name: "storekeeper", label: "Store Keeper" },
  { name: "fieldwork", label: "Field Work Controller" },
  { name: "attendance", label: "Attendance Officer" },
  { name: "hr", label: "HR Manager" },
];

const permissionKeys = [
  "dashboard:read",
  "users:manage",
  "companies:read",
  "inventory:read",
  "inventory:write",
  "pos:read",
  "pos:write",
  "finance:read",
  "finance:write",
  "fieldwork:read",
  "fieldwork:write",
  "attendance:read",
  "attendance:write",
];

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "meseret-mare-solar" },
    update: { name: "Meseret Mare Solar" },
    create: { name: "Meseret Mare Solar", slug: "meseret-mare-solar" },
  });

  const companies = await Promise.all([
    prisma.company.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "MM" } },
      update: { name: "Meseret Mare" },
      create: { organizationId: organization.id, code: "MM", name: "Meseret Mare" },
    }),
    prisma.company.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "FZ" } },
      update: { name: "Fasil Zelalem" },
      create: { organizationId: organization.id, code: "FZ", name: "Fasil Zelalem" },
    }),
  ]);

  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key.replace(":", " ") },
      }),
    ),
  );

  const roles = await Promise.all(
    roleDefinitions.map((role) =>
      prisma.role.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: role.name } },
        update: { label: role.label },
        create: { organizationId: organization.id, ...role },
      }),
    ),
  );

  const managerRole = roles.find((role) => role.name === "manager");
  if (!managerRole) throw new Error("Manager role was not seeded");

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  const username = process.env.DEFAULT_MANAGER_USERNAME || "manager";
  const password = process.env.DEFAULT_MANAGER_PASSWORD || "123";

  // 1. General Manager
  const managerUser = await prisma.user.upsert({
    where: { organizationId_username: { organizationId: organization.id, username } },
    update: {
      displayName: "General Manager",
      status: "ACTIVE",
      department: "GENERAL_MANAGEMENT",
    },
    create: {
      organizationId: organization.id,
      username,
      displayName: "General Manager",
      passwordHash: await argon2.hash(password),
      department: "GENERAL_MANAGEMENT",
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
    update: {},
    create: { userId: managerUser.id, roleId: managerRole.id },
  });

  await Promise.all(
    companies.map((company) =>
      prisma.userCompany.upsert({
        where: { userId_companyId: { userId: managerUser.id, companyId: company.id } },
        update: {},
        create: { userId: managerUser.id, companyId: company.id },
      }),
    ),
  );

  // Retrieve Role mappings to use for other users
  const adminRole = roles.find((r) => r.name === "admin")!;
  const financeRole = roles.find((r) => r.name === "finance")!;
  const storekeeperRole = roles.find((r) => r.name === "storekeeper")!;
  const fieldworkRole = roles.find((r) => r.name === "fieldwork")!;
  const hrRole = roles.find((r) => r.name === "hr") || managerRole;

  const hierarchyUsers = [
    // Level 2 Managers & System Roles
    { username: "finance", displayName: "Finance Officer", roleName: "finance", roleId: financeRole.id, department: "FINANCE", reportsToId: managerUser.id },
    { username: "store", displayName: "Store Keeper", roleName: "storekeeper", roleId: storekeeperRole.id, department: "INVENTORY", reportsToId: managerUser.id },
    { username: "field", displayName: "Field Work Controller", roleName: "fieldwork", roleId: fieldworkRole.id, department: "TECHNICAL", reportsToId: managerUser.id },
    { username: "ttl", displayName: "Technical Team Lead", roleName: "fieldwork", roleId: fieldworkRole.id, department: "TECHNICAL", reportsToId: managerUser.id },
    { username: "hr", displayName: "HR Officer", roleName: "hr", roleId: hrRole.id, department: "HR", reportsToId: managerUser.id },
    { username: "admin", displayName: "Administrator", roleName: "admin", roleId: adminRole.id, department: "ADMIN", reportsToId: managerUser.id },
    { username: "tech_manager", displayName: "Technical Manager", roleName: "fieldwork", roleId: fieldworkRole.id, department: "TECHNICAL", reportsToId: managerUser.id },
    { username: "marketing_manager", displayName: "Marketing & Grant Manager", roleName: "manager", roleId: managerRole.id, department: "MARKETING", reportsToId: managerUser.id },
    { username: "social_manager", displayName: "Social Media Manager", roleName: "manager", roleId: managerRole.id, department: "MARKETING", reportsToId: managerUser.id },
    { username: "stock_manager", displayName: "Stock Manager", roleName: "storekeeper", roleId: storekeeperRole.id, department: "INVENTORY", reportsToId: managerUser.id },
    { username: "finance_admin", displayName: "Finance Admin", roleName: "finance", roleId: financeRole.id, department: "FINANCE", reportsToId: managerUser.id },
  ];


  const seededLevel2Users: Record<string, string> = {};

  for (const hu of hierarchyUsers) {
    const user = await prisma.user.upsert({
      where: { organizationId_username: { organizationId: organization.id, username: hu.username } },
      update: {
        displayName: hu.displayName,
        reportsToId: hu.reportsToId,
        department: hu.department,
        status: "ACTIVE",
      },
      create: {
        organizationId: organization.id,
        username: hu.username,
        displayName: hu.displayName,
        passwordHash: await argon2.hash("123"),
        reportsToId: hu.reportsToId,
        department: hu.department,
      },
    });

    seededLevel2Users[hu.username] = user.id;

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: hu.roleId } },
      update: {},
      create: { userId: user.id, roleId: hu.roleId },
    });

    await Promise.all(
      companies.map((company) =>
        prisma.userCompany.upsert({
          where: { userId_companyId: { userId: user.id, companyId: company.id } },
          update: {},
          create: { userId: user.id, companyId: company.id },
        }),
      ),
    );
  }

  // Level 3 Staff
  const level3Users = [
    { username: "tech_leader", displayName: "Technical Team Leader", roleId: fieldworkRole.id, department: "TECHNICAL", reportsToId: seededLevel2Users["tech_manager"] },
    { username: "accountant", displayName: "Accountant", roleId: financeRole.id, department: "FINANCE", reportsToId: seededLevel2Users["finance_admin"] },
    { username: "cashier", displayName: "Cashier", roleId: financeRole.id, department: "FINANCE", reportsToId: seededLevel2Users["finance_admin"] },
  ];

  for (const l3 of level3Users) {
    const user = await prisma.user.upsert({
      where: { organizationId_username: { organizationId: organization.id, username: l3.username } },
      update: {
        displayName: l3.displayName,
        reportsToId: l3.reportsToId,
        department: l3.department,
        status: "ACTIVE",
      },
      create: {
        organizationId: organization.id,
        username: l3.username,
        displayName: l3.displayName,
        passwordHash: await argon2.hash("123"),
        reportsToId: l3.reportsToId,
        department: l3.department,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: l3.roleId } },
      update: {},
      create: { userId: user.id, roleId: l3.roleId },
    });

    await Promise.all(
      companies.map((company) =>
        prisma.userCompany.upsert({
          where: { userId_companyId: { userId: user.id, companyId: company.id } },
          update: {},
          create: { userId: user.id, companyId: company.id },
        }),
      ),
    );
  }

  // Seed products for POS checkout / testing
  const testProducts = [
    { id: "PUMP-GONDAR-01", code: "PUMP-G01", name: "Solar Pump 5.5kW", category: "Pumps", quantity: 50, costPrice: 80000, sellPrice: 120000, unit: "pcs" },
    { id: "PANEL-350W", code: "PANEL-350", name: "350W Solar Panels", category: "Panels", quantity: 100, costPrice: 4000, sellPrice: 6000, unit: "pcs" },
    { id: "ACC-CABLE", code: "ACC-C01", name: "Mounting Structure & Cables", category: "Accessories", quantity: 50, costPrice: 20000, sellPrice: 29000, unit: "pcs" }
  ];

  for (const prod of testProducts) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {
        code: prod.code,
        name: prod.name,
        category: prod.category,
        quantity: prod.quantity,
        costPrice: prod.costPrice,
        sellPrice: prod.sellPrice,
        unit: prod.unit,
      },
      create: {
        id: prod.id,
        code: prod.code,
        name: prod.name,
        category: prod.category,
        quantity: prod.quantity,
        costPrice: prod.costPrice,
        sellPrice: prod.sellPrice,
        unit: prod.unit,
      }
    });
  }

  console.log("Seed completed: organization, MM/FZ companies, roles, permissions, corporate hierarchy users.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
