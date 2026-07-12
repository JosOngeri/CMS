/**
 * Security Audit Script for KMainCMS Backend
 * 
 * This script performs security checks on the codebase
 * to identify potential vulnerabilities and security issues.
 */

const fs = require('fs');
const path = require('path');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: []
};

function addCheck(name, status, message, severity = 'high') {
  results.checks.push({
    name,
    status,
    message,
    severity
  });

  if (status === 'PASS') {
    results.passed++;
  } else if (status === 'FAIL') {
    results.failed++;
  } else {
    results.warnings++;
  }
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function checkForSecrets(content) {
  const secretPatterns = [
    /password\s*=\s*['"][^'"]+['"]/gi,
    /api_key\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
    /token\s*=\s*['"][^'"]+['"]/gi,
    /private_key\s*=\s*['"][^'"]+['"]/gi,
    /aws_access_key\s*=\s*['"][^'"]+['"]/gi,
    /aws_secret_key\s*=\s*['"][^'"]+['"]/gi,
    /mongodb:\/\/[^@]+:[^@]+@/gi,
    /postgres:\/\/[^@]+:[^@]+@/gi,
    /redis:\/\/[:@]+@/gi
  ];

  const foundSecrets = [];
  secretPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      foundSecrets.push(...matches);
    }
  });

  return foundSecrets;
}

function checkForHardcodedCredentials(content) {
  const patterns = [
    /['"](?=.{20,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+['"]/g,
    /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    /sk-[a-zA-Z0-9]{32,}/g, // OpenAI API keys
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
    /xox[baprs]-[a-zA-Z0-9\-]+/g // Slack tokens
  ];

  const found = [];
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      found.push(...matches);
    }
  });

  return found;
}

