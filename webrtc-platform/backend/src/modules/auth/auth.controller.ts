import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { LocalAuthGuard } from '../../shared/guards/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../../dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const result = await this.authService.login(user);
    return {
      ...result,
      user: user.toJSON(),
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req) {
    const result = await this.authService.login(req.user);
    return {
      ...result,
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      return null;
    }
    return user.toJSON();
  }
}
