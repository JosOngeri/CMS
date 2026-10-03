# _do-not-run/ — broken/predatory seed files (L776–L779)

These seed files predate multitenancy and must NOT be executed. They are kept
as anonymized reference copies only.

| File | Why it is quarantined |
|---|---|
| `sample_data.sql` | Inserts string IDs (`'admin-id'`) into UUID columns — fails outright. |
| `complete_seed.sql` | Fake bcrypt literals (`placeholder_hash_*`) — seeded users can never authenticate. Hashes neutralized. |
| `seed_church_workers.sql` | Fake bcrypt + **real member PII** + no `church_id`. Names/emails anonymized to `workerNN@example.invalid`. |
| `departments_seed_updated.sql` | Real leader names, no `church_id`/`slug`; disagrees with canonical `backend/scripts/data/sda-departments.js` (flat vs hierarchical, Deaconry merged vs split). Leader names blanked to NULL. |

Canonical seed path: `backend/scripts/seed-*.js` (guarded by
`scripts/_scriptSafety.js`) + `backend/scripts/data/sda-departments.js` for
the department hierarchy. Seeds must be idempotent and `church_id`-scoped —
see `.devin/rules/seed-data.md`.
