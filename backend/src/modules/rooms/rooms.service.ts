import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { Room } from '../../entities/room.entity';
import { User } from '../../entities/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: EntityRepository<Room>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepository.create({
      name: createRoomDto.name,
      description: createRoomDto.description,
      isPrivate: createRoomDto.isPrivate ?? false,
      maxParticipants: createRoomDto.maxParticipants ?? 10,
      isActive: createRoomDto.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (createRoomDto.password) {
      room.password = await bcrypt.hash(createRoomDto.password, 10);
    }

    await this.roomRepository.persistAndFlush(room);
    return room;
  }

  async findAll(): Promise<Room[]> {
    return this.roomRepository.findAll({
      populate: ['participants'],
    });
  }

  async findOne(id: number): Promise<Room | null> {
    return this.roomRepository.findOne(id, {
      populate: ['participants'],
    });
  }

  async findByName(name: string): Promise<Room | null> {
    return this.roomRepository.findOne(
      { name },
      {
        populate: ['participants'],
      },
    );
  }

  async update(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.roomRepository.findOneOrFail(id);

    Object.assign(room, updateRoomDto);

    if (updateRoomDto.password) {
      room.password = await bcrypt.hash(updateRoomDto.password, 10);
    }

    await this.roomRepository.persistAndFlush(room);
    return room;
  }

  async remove(id: number): Promise<void> {
    const room = await this.roomRepository.findOneOrFail(id);
    await this.roomRepository.removeAndFlush(room);
  }

  async joinRoom(
    roomId: number,
    userId: number,
    password?: string,
  ): Promise<Room> {
    const room = await this.roomRepository.findOneOrFail(roomId, {
      populate: ['participants'],
    });
    const user = await this.userRepository.findOneOrFail(userId);

    // Check if room is private and password is required
    if (room.isPrivate && room.password) {
      if (!password || !(await bcrypt.compare(password, room.password))) {
        throw new Error('Invalid room password');
      }
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    // Check if user is already in the room
    if (!room.participants.contains(user)) {
      room.participants.add(user);
      await this.roomRepository.persistAndFlush(room);
    }

    return room;
  }

  async leaveRoom(roomId: number, userId: number): Promise<Room> {
    const room = await this.roomRepository.findOneOrFail(roomId, {
      populate: ['participants'],
    });
    const user = await this.userRepository.findOneOrFail(userId);

    room.participants.remove(user);
    await this.roomRepository.persistAndFlush(room);

    return room;
  }

  async getActiveRooms(): Promise<Room[]> {
    return this.roomRepository.find(
      { isActive: true },
      {
        populate: ['participants'],
      },
    );
  }
}
