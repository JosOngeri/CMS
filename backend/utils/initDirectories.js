const fs = require('fs');
const path = require('path');

/**
 * Directory Initialization Script
 * Creates all required upload directories for the application
 */

const directories = [
  'uploads',
  'uploads/documents',
  'uploads/documents/versions',
  'uploads/gallery',
  'uploads/gallery/photos',
  'uploads/profiles',
  'uploads/temp',
  'uploads/exports',
  'uploads/reports'
];

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Path to directory
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dirPath}`);
    } catch (error) {
      console.error(`✗ Failed to create directory ${dirPath}:`, error.message);
      throw error;
    }
  } else {
    console.log(`- Directory already exists: ${dirPath}`);
  }
}

/**
 * Initialize all required directories
 */
function initializeDirectories() {
  console.log('Initializing upload directories...\n');
  
  directories.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    ensureDirectoryExists(fullPath);
  });
  
  console.log('\n✓ All directories initialized successfully');
}

// Run initialization if this script is executed directly
if (require.main === module) {
  try {
    initializeDirectories();
  } catch (error) {
    console.error('\n✗ Directory initialization failed:', error.message);
    process.exit(1);
  }
}

module.exports = { ensureDirectoryExists, initializeDirectories };
