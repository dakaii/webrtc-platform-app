import { IsOptional, IsString } from 'class-validator';

export class JoinRoomDto {
  @IsOptional()
  @IsString()
  password?: string;
}
