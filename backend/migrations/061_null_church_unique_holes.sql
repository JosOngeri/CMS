-- L774: close the NULL-unique hole on (key, church_id)-style constraints.
-- Postgres treats NULL church_id values as DISTINCT, so UNIQUE(key, church_id)
-- never dedupes global-scope rows. Partial unique indexes enforce uniqueness
-- for the global (NULL church_id) scope; the existing constraints continue to
-- cover church-scoped rows. Dedupe first so the migration fails loudly only if
-- genuinely conflicting global rows remain.

-- settings: keep the most recently updated global row per key
DELETE FROM settings a
USING settings b
WHERE a.church_id IS NULL
  AND b.church_id IS NULL
  AND a.key = b.key
  AND (a.updated_at, a.id) < (b.updated_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS settings_key_global_uidx
  ON settings (key) WHERE church_id IS NULL;

-- security_settings: at most one global row
DELETE FROM security_settings a
USING security_settings b
WHERE a.church_id IS NULL
  AND b.church_id IS NULL
  AND (a.updated_at, a.id) < (b.updated_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS security_settings_global_uidx
  ON security_settings ((church_id IS NULL)) WHERE church_id IS NULL;

-- treasury: fund_code / account_code unique within the global scope too
DELETE FROM funds a
USING funds b
WHERE a.church_id IS NULL
  AND b.church_id IS NULL
  AND a.fund_code = b.fund_code
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS funds_fund_code_global_uidx
  ON funds (fund_code) WHERE church_id IS NULL;

DELETE FROM chart_of_accounts a
USING chart_of_accounts b
WHERE a.church_id IS NULL
  AND b.church_id IS NULL
  AND a.account_code = b.account_code
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS chart_of_accounts_code_global_uidx
  ON chart_of_accounts (account_code) WHERE church_id IS NULL;
