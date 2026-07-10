import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET", "dev-access-secret"),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
        companies: { include: { company: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User is disabled or no longer exists.");
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      organizationId: user.organizationId,
      roles: user.roles.map((role) => role.role.name),
      reportsToId: user.reportsToId,
      department: user.department,
      companies: user.companies
        .filter((entry) => entry.company.isActive)
        .map((entry) => ({
          id: entry.company.id,
          code: entry.company.code,
          name: entry.company.name,
        })),
    };
  }
}
