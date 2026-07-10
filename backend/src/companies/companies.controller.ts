import { Controller, Get, Req } from "@nestjs/common";
import { AuthUser } from "../common/types/auth-user";
import { CompaniesService } from "./companies.service";

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get("mine")
  mine(@Req() request: { user: AuthUser }) {
    return this.companiesService.findForUser(request.user.id);
  }
}