async function runSecurityAudit() {
  console.log('🔒 Starting Security Audit for KMainCMS Backend\n');
  console.log('='.repeat(60));

  const backendDir = path.join(__dirname);

  // Check 1: .env file should not be committed
  console.log('\n🔍 Checking for .env file in repository...');
  const envFile = path.join(backendDir, '.env');
  if (checkFileExists(envFile)) {
    addCheck('.env file not in repository', 'FAIL', '.env file found - should be in .gitignore', 'high');
  } else {
    addCheck('.env file not in repository', 'PASS', '.env file not found in repository', 'high');
  }

  // Check 2: .gitignore exists and includes sensitive files
  console.log('\n🔍 Checking .gitignore configuration...');
  const gitignoreFile = path.join(backendDir, '.gitignore');
  const gitignoreContent = readFile(gitignoreFile);
  
  if (gitignoreContent) {
    const requiredIgnores = ['.env', '*.key', '*.pem', 'credentials', 'secrets'];
    const missingIgnores = requiredIgnores.filter(ignore => !gitignoreContent.includes(ignore));
    
    if (missingIgnores.length === 0) {
      addCheck('.gitignore configuration', 'PASS', 'All sensitive files are ignored', 'high');
    } else {
      addCheck('.gitignore configuration', 'FAIL', `Missing ignores: ${missingIgnores.join(', ')}`, 'high');
    }
  } else {
    addCheck('.gitignore configuration', 'FAIL', '.gitignore file not found', 'high');
  }

  // Check 3: Check for hardcoded secrets in source files
  console.log('\n🔍 Scanning for hardcoded secrets...');
  const sourceDirs = ['controllers', 'services', 'routes', 'config'];
  let secretsFound = false;

  sourceDirs.forEach(dir => {
    const dirPath = path.join(backendDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(dirPath, file);
          const content = readFile(filePath);
          if (content) {
            const secrets = checkForSecrets(content);
            if (secrets.length > 0) {
              secretsFound = true;
              addCheck(`Hardcoded secrets in ${file}`, 'FAIL', `Found ${secrets.length} potential secrets`, 'critical');
            }
          }
        }
      });
    }
  });

  if (!secretsFound) {
    addCheck('Hardcoded secrets in source files', 'PASS', 'No hardcoded secrets found', 'critical');
  }

  // Check 4: Check for SQL injection vulnerabilities
  console.log('\n🔍 Checking for SQL injection vulnerabilities...');
  const sqlPatterns = [
    /SELECT\s+\*\s+FROM\s+\w+\s+WHERE\s+\w+\s*=\s*['"]\$\{[^}]+\}['"]/gi,
    /query\(['"`][^'"`]*\$\{[^}]+\}[^'"`]*['"`]\)/gi
  ];

  let sqlVulnerabilities = false;
  sourceDirs.forEach(dir => {
    const dirPath = path.join(backendDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(dirPath, file);
          const content = readFile(filePath);
          if (content) {
            sqlPatterns.forEach(pattern => {
              const matches = content.match(pattern);
              if (matches) {
                sqlVulnerabilities = true;
                addCheck(`SQL injection vulnerability in ${file}`, 'FAIL', 'Potential SQL injection found', 'critical');
              }
            });
          }
        }
      });
    }
  });

  if (!sqlVulnerabilities) {
    addCheck('SQL injection vulnerabilities', 'PASS', 'No SQL injection patterns found', 'critical');
  }

  // Check 5: Check for XSS vulnerabilities
  console.log('\n🔍 Checking for XSS vulnerabilities...');
  const xssPatterns = [
    /innerHTML\s*=\s*[^;]+/gi,
    /dangerouslySetInnerHTML/gi,
    /eval\s*\(/gi
  ];

  let xssVulnerabilities = false;
  sourceDirs.forEach(dir => {
    const dirPath = path.join(backendDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(dirPath, file);
          const content = readFile(filePath);
          if (content) {
            xssPatterns.forEach(pattern => {
              const matches = content.match(pattern);
              if (matches) {
                xssVulnerabilities = true;
                addCheck(`XSS vulnerability in ${file}`, 'WARN', 'Potential XSS pattern found', 'medium');
              }
            });
          }
        }
      });
    }
  });

  if (!xssVulnerabilities) {
    addCheck('XSS vulnerabilities', 'PASS', 'No XSS patterns found', 'medium');
  }

  // Check 6: Check for authentication/authorization
  console.log('\n🔍 Checking for authentication middleware...');
  const authMiddleware = readFile(path.join(backendDir, 'middleware', 'auth.js'));
  if (authMiddleware && authMiddleware.includes('jwt')) {
    addCheck('Authentication middleware', 'PASS', 'JWT authentication middleware found', 'high');
  } else {
    addCheck('Authentication middleware', 'WARN', 'JWT authentication middleware not found or incomplete', 'high');
  }

  // Check 7: Check for rate limiting
  console.log('\n🔍 Checking for rate limiting...');
  const serverFile = readFile(path.join(backendDir, 'server.js'));
  if (serverFile && serverFile.includes('rate-limit')) {
    addCheck('Rate limiting', 'PASS', 'Rate limiting configured', 'medium');
  } else {
    addCheck('Rate limiting', 'WARN', 'Rate limiting not found', 'medium');
  }

  // Check 8: Check for CORS configuration
  console.log('\n🔍 Checking for CORS configuration...');
  if (serverFile && serverFile.includes('cors')) {
    addCheck('CORS configuration', 'PASS', 'CORS middleware configured', 'medium');
  } else {
    addCheck('CORS configuration', 'WARN', 'CORS middleware not found', 'medium');
  }

  // Check 9: Check for helmet security headers
  console.log('\n🔍 Checking for security headers...');
  if (serverFile && serverFile.includes('helmet')) {
    addCheck('Security headers (Helmet)', 'PASS', 'Helmet security headers configured', 'medium');
  } else {
    addCheck('Security headers (Helmet)', 'WARN', 'Helmet security headers not found', 'medium');
  }

  // Check 10: Check for input validation
  console.log('\n🔍 Checking for input validation...');
  const validationFound = sourceDirs.some(dir => {
    const dirPath = path.join(backendDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      return files.some(file => {
        if (file.endsWith('.js')) {
          const content = readFile(path.join(dirPath, file));
          return content && (content.includes('express-validator') || content.includes('validation'));
        }
      });
    }
  });

  if (validationFound) {
    addCheck('Input validation', 'PASS', 'Input validation found', 'high');
  } else {
    addCheck('Input validation', 'WARN', 'Input validation not found', 'high');
  }

  // Check 11: Check for secure cookie configuration
  console.log('\n🔍 Checking for secure cookie configuration...');
  if (serverFile && serverFile.includes('cookie-parser')) {
    const secureCookie = serverFile.includes('secure') && serverFile.includes('httpOnly');
    if (secureCookie) {
      addCheck('Secure cookie configuration', 'PASS', 'Secure cookie options configured', 'medium');
    } else {
      addCheck('Secure cookie configuration', 'WARN', 'Secure cookie options not fully configured', 'medium');
    }
  } else {
    addCheck('Secure cookie configuration', 'INFO', 'Cookie parser not used', 'low');
  }

  // Check 12: Check for dependency vulnerabilities (would need npm audit)
  console.log('\n🔍 Note: Run "npm audit" to check for dependency vulnerabilities');
  addCheck('Dependency vulnerabilities', 'INFO', 'Run "npm audit" to check', 'low');

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Security Audit Results Summary\n');
  console.log('Check'.padEnd(40) + 'Status'.padEnd(10) + 'Severity');
  console.log('-'.repeat(60));

  results.checks.forEach(check => {
    const statusIcon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
    console.log(
      check.name.padEnd(40) +
      `${statusIcon} ${check.status}`.padEnd(10) +
      check.severity
    );
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.passed + results.failed + results.warnings} checks`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log('='.repeat(60));

  // Exit with error code if critical checks failed
  const criticalFailures = results.checks.filter(c => c.status === 'FAIL' && c.severity === 'critical');
  if (criticalFailures.length > 0) {
    console.log('\n❌ Critical security issues found. Please address them immediately.');
    process.exit(1);
  } else if (results.failed > 0) {
    console.log('\n⚠️  Security issues found. Please review and address them.');
    process.exit(1);
  } else {
    console.log('\n✅ No critical security issues found.');
  }
}

// Run security audit
runSecurityAudit().catch(error => {
  console.error('❌ Security audit failed:', error);
  process.exit(1);
});
