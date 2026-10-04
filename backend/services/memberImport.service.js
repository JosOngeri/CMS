/**
 * @purpose Shared member-CSV import for the platform wizard (7.3) and the
 *          church-side /api/members/import endpoint. Normalizes rows,
 *          validates required names, and skips duplicates on
 *          (church_id, first_name, last_name).
 * @exports importMembers
 */
const { pool } = require('../config/database');

const ALLOWED = {
  first_name: 'string', last_name: 'string', phone: 'string', email: 'string',
  gender: 'string', date_of_birth: 'string', marital_status: 'string',
  occupation: 'string', address: 'string', city: 'string',
  joined_date: 'string', membership_status: 'string', notes: 'string',
};

const normalizeRow = (raw) => {
  const row = {};
  for (const [key, type] of Object.entries(ALLOWED)) {
    const v = raw[key];
    if (v === undefined || v === null || v === '') continue;
    if (type === 'string') row[key] = String(v).trim().slice(0, 255) || null;
  }
  return row;
};

/**
 * @param {string} churchId
 * @param {Array<Object>} rawRows — up to 2000 rows per call
 * @returns {{inserted:number, skipped:number, errors:Array}}
 */
const importMembers = async (churchId, rawRows) => {
  const rows = rawRows.slice(0, 2000).map(normalizeRow);
  const result = { inserted: 0, skipped: 0, errors: [] };

  // No transaction: a bad row must not abort the rest of the import —
  // each INSERT is already atomic and failures are reported per row.
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.first_name || !r.last_name) {
      result.errors.push({ row: i + 1, reason: 'first_name and last_name are required' });
      continue;
    }
    try {
        const insert = await pool.query(
          `INSERT INTO members (church_id, first_name, last_name, phone, email, gender,
                                date_of_birth, marital_status, occupation, address, city,
                                joined_date, membership_status, notes)
           SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
            WHERE NOT EXISTS (
              SELECT 1 FROM members
               WHERE church_id = $1 AND first_name = $2 AND last_name = $3
                 AND COALESCE(phone,'') = COALESCE($4,''))`,
          [
            churchId, r.first_name, r.last_name, r.phone || null, r.email || null,
            r.gender || null, r.date_of_birth || null, r.marital_status || null,
            r.occupation || null, r.address || null, r.city || null,
            r.joined_date || null, r.membership_status || 'active', r.notes || null,
          ]
        );
      if (insert.rowCount === 0) result.skipped += 1; else result.inserted += 1;
    } catch (error) {
      result.errors.push({ row: i + 1, reason: error.message });
    }
  }
  return result;
};

module.exports = { importMembers };
