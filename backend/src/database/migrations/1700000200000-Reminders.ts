import { MigrationInterface, QueryRunner } from 'typeorm';

export class Reminders1700000200000 implements MigrationInterface {
  name = 'Reminders1700000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reminders" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "target_type" VARCHAR(30) NOT NULL CHECK ("target_type" IN ('module_assignment', 'course_progress')),
        "target_id" UUID NOT NULL,
        "sent_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sent_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_reminders_target" ON "reminders" ("target_type", "target_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reminders";`);
  }
}
