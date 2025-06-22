import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UpdateUserDto } from '../../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    await this.userRepository.persistAndFlush(user);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne(id);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ username });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    const user = await this.userRepository.findOne(id);
    if (!user) return null;

    this.userRepository.assign(user, updateUserDto);
    await this.userRepository.flush();
    return user;
  }

  async remove(id: number): Promise<boolean> {
    const user = await this.userRepository.findOne(id);
    if (!user) return false;

    await this.userRepository.removeAndFlush(user);
    return true;
  }
}
