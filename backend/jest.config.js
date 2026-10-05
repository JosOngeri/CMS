// Jest picks this file up automatically for bare `jest`/`npx jest` runs.
// `npm test` still passes --config=tests/jest.config.js explicitly — both
// paths resolve to the same config so results can no longer diverge.
const base = require('./tests/jest.config.js');

module.exports = {
  ...base,
  // tests/jest.config.js uses rootDir '..' because it lives in tests/;
  // this wrapper lives at the backend root itself.
  rootDir: '.'
};
