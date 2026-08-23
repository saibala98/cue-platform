import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeMapStructure1700000700000 implements MigrationInterface {
  name = 'KnowledgeMapStructure1700000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "knowledge_map" RENAME COLUMN "owner" TO "owner_name";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" RENAME COLUMN "go_to_contact" TO "go_to_contact_name";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" RENAME COLUMN "approver" TO "approver_name";`);

    await queryRunner.query(`ALTER TABLE "knowledge_map" ADD COLUMN "description" TEXT;`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" ADD COLUMN "owner_email" VARCHAR(255);`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" ADD COLUMN "go_to_contact_email" VARCHAR(255);`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" ADD COLUMN "go_to_contact_role" VARCHAR(255);`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" ADD COLUMN "approver_email" VARCHAR(255);`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" ADD COLUMN "approver_role" VARCHAR(255);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "knowledge_map" DROP COLUMN IF EXISTS "approver_role";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" DROP COLUMN IF EXISTS "approver_email";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" DROP COLUMN IF EXISTS "go_to_contact_role";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" DROP COLUMN IF EXISTS "go_to_contact_email";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" DROP COLUMN IF EXISTS "owner_email";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" DROP COLUMN IF EXISTS "description";`);

    await queryRunner.query(`ALTER TABLE "knowledge_map" RENAME COLUMN "approver_name" TO "approver";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" RENAME COLUMN "go_to_contact_name" TO "go_to_contact";`);
    await queryRunner.query(`ALTER TABLE "knowledge_map" RENAME COLUMN "owner_name" TO "owner";`);
  }
}
