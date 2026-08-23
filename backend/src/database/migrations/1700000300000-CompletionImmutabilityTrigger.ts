import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompletionImmutabilityTrigger1700000300000 implements MigrationInterface {
  name = 'CompletionImmutabilityTrigger1700000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_completion_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Completion records are immutable. No updates or deletes allowed.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER completion_immutability
      BEFORE UPDATE OR DELETE ON completion_records
      FOR EACH ROW EXECUTE FUNCTION prevent_completion_modification();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS completion_immutability ON completion_records;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_completion_modification();`);
  }
}
