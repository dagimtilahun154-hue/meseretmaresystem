import { Controller, Get, Post, Put, Delete, Body, Param, Req } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthUser } from "../common/types/auth-user";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Req() request: { user: AuthUser }) {
    return this.usersService.findAll(request.user.organizationId);
  }

  @Roles("admin")
  @Post()
  create(@Body() dto: any, @Req() request: { user: AuthUser }) {
    return this.usersService.create(dto, request.user.organizationId);
  }

  @Roles("admin")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: any, @Req() request: { user: AuthUser }) {
    return this.usersService.update(id, dto, request.user.organizationId);
  }

  @Roles("admin")
  @Delete(":id")
  delete(@Param("id") id: string, @Req() request: { user: AuthUser }) {
    return this.usersService.delete(id, request.user.organizationId);
  }
}
