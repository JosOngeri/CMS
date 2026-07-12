const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../server.js');
const appFile = path.join(__dirname, '../app.js');
const routesDir = path.join(__dirname, '../routes');

let output = '# Route Mounting Validation\n\n';
output += '**Generated:** ' + new Date().toISOString().split('T')[0] + '\n\n';
output += 'This document validates that route files are properly mounted in the server configuration.\n\n';
output += '---\n\n';

// Extract mounted routes from server.js
function extractMountedRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  const regex = /app\.use\(['"`]\/api\/([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    routes.push({
      prefix: '/api/' + match[1],
      file: match[1]
    });
  }
  return routes;
}

// Get all route files
function getRouteFiles(dir) {
  const files = fs.readdirSync(dir);
  return files.filter(file => file.endsWith('.js') && file !== 'health.js');
}

// Extract routes from a route file
function extractRoutesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  return routes;
}

// Check server.js
output += '## Server Configuration Analysis\n\n';

const serverMounted = extractMountedRoutes(serverFile);
const appMounted = extractMountedRoutes(appFile);

output += '### Routes Mounted in server.js\n\n';
output += '| Prefix | Route File Expected |\n';
output += '|--------|-------------------|\n';
serverMounted.forEach(route => {
  output += `| \`${route.prefix}\` | \`routes/${route.file}.routes.js\` |\n`;
});

output += `\n**Total in server.js:** ${serverMounted.length}\n\n`;

output += '### Routes Mounted in app.js\n\n';
output += '| Prefix | Route File Expected |\n';
output += '|--------|-------------------|\n';
appMounted.forEach(route => {
  output += `| \`${route.prefix}\` | \`routes/${route.file}.routes.js\` |\n`;
});

output += `\n**Total in app.js:** ${appMounted.length}\n\n`;

// Check for discrepancies
output += '---\n\n';
output += '## Discrepancies Between server.js and app.js\n\n';

const serverPrefixes = new Set(serverMounted.map(r => r.prefix));
const appPrefixes = new Set(appMounted.map(r => r.prefix));

const onlyInServer = [...serverPrefixes].filter(p => !appPrefixes.has(p));
const onlyInApp = [...appPrefixes].filter(p => !serverPrefixes.has(p));

if (onlyInServer.length > 0) {
  output += '### Routes Only in server.js (Not in app.js)\n\n';
  onlyInServer.forEach(prefix => {
    output += `- \`${prefix}\`\n`;
  });
  output += '\n';
}

if (onlyInApp.length > 0) {
  output += '### Routes Only in app.js (Not in server.js)\n\n';
  onlyInApp.forEach(prefix => {
    output += `- \`${prefix}\`\n`;
  });
  output += '\n';
}

// Check which route files exist
output += '---\n\n';
output += '## Route Files vs Mounting\n\n';

const routeFiles = getRouteFiles(routesDir);
output += '| Route File | Mounted in server.js | Mounted in app.js | Status |\n';
output += '|------------|---------------------|------------------|--------|\n';

routeFiles.forEach(file => {
  const baseName = file.replace('.routes.js', '').replace('.js', '');
  const expectedPrefix = '/api/' + baseName;
  const mountedInServer = serverMounted.some(r => r.file === baseName || r.prefix === expectedPrefix);
  const mountedInApp = appMounted.some(r => r.file === baseName || r.prefix === expectedPrefix);
  
  let status = '✅ OK';
  if (!mountedInServer && !mountedInApp) {
    status = '❌ Not mounted';
  } else if (mountedInServer && !mountedInApp) {
    status = '⚠️ Only in server.js';
  } else if (!mountedInServer && mountedInApp) {
    status = '⚠️ Only in app.js';
  }
  
  output += `| \`${file}\` | ${mountedInServer ? '✅' : '❌'} | ${mountedInApp ? '✅' : '❌'} | ${status} |\n`;
});

// Check for mounted routes that don't have corresponding files
output += '\n### Mounted Routes Without Corresponding Files\n\n';
const missingFiles = serverMounted.filter(route => {
  const expectedFile = route.file + '.routes.js';
  return !routeFiles.includes(expectedFile);
});

