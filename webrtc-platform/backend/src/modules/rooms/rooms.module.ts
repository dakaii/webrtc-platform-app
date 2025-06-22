import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { Room } from '../../entities/room.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Room, User])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
