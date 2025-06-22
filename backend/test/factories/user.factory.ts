import { Factory } from '@mikro-orm/seeder';
import { User } from '../../src/entities/user.entity';
import { faker } from '@faker-js/faker';

export class UserFactory extends Factory<User> {
  model = User;

  definition(): Partial<User> {
    return {
      username: `${faker.internet.userName()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}@${faker.internet.domainName()}`,
      password: faker.internet.password(),
    };
  }
}
