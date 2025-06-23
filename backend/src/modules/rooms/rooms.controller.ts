import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  async findAll() {
    return this.roomsService.findAll();
  }

  @Get('active')
  async getActiveRooms() {
    return this.roomsService.getActiveRooms();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.findOne(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roomsService.remove(id);
    return { message: 'Room deleted successfully' };
  }

  @Post(':id/join')
  async joinRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() joinRoomDto: JoinRoomDto,
    @Request() req: any,
  ) {
    return this.roomsService.joinRoom(id, req.user.id, joinRoomDto.password);
  }

  @Post(':id/leave')
  async leaveRoom(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.roomsService.leaveRoom(id, req.user.id);
  }
}
