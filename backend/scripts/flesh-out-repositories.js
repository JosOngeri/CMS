/**
 * Script to identify and flesh out missing repository methods
 * This script checks all repositories and identifies methods that are called but not implemented
 */

const fs = require('fs');
const path = require('path');

const repositoriesDir = path.join(__dirname, '../repositories');
const controllersDir = path.join(__dirname, '../controllers');

// Get all repository files
const repositoryFiles = fs.readdirSync(repositoriesDir)
  .filter(file => file.endsWith('.js') && file !== 'base.repository.js' && file !== 'BaseRepository.js');

// Get all controller files
const controllerFiles = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.js') && file !== 'BaseController.js');

console.log('=== Repository Files ===');
repositoryFiles.forEach(file => console.log(file));

console.log('\n=== Controller Files ===');
controllerFiles.forEach(file => console.log(file));

// Function to extract method names from a file
function extractMethods(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const methods = [];
  
  // Match async function declarations
  const asyncFunctionRegex = /async\s+(\w+)\s*\(/g;
  let match;
  while ((match = asyncFunctionRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  // Match regular function declarations
  const functionRegex = /function\s+(\w+)\s*\(/g;
  while ((match = functionRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  // Match arrow function assignments
  const arrowRegex = /(\w+)\s*=\s*(?:async\s+)?\(/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  return methods;
}

// Function to extract Repository method calls from controllers
function extractRepositoryCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const calls = [];
  
  // Match Repository.methodName patterns
  const repositoryRegex = /(\w+Repository)\.(\w+)\(/g;
  let match;
  while ((match = repositoryRegex.exec(content)) !== null) {
    calls.push({
      repository: match[1],
      method: match[2]
    });
  }
  
  return calls;
}

// Analyze each controller
console.log('\n=== Repository Method Calls Analysis ===');
controllerFiles.forEach(controllerFile => {
  const controllerPath = path.join(controllersDir, controllerFile);
  const calls = extractRepositoryCalls(controllerPath);
  
  if (calls.length > 0) {
    console.log(`\n${controllerFile}:`);
    calls.forEach(call => {
      console.log(`  - ${call.repository}.${call.method}()`);
    });
  }
});

console.log('\n=== Analysis Complete ===');
console.log('Review the output above to identify missing repository methods');