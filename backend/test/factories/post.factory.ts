import { Factory } from '@mikro-orm/seeder';
import { Post } from '../../src/entities/post.entity';
import { faker } from '@faker-js/faker';

export class PostFactory extends Factory<Post> {
  model = Post;

  definition(): Partial<Post> {
    return {
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      createdAt: new Date(),
    };
  }
}
