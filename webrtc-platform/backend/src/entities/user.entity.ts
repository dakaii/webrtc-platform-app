import {
  Entity,
  PrimaryKey,
  Property,
  Collection,
  ManyToMany,
  BeforeCreate,
  wrap,
} from '@mikro-orm/core';
import { Room } from './room.entity';
import * as bcrypt from 'bcrypt';

export type SerializedUser = Omit<
  User,
  'password' | 'toJSON' | 'hashPassword' | 'comparePassword'
>;

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property()
  username!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  password!: string;

  @ManyToMany(() => Room, 'participants')
  rooms = new Collection<Room>(this);

  @BeforeCreate()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  toJSON(): SerializedUser {
    return wrap(this).toObject() as SerializedUser;
  }
}
