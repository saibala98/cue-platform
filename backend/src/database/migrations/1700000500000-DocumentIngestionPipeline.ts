import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentIngestionPipeline1700000500000 implements MigrationInterface {
  name = 'DocumentIngestionPipeline1700000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lob_documents" ADD COLUMN "chunk_count" INTEGER NOT NULL DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE "lob_documents" ADD COLUMN "error_message" TEXT;`);
    await queryRunner.query(`
      ALTER TABLE "lob_documents"
      ADD CONSTRAINT "chk_lob_documents_status" CHECK ("status" IN ('uploaded', 'processing', 'ready', 'failed'));
    `);

    await queryRunner.query(`
      CREATE TABLE "document_chunks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" UUID NOT NULL REFERENCES "lob_documents"("id") ON DELETE CASCADE,
        "lob_id" UUID NOT NULL,
        "chunk_text" TEXT NOT NULL,
        "chunk_index" INTEGER NOT NULL,
        "metadata" JSONB NOT NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_document_chunks_document_id" ON "document_chunks" ("document_id");`);
    await queryRunner.query(`CREATE INDEX "idx_document_chunks_lob_id" ON "document_chunks" ("lob_id");`);
    // GIN trigram index would speed up ILIKE substring search at scale, but
    // requires the pg_trgm extension; for MVP demo-scale data a plain btree
    // on lob_id is enough since we filter by LOB before scoring in-app.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks";`);
    await queryRunner.query(`ALTER TABLE "lob_documents" DROP CONSTRAINT IF EXISTS "chk_lob_documents_status";`);
    await queryRunner.query(`ALTER TABLE "lob_documents" DROP COLUMN IF EXISTS "error_message";`);
    await queryRunner.query(`ALTER TABLE "lob_documents" DROP COLUMN IF EXISTS "chunk_count";`);
  }
}
