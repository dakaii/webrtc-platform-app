import {
  Entity,
  PrimaryKey,
  Property,
  ManyToMany,
  Collection,
  BeforeCreate,
} from '@mikro-orm/core';
import { User } from './user.entity';

export type SerializedRoom = {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  maxParticipants: number;
  isActive: boolean;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
};

@Entity()
export class Room {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property()
  isPrivate: boolean = false;

  @Property({ nullable: true })
  password?: string;

  @Property()
  maxParticipants: number = 10;

  @Property()
  isActive: boolean = true;

  @ManyToMany(() => User, 'rooms', { owner: true })
  participants = new Collection<User>(this);

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @BeforeCreate()
  setDefaults() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  toJSON(): SerializedRoom {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isPrivate: this.isPrivate,
      maxParticipants: this.maxParticipants,
      isActive: this.isActive,
      participantCount: this.participants.length,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
