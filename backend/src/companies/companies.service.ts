import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    const rows = await this.prisma.userCompany.findMany({
      where: {
        userId,
        company: { isActive: true },
      },
      include: { company: true },
      orderBy: { company: { code: "asc" } },
    });

    return rows.map((row) => ({
      id: row.company.id,
      code: row.company.code,
      name: row.company.name,
    }));
  }
}
