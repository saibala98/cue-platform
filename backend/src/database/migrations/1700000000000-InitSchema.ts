import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE "lob" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('new_joinee', 'mentor', 'people_leader', 'compliance_admin')),
        "lob_id" UUID REFERENCES "lob"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_lob_id" ON "users" ("lob_id");`);

    await queryRunner.query(`
      CREATE TABLE "modules" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR(255) NOT NULL,
        "lob_id" UUID REFERENCES "lob"("id") ON DELETE SET NULL,
        "content_type" VARCHAR(50) NOT NULL,
        "content_body" TEXT,
        "content_url" VARCHAR(500),
        "version" VARCHAR(20) NOT NULL DEFAULT '2026.1',
        "order_index" INTEGER NOT NULL DEFAULT 1,
        "sla_days" INTEGER NOT NULL DEFAULT 7,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_modules_lob_id" ON "modules" ("lob_id");`);

    await queryRunner.query(`
      CREATE TABLE "completion_records" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "employee_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "module_id" UUID NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "module_version" VARCHAR(20) NOT NULL,
        "score" INTEGER,
        "completed_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_completion_records_employee_id" ON "completion_records" ("employee_id");`);
    await queryRunner.query(`CREATE INDEX "idx_completion_records_module_id" ON "completion_records" ("module_id");`);

    await queryRunner.query(`
      CREATE TABLE "mentor_assignments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "leader_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "mentor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "mentee_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "assigned_date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "status" VARCHAR(20) DEFAULT 'active'
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_mentor_assignments_mentor_id" ON "mentor_assignments" ("mentor_id");`);
    await queryRunner.query(`CREATE INDEX "idx_mentor_assignments_mentee_id" ON "mentor_assignments" ("mentee_id");`);

    await queryRunner.query(`
      CREATE TABLE "course_progress" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id" UUID NOT NULL REFERENCES "mentor_assignments"("id") ON DELETE CASCADE,
        "session_number" INTEGER NOT NULL CHECK ("session_number" BETWEEN 1 AND 6),
        "completed_at" TIMESTAMP,
        "notes" TEXT,
        "completed_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "uq_course_progress_assignment_session" UNIQUE ("assignment_id", "session_number")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "lob_documents" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "lob_id" UUID NOT NULL REFERENCES "lob"("id") ON DELETE CASCADE,
        "file_name" VARCHAR(255) NOT NULL,
        "file_path" VARCHAR(500) NOT NULL,
        "file_type" VARCHAR(20) NOT NULL,
        "file_size" INTEGER NOT NULL,
        "uploaded_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" VARCHAR(20) DEFAULT 'uploaded',
        "uploaded_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_lob_documents_lob_id" ON "lob_documents" ("lob_id");`);

    await queryRunner.query(`
      CREATE TABLE "knowledge_map" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "lob_id" UUID NOT NULL REFERENCES "lob"("id") ON DELETE CASCADE,
        "topic" VARCHAR(255) NOT NULL,
        "owner" VARCHAR(255) NOT NULL,
        "go_to_contact" VARCHAR(255) NOT NULL,
        "approver" VARCHAR(255),
        "notes" TEXT,
        "last_updated_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "last_updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_knowledge_map_lob_id" ON "knowledge_map" ("lob_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_map";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lob_documents";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course_progress";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mentor_assignments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "completion_records";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modules";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lob";`);
  }
}
