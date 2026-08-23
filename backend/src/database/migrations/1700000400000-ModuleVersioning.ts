import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModuleVersioning1700000400000 implements MigrationInterface {
  name = 'ModuleVersioning1700000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "modules" ADD COLUMN "family_id" UUID;`);
    await queryRunner.query(`ALTER TABLE "modules" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;`);

    // Every pre-existing module becomes the root of its own version family.
    await queryRunner.query(`UPDATE "modules" SET "family_id" = "id" WHERE "family_id" IS NULL;`);

    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "family_id" SET NOT NULL;`);
    await queryRunner.query(`CREATE INDEX "idx_modules_family_id" ON "modules" ("family_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_modules_family_id";`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "is_archived";`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "family_id";`);
  }
}
