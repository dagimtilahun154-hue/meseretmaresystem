import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthUser } from "../types/auth-user";

@Injectable()
export class CompanyAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | undefined>;
      query: Record<string, string | undefined>;
      body?: { companyId?: string; companyCode?: string };
    }>();

    const requestedCompany =
      request.headers["x-company-id"] ||
      request.query.companyId ||
      request.body?.companyId ||
      request.body?.companyCode;

    if (!requestedCompany) return true;
    const user = request.user;
    if (!user) return false;

    const allowed = user.companies.some(
      (company) => company.id === requestedCompany || company.code === requestedCompany,
    );

    if (!allowed) {
      throw new ForbiddenException("You do not have access to this company.");
    }

    return true;
  }
}
