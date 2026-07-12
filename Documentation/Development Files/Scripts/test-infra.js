/**
 * Infrastructure Test Script
 * Verifies workspace structure and shared dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running infrastructure tests...\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// Test 1: Root package.json exists and has workspaces
const rootPackageJson = path.join(__dirname, '..', 'package.json');
test('Root package.json exists', fs.existsSync(rootPackageJson));

if (fs.existsSync(rootPackageJson)) {
  const rootConfig = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
  test('Root package.json has workspaces', Array.isArray(rootConfig.workspaces));
  test('Root package.json includes frontend workspace', rootConfig.workspaces.includes('frontend'));
  test('Root package.json includes backend workspace', rootConfig.workspaces.includes('backend'));
  test('Root package.json includes shared workspace', rootConfig.workspaces.includes('shared'));
}

// Test 2: Shared directory exists
const sharedDir = path.join(__dirname, '..', 'shared');
test('Shared directory exists', fs.existsSync(sharedDir));

// Test 3: Shared constants.js exists
const constantsFile = path.join(sharedDir, 'constants.js');
test('Shared constants.js exists', fs.existsSync(constantsFile));

// Test 4: Shared validators.js exists
const validatorsFile = path.join(sharedDir, 'validators.js');
test('Shared validators.js exists', fs.existsSync(validatorsFile));

// Test 5: Frontend package.json exists
const frontendPackageJson = path.join(__dirname, '..', 'frontend', 'package.json');
test('Frontend package.json exists', fs.existsSync(frontendPackageJson));

// Test 6: Backend package.json exists
const backendPackageJson = path.join(__dirname, '..', 'backend', 'package.json');
test('Backend package.json exists', fs.existsSync(backendPackageJson));

// Test 7: Root node_modules exists (hoisting)
const rootNodeModules = path.join(__dirname, '..', 'node_modules');
test('Root node_modules exists', fs.existsSync(rootNodeModules));

// Test 8: No duplicate node_modules in frontend/backend
const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const backendNodeModules = path.join(__dirname, '..', 'backend', 'node_modules');
test('No duplicate node_modules in frontend', !fs.existsSync(frontendNodeModules));
test('No duplicate node_modules in backend', !fs.existsSync(backendNodeModules));

// Test 9: Shared dependencies in root package.json
if (fs.existsSync(rootPackageJson)) {
  const rootConfig = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
  test('Root has axios dependency', rootConfig.dependencies && rootConfig.dependencies.axios);
  test('Root has lucide-react dependency', rootConfig.dependencies && rootConfig.dependencies['lucide-react']);
}

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All infrastructure tests passed!');
  process.exit(0);
}
