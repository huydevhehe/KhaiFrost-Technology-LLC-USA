import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogAppendOnly1789789500000 implements MigrationInterface {
  name = 'AuditLogAppendOnly1789789500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION audit_log_entries_block_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_log_entries is append-only (% is not allowed)', TG_OP
          USING ERRCODE = 'restrict_violation';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_log_entries_block_row_mutation
        BEFORE UPDATE OR DELETE ON audit_log_entries
        FOR EACH ROW EXECUTE FUNCTION audit_log_entries_block_mutation()
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_log_entries_block_truncate
        BEFORE TRUNCATE ON audit_log_entries
        FOR EACH STATEMENT EXECUTE FUNCTION audit_log_entries_block_mutation()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS audit_log_entries_block_truncate ON audit_log_entries`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS audit_log_entries_block_row_mutation ON audit_log_entries`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS audit_log_entries_block_mutation()`);
  }
}
