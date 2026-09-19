// For the later migration step: makes audit_log_entries tamper-evident at the database level.
// Statements are separated so a migration can run them one by one.
export const AUDIT_LOG_APPEND_ONLY_DDL = `
CREATE OR REPLACE FUNCTION audit_log_entries_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_entries is append-only (% is not allowed)', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_entries_block_row_mutation ON audit_log_entries;
CREATE TRIGGER audit_log_entries_block_row_mutation
  BEFORE UPDATE OR DELETE ON audit_log_entries
  FOR EACH ROW EXECUTE FUNCTION audit_log_entries_block_mutation();

DROP TRIGGER IF EXISTS audit_log_entries_block_truncate ON audit_log_entries;
CREATE TRIGGER audit_log_entries_block_truncate
  BEFORE TRUNCATE ON audit_log_entries
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_entries_block_mutation();
`;

export const AUDIT_LOG_APPEND_ONLY_ROLLBACK_DDL = `
DROP TRIGGER IF EXISTS audit_log_entries_block_truncate ON audit_log_entries;
DROP TRIGGER IF EXISTS audit_log_entries_block_row_mutation ON audit_log_entries;
DROP FUNCTION IF EXISTS audit_log_entries_block_mutation();
`;
