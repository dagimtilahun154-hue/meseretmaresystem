import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { AuthUser } from "../common/types/auth-user";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, request);
  }

  @Post("logout")
  logout(@Body() dto: RefreshTokenDto, @Req() request: Request & { user: AuthUser }) {
    return this.authService.logout(dto.refreshToken, request.user, request);
  }

  @Get("me")
  me(@Req() request: Request & { user: AuthUser }) {
    return { user: request.user };
  }
}
