import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeBuddyChat1700000600000 implements MigrationInterface {
  name = 'KnowledgeBuddyChat1700000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_conversations_user_id" ON "conversations" ("user_id");`);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('user', 'assistant')),
        "content" TEXT NOT NULL,
        "answer_type" VARCHAR(20) CHECK ("answer_type" IN ('document', 'knowledge_map', 'course_tutor', 'general')),
        "metadata" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_messages_conversation_id" ON "messages" ("conversation_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations";`);
  }
}
