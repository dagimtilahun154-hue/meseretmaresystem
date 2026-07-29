import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: {
        roles: { include: { role: true } },
        companies: { include: { company: true } },
      },
      orderBy: { displayName: "asc" },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.roles[0]?.role.name || "storekeeper",
      roles: user.roles.map((entry) => entry.role.name),
      reportsToId: user.reportsToId,
      department: user.department,
      status: user.status,
      companies: user.companies.map((entry) => ({
        id: entry.company.id,
        code: entry.company.code,
        name: entry.company.name,
      })),
    }));
  }

  async create(dto: any, organizationId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, username: dto.username },
    });
    if (existing) {
      throw new ConflictException("Username is already taken.");
    }

    let role = await this.prisma.role.findFirst({
      where: { organizationId, name: dto.role },
    });
    if (!role) {
      role = await this.prisma.role.create({
        data: {
          organizationId,
          name: dto.role,
          label: dto.role.charAt(0).toUpperCase() + dto.role.slice(1),
        },
      });
    }

    const passwordHash = await argon2.hash(dto.password || "123");

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        reportsToId: dto.reportsToId || null,
        department: dto.department || null,
      },
    });

    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    // Link user to all companies in the organization
    const companies = await this.prisma.company.findMany({
      where: { organizationId },
    });
    await Promise.all(
      companies.map((company) =>
        this.prisma.userCompany.create({
          data: {
            userId: user.id,
            companyId: company.id,
          },
        }).catch(() => {})
      ),
    );

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: dto.role,
      roles: [dto.role],
      reportsToId: user.reportsToId,
      department: user.department,
      status: user.status,
    };
  }

  async update(id: string, dto: any, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: { roles: true },
    });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const data: any = {
      displayName: dto.displayName,
      username: dto.username,
    };

    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    if (dto.reportsToId !== undefined) {
      data.reportsToId = dto.reportsToId || null;
    }
    if (dto.department !== undefined) {
      data.department = dto.department || null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    if (dto.role) {
      let role = await this.prisma.role.findFirst({
        where: { organizationId, name: dto.role },
      });
      if (!role) {
        role = await this.prisma.role.create({
          data: {
            organizationId,
            name: dto.role,
            label: dto.role.charAt(0).toUpperCase() + dto.role.slice(1),
          },
        });
      }
      // Delete existing roles
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });
      // Add new role
      await this.prisma.userRole.create({
        data: {
          userId: id,
          roleId: role.id,
        },
      });
    }

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      role: dto.role || "storekeeper",
      roles: dto.role ? [dto.role] : [],
      reportsToId: updatedUser.reportsToId,
      department: updatedUser.department,
      status: updatedUser.status,
    };
  }

  async delete(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }
}
