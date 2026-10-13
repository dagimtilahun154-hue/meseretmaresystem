import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuditAction, User } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import { Request } from "express";
import { AuthUser } from "../common/types/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, request: Request) {
    let user;
    try {
      user = await this.prisma.user.findFirst({
        where: { username: dto.username, status: "ACTIVE" },
        include: {
          roles: { include: { role: true } },
          companies: { include: { company: true } },
        },
      });

      // If user not found, check if this is a fresh database with 0 users
      if (!user) {
        const totalUsers = await this.prisma.user.count().catch(() => -1);
        if (totalUsers === 0) {
          console.log("[AuthService] Fresh database detected (0 users). Auto-seeding default admin and system data...");
          await this.seedDefaultAdmin();
          user = await this.prisma.user.findFirst({
            where: { username: dto.username, status: "ACTIVE" },
            include: {
              roles: { include: { role: true } },
              companies: { include: { company: true } },
            },
          });
        }
      }
    } catch (dbErr: any) {
      console.error("[AuthService.login] Database error:", dbErr?.message || dbErr);
      if (dbErr?.code === "P2021" || (dbErr?.message && dbErr.message.includes("doesn't exist"))) {
        throw new HttpException(
          {
            statusCode: 500,
            error: "DATABASE_NOT_INITIALIZED",
            message: "Database tables not found. Please import 'cpanel_init_database.sql' into 'meseretmarecom_system' in phpMyAdmin.",
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        {
          statusCode: 500,
          error: "DATABASE_ERROR",
          message: `Database error: ${dbErr?.message || "Failed to query database"}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Invalid username or password.");
    }

    await this.writeAudit(user, AuditAction.LOGIN, "auth", user.id, request);
    return this.createSession(user, request);
  }

  private async seedDefaultAdmin() {
    try {
      const organization = await this.prisma.organization.upsert({
        where: { slug: "meseret-mare-solar" },
        update: { name: "Meseret Mare Solar" },
        create: { name: "Meseret Mare Solar", slug: "meseret-mare-solar" },
      });

      const companies = await Promise.all([
        this.prisma.company.upsert({
          where: { organizationId_code: { organizationId: organization.id, code: "MM" } },
          update: { name: "Meseret Mare" },
          create: { organizationId: organization.id, code: "MM", name: "Meseret Mare" },
        }),
        this.prisma.company.upsert({
          where: { organizationId_code: { organizationId: organization.id, code: "FZ" } },
          update: { name: "Fasil Zelalem" },
          create: { organizationId: organization.id, code: "FZ", name: "Fasil Zelalem" },
        }),
      ]);

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

      const roles = await Promise.all(
        roleDefinitions.map((role) =>
          this.prisma.role.upsert({
            where: { organizationId_name: { organizationId: organization.id, name: role.name } },
            update: { label: role.label },
            create: { organizationId: organization.id, ...role },
          }),
        ),
      );

      const adminRole = roles.find((role) => role.name === "admin") || roles[0];
      const adminUsername = this.config.get<string>("DEFAULT_ADMIN_USERNAME", "admin");
      const adminPassword = this.config.get<string>("DEFAULT_ADMIN_PASSWORD", "admin123");
      const passwordHash = await argon2.hash(adminPassword);

      const adminUser = await this.prisma.user.upsert({
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
          passwordHash,
          department: "ADMIN",
        },
      });

      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
        update: {},
        create: { userId: adminUser.id, roleId: adminRole.id },
      });

      await Promise.all(
        companies.map((company) =>
          this.prisma.userCompany.upsert({
            where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
            update: {},
            create: { userId: adminUser.id, companyId: company.id },
          }),
        ),
      );

      console.log(`[AuthService] Auto-seed successful: user '${adminUsername}' ready.`);
    } catch (seedErr: any) {
      console.error("[AuthService] Auto-seed failed:", seedErr?.message || seedErr);
    }
  }

  async refresh(refreshToken: string, request: Request) {
    const tokenRows = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
            companies: { include: { company: true } },
          },
        },
      },
    });

    for (const tokenRow of tokenRows) {
      if (await argon2.verify(tokenRow.tokenHash, refreshToken)) {
        await this.prisma.refreshToken.update({
          where: { id: tokenRow.id },
          data: { revokedAt: new Date() },
        });
        await this.writeAudit(tokenRow.user, AuditAction.REFRESH, "auth", tokenRow.user.id, request);
        return this.createSession(tokenRow.user, request);
      }
    }

    throw new UnauthorizedException("Refresh token is invalid or expired.");
  }

  async logout(refreshToken: string, user: AuthUser, request: Request) {
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: { userId: user.id, revokedAt: null },
    });

    for (const token of activeTokens) {
      if (await argon2.verify(token.tokenHash, refreshToken)) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: AuditAction.LOGOUT,
        resource: "auth",
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      },
    });

    return { success: true };
  }

  private async createSession(
    user: User & {
      roles: { role: { name: string; label: string } }[];
      companies: { company: { id: string; code: string; name: string; isActive: boolean } }[];
    },
    request: Request,
  ) {
    const roles = user.roles.map((entry) => entry.role.name);
    const companies = user.companies
      .filter((entry) => entry.company.isActive)
      .map((entry) => ({
        id: entry.company.id,
        code: entry.company.code,
        name: entry.company.name,
      }));
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    const refreshToken = randomBytes(48).toString("base64url");
    const refreshDays = Number(this.config.get<string>("JWT_REFRESH_TTL_DAYS", "30"));
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        organizationId: user.organizationId,
        roles,
        role: roles[0] || "storekeeper",
        reportsToId: user.reportsToId,
        department: user.department,
        companies,
      },
      requestId: request.headers["x-request-id"] || null,
    };
  }

  private async writeAudit(
    user: Pick<User, "id" | "organizationId">,
    action: AuditAction,
    resource: string,
    resourceId: string,
    request: Request,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action,
        resource,
        resourceId,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      },
    });
  }
}
