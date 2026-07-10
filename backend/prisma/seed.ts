import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const roleDefinitions = [
  { name: "manager", label: "Manager" },
  { name: "finance", label: "Finance" },
  { name: "storekeeper", label: "Store Keeper" },
  { name: "fieldwork", label: "Field Work Controller" },
  { name: "attendance", label: "Attendance Officer" },
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
  const financeRole = roles.find((r) => r.name === "finance")!;
  const storekeeperRole = roles.find((r) => r.name === "storekeeper")!;
  const fieldworkRole = roles.find((r) => r.name === "fieldwork")!;

  const hierarchyUsers = [
    // Level 2 Managers
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
