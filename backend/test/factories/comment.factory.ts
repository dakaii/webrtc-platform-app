import { Factory } from '@mikro-orm/seeder';
import { Comment } from '../../src/entities/comment.entity';
import { faker } from '@faker-js/faker';

export class CommentFactory extends Factory<Comment> {
  model = Comment;

  definition(): Partial<Comment> {
    return {
      content: faker.lorem.paragraph(),
      createdAt: new Date(),
    };
  }
}
