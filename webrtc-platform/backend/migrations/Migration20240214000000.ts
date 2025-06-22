import { Migration } from '@mikro-orm/migrations';

export class Migration20240214000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "user" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL
      );

      CREATE TABLE "room" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "description" TEXT,
        "is_private" BOOLEAN NOT NULL DEFAULT FALSE,
        "password" VARCHAR(255),
        "max_participants" INTEGER NOT NULL DEFAULT 10,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE "room_participants" (
        "room_id" INTEGER NOT NULL REFERENCES "room"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        PRIMARY KEY ("room_id", "user_id")
      );

      CREATE INDEX "room_name_idx" ON "room"("name");
      CREATE INDEX "room_active_idx" ON "room"("is_active");
      CREATE INDEX "room_participants_room_idx" ON "room_participants"("room_id");
      CREATE INDEX "room_participants_user_idx" ON "room_participants"("user_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "room_participants";
      DROP TABLE IF EXISTS "room";
      DROP TABLE IF EXISTS "user";
    `);
  }
}