if (missingFiles.length > 0) {
  output += '| Prefix | Expected File | Status |\n';
  output += '|--------|---------------|--------|\n';
  missingFiles.forEach(route => {
    output += `| \`${route.prefix}\` | \`routes/${route.file}.routes.js\` | ❌ Missing |\n`;
  });
} else {
  output += 'All mounted routes have corresponding files.\n';
}

// Check treasury module routes
output += '\n---\n\n';
output += '## Treasury Module Routes\n\n';

const treasuryRoutesDir = path.join(__dirname, '../modules/treasury/routes');
if (fs.existsSync(treasuryRoutesDir)) {
  const treasuryFiles = fs.readdirSync(treasuryRoutesDir).filter(f => f.endsWith('.js'));
  output += '| Treasury Route File | Expected Mount Point |\n';
  output += '|---------------------|---------------------|\n';
  treasuryFiles.forEach(file => {
    const baseName = file.replace('.routes.js', '').replace('.js', '');
    output += `| \`${file}\` | \`/api/treasury/${baseName}\` |\n`;
  });
  
  // Check if treasury is mounted correctly
  const treasuryMounted = serverMounted.some(r => r.prefix === '/api/treasury');
  const treasuryMountedApp = appMounted.some(r => r.prefix === '/api/treasury');
  
  output += `\n**Treasury mounted in server.js:** ${treasuryMounted ? '✅' : '❌'}\n`;
  output += `**Treasury mounted in app.js:** ${treasuryMountedApp ? '✅' : '❌'}\n`;
  
  if (treasuryMountedApp) {
    output += `\n⚠️ **Note:** app.js mounts treasury at \`/api/modules/treasury/routes\` which is different from server.js\n`;
  }
} else {
  output += 'Treasury module routes directory not found.\n';
}

// Critical missing routes
output += '\n---\n\n';
output += '## Critical Missing Routes\n\n';

const criticalRoutes = [
  { prefix: '/api/users', file: 'users.routes.js', importance: 'HIGH - User management' },
  { prefix: '/api/user-settings', file: 'userSettings.routes.js', importance: 'HIGH - User preferences' },
  { prefix: '/api/events', file: 'events.routes.js', importance: 'HIGH - Event management' },
  { prefix: '/api/department', file: 'department.routes.js', importance: 'HIGH - Department management' },
  { prefix: '/api/department-categories', file: 'department-categories.routes.js', importance: 'MEDIUM - Department categories' },
  { prefix: '/api/palettes', file: 'palette.routes.js', importance: 'MEDIUM - UI theming' },
  { prefix: '/api/comments', file: 'comments.routes.js', importance: 'MEDIUM - Comments system' },
  { prefix: '/api/field-permissions', file: 'fieldPermissions.routes.js', importance: 'MEDIUM - Field-level permissions' },
  { prefix: '/api/audit-logs', file: 'audit-logs.routes.js', importance: 'HIGH - Audit trail' },
  { prefix: '/api/collections', file: 'collections.routes.js', importance: 'MEDIUM - Collections' },
];

output += '| Route | File | In server.js | In app.js | Importance |\n';
output += '|-------|------|-------------|----------|------------|\n';

criticalRoutes.forEach(route => {
  const inServer = serverMounted.some(r => r.prefix === route.prefix);
  const inApp = appMounted.some(r => r.prefix === route.prefix);
  const fileExists = routeFiles.includes(route.file);
  
  output += `| \`${route.prefix}\` | \`${route.file}\` | ${inServer ? '✅' : '❌'} | ${inApp ? '✅' : '❌'} | ${route.importance} ${!fileExists ? '(File missing)' : ''} |\n`;
});

output += '\n---\n\n';
output += '*This document is auto-generated by validate-route-mounting.js*\n';

// Write output
const outputPath = path.join(__dirname, '../../docs/route-mounting-validation.md');
fs.writeFileSync(outputPath, output);

console.log('Route mounting validation generated:', outputPath);
console.log('Routes in server.js:', serverMounted.length);
console.log('Routes in app.js:', appMounted.length);
console.log('Route files found:', routeFiles.length);
console.log('Critical missing from server.js:', criticalRoutes.filter(r => !serverMounted.some(s => s.prefix === r.prefix)).length);
