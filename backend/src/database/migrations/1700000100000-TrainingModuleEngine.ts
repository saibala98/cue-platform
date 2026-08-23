import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrainingModuleEngine1700000100000 implements MigrationInterface {
  name = 'TrainingModuleEngine1700000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "module_assignments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "employee_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "module_id" UUID NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "assigned_date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "due_date" TIMESTAMP NOT NULL,
        "started_at" TIMESTAMP,
        CONSTRAINT "uq_module_assignments_employee_module" UNIQUE ("employee_id", "module_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_module_assignments_employee_id" ON "module_assignments" ("employee_id");`);
    await queryRunner.query(`CREATE INDEX "idx_module_assignments_module_id" ON "module_assignments" ("module_id");`);

    await queryRunner.query(`
      CREATE TABLE "module_lessons" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "module_id" UUID NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "title" VARCHAR(255) NOT NULL,
        "order_index" INTEGER NOT NULL,
        "content_type" VARCHAR(20) NOT NULL CHECK ("content_type" IN ('text', 'url')),
        "content_body" TEXT,
        "content_url" VARCHAR(500)
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_module_lessons_module_id" ON "module_lessons" ("module_id");`);

    await queryRunner.query(`
      CREATE TABLE "module_quiz_questions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "module_id" UUID NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "question_text" TEXT NOT NULL,
        "order_index" INTEGER NOT NULL,
        "options" TEXT NOT NULL,
        "correct_index" INTEGER NOT NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_module_quiz_questions_module_id" ON "module_quiz_questions" ("module_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "module_quiz_questions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "module_lessons";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "module_assignments";`);
  }
}
