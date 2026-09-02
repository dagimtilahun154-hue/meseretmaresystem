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
  { name: "ttl", label: "Technical Team Leader" },
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

  const adminRole = roles.find((role) => role.name === "admin") || managerRole;

  // Grant all permissions to Admin & Manager roles
  await Promise.all(
    permissions.flatMap((permission) => [
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      }),
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
    ]),
  );

  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

  // 1. Primary Administrator Account (Option A Setup)
  const adminUser = await prisma.user.upsert({
    where: { organizationId_username: { organizationId: organization.id, username: adminUsername } },
    update: {
      displayName: "System Administrator",
      status: "ACTIVE",
      department: "ADMIN",
    },
    create: {
      organizationId: organization.id,
      username: adminUsername,
      displayName: "System Administrator",
      passwordHash: await argon2.hash(adminPassword),
      department: "ADMIN",
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  await Promise.all(
    companies.map((company) =>
      prisma.userCompany.upsert({
        where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
        update: {},
        create: { userId: adminUser.id, companyId: company.id },
      }),
    ),
  );

  // Base Products Catalog
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

  console.log("Seed completed: organization, MM/FZ companies, system roles, permissions, base product catalog, and primary Administrator account.");
}
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
