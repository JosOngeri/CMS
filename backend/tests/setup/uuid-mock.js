// CJS stand-in for uuid@14 (ESM-only) under Jest. v4/v7 return real unique
// ids via crypto so tests seeding multiple rows don't hit PK collisions.
const { randomUUID } = require('crypto');

module.exports = {
  v1: () => randomUUID(),
  v3: () => '00000000-0000-3000-0000-000000000000',
  v4: () => randomUUID(),
  v5: () => '00000000-0000-5000-0000-000000000000',
  v6: () => randomUUID(),
  v7: () => randomUUID(),
  NIL: '00000000-0000-0000-0000-000000000000',
  parse: (str) => str,
  stringify: (arr) => arr,
  validate: (str) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str),
  version: (str) => parseInt(str[14], 16)
};
