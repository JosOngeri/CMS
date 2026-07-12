#!/usr/bin/env node

/**
 * Test Runner Script (Phase 15)
 * Runs all tests with coverage reporting
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running KMainCMS Test Suite...\n');

const backendPath = path.join(__dirname, 'backend');
const frontendPath = path.join(__dirname, 'frontend');

// Run backend tests
console.log('📦 Running Backend Tests...');
try {
  execSync('cd backend && npm test -- --coverage', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Backend tests passed\n');
} catch (error) {
  console.error('❌ Backend tests failed\n');
  process.exit(1);
}

// Run frontend tests
console.log('🎨 Running Frontend Tests...');
try {
  execSync('cd frontend && npm test -- --coverage --watchAll=false', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Frontend tests passed\n');
} catch (error) {
  console.error('❌ Frontend tests failed\n');
  process.exit(1);
}

console.log('🎉 All tests passed!');
console.log('📊 Coverage reports generated in coverage/ directories');
