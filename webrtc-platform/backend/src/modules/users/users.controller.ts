import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return user.toJSON();
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new HttpException(
          'Username or email already exists',
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        'Could not create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => {
      return user.toJSON();
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user.toJSON();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(+id, updateUserDto);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user.toJSON();
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const user = await this.usersService.remove(+id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User deleted successfully' };
  }
}
