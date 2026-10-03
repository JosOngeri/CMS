/**
 * In-memory expo-sqlite mock for Jest.
 *
 * Implements just the surface localDatabase.js uses:
 *   openDatabaseAsync -> { execAsync, runAsync, getAllAsync, getFirstAsync }
 * Supported SQL shapes (all statements localDatabase issues):
 *   INSERT INTO <table> (cols) VALUES (?,...)
 *   UPDATE <table> SET col = ?, ... WHERE id = ?
 *   DELETE FROM <table> [WHERE id = ?]
 *   SELECT * FROM <table> [WHERE id = ? | WHERE sync_status = ?] [ORDER BY ...]
 * Anything else is a resolved no-op (DDL in execAsync, PRAGMAs, etc).
 */

const tables = new Map();
let autoId = 0;

const rows = (table) => {
  if (!tables.has(table)) tables.set(table, []);
  return tables.get(table);
};

const parseInsert = (sql) =>
  sql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES/i);

const runAsync = async (sql, params = []) => {
  const insert = parseInsert(sql);
  if (insert) {
    const [, table, colList] = insert;
    const cols = colList.split(',').map((c) => c.trim());
    const row = {};
    cols.forEach((col, i) => (row[col] = params[i]));
    if (row.id === undefined) row.id = ++autoId;
    rows(table).push(row);
    return { lastInsertRowId: row.id, changes: 1 };
  }

  const update = sql.match(/UPDATE (\w+) SET (.+) WHERE id = \?/i);
  if (update) {
    const [, table, setClause] = update;
    const cols = setClause.split(',').map((s) => s.trim().split(' ')[0]);
    const id = params[params.length - 1];
    const row = rows(table).find((r) => r.id === id);
    if (row) cols.forEach((col, i) => (row[col] = params[i]));
    return { changes: row ? 1 : 0 };
  }

  const del = sql.match(/DELETE FROM (\w+)(?: WHERE id = \?)?/i);
  if (del) {
    const table = del[1];
    if (sql.includes('WHERE')) {
      const before = rows(table).length;
      tables.set(table, rows(table).filter((r) => r.id !== params[0]));
      return { changes: before - rows(table).length };
    }
    tables.set(table, []);
    return { changes: 0 };
  }

  return { changes: 0 };
};

const getAllAsync = async (sql, params = []) => {
  const match = sql.match(/SELECT \* FROM (\w+)(.*)/i);
  if (!match) return [];

  const [, table, rest] = match;
  let result = [...rows(table)];

  if (/WHERE\s+id\s*=\s*\?/i.test(rest)) {
    result = result.filter((r) => r.id === params[0]);
  } else if (/WHERE\s+(\w+)\s*=\s*\?/i.test(rest)) {
    const col = rest.match(/WHERE\s+(\w+)\s*=\s*\?/i)[1];
    result = result.filter((r) => r[col] === params[0]);
  }

  const order = rest.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
  if (order) {
    const dir = order[2] && order[2].toUpperCase() === 'DESC' ? -1 : 1;
    result.sort((a, b) => (a[order[1]] > b[order[1]] ? dir : -dir));
  }

  return result;
};

const getFirstAsync = async (sql, params = []) => {
  const all = await getAllAsync(sql, params);
  return all[0] || null;
};

const openDatabaseAsync = async () => ({
  execAsync: async () => {},
  runAsync,
  getAllAsync,
  getFirstAsync,
  closeAsync: async () => {}
});

// Test helper: wipe the in-memory store between suites.
export const __resetMockDb = () => {
  tables.clear();
  autoId = 0;
};

export { openDatabaseAsync };
export default { openDatabaseAsync };
