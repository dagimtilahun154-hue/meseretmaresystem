import { UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
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
    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, status: "ACTIVE" },
      include: {
        roles: { include: { role: true } },
        companies: { include: { company: true } },
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Invalid username or password.");
    }

    await this.writeAudit(user, AuditAction.LOGIN, "auth", user.id, request);
    return this.createSession(user, request);
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
        role: roles[0] || "manager",
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
