const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');
const controllersDir = path.join(__dirname, '../controllers');
const helpersDir = path.join(__dirname, '../helpers');
const middlewareDir = path.join(__dirname, '../middleware');
const repositoriesDir = path.join(__dirname, '../repositories');
const servicesDir = path.join(__dirname, '../services');
const modulesDir = path.join(__dirname, '../modules');

let output = '# KMainCMS - Routes and Database Calls Documentation\n\n';
output += '**Generated:** ' + new Date().toISOString().split('T')[0] + '\n\n';
output += '---\n\n';

// Function to recursively get all JS files
function getJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Extract routes from a file
function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      line: content.substring(0, match.index).split('\n').length
    });
  }
  return routes;
}

// Extract DB calls from a file
function extractDbCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const calls = [];
  const dbRegex = /pool\.query\s*\(/g;
  let match;
  while ((match = dbRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const lines = content.split('\n');
    const line = lines[lineNum - 1];
    calls.push({
      line: lineNum,
      code: line.trim()
    });
  }
  return calls;
}

// Process routes
output += '## API Routes\n\n';
output += '### Main Routes Files\n\n';

const routeFiles = getJsFiles(routesDir);
routeFiles.forEach(filePath => {
  const relativePath = path.relative(path.join(__dirname, '../'), filePath);
  const routes = extractRoutes(filePath);
  if (routes.length > 0) {
    output += `#### ${relativePath}\n\n`;
    routes.forEach(route => {
      output += `- **${route.method}** \`${route.path}\` (line ${route.line})\n`;
    });
    output += '\n';
  }
});

// Process treasury module routes
const treasuryRoutesDir = path.join(modulesDir, 'treasury/routes');
if (fs.existsSync(treasuryRoutesDir)) {
  output += '### Treasury Module Routes\n\n';
  const treasuryRouteFiles = getJsFiles(treasuryRoutesDir);
  treasuryRouteFiles.forEach(filePath => {
    const relativePath = path.relative(path.join(__dirname, '../'), filePath);
    const routes = extractRoutes(filePath);
    if (routes.length > 0) {
      output += `#### ${relativePath}\n\n`;
      routes.forEach(route => {
        output += `- **${route.method}** \`${route.path}\` (line ${route.line})\n`;
      });
      output += '\n';
    }
  });
}

// Process DB calls
output += '---\n\n';
output += '## Database Calls\n\n';

const dbDirs = [
  { dir: controllersDir, label: 'Controllers' },
  { dir: helpersDir, label: 'Helpers' },
  { dir: middlewareDir, label: 'Middleware' },
  { dir: repositoriesDir, label: 'Repositories' },
  { dir: servicesDir, label: 'Services' },
  { dir: routesDir, label: 'Routes with Inline Queries' }
];

dbDirs.forEach(({ dir, label }) => {
  if (fs.existsSync(dir)) {
    output += `### ${label}\n\n`;
    const files = getJsFiles(dir);
    files.forEach(filePath => {
      const relativePath = path.relative(path.join(__dirname, '../'), filePath);
      const calls = extractDbCalls(filePath);
      if (calls.length > 0) {
        output += `#### ${relativePath}\n\n`;
        calls.forEach(call => {
          output += `- Line ${call.line}: \`${call.code.substring(0, 100)}${call.code.length > 100 ? '...' : ''}\`\n`;
        });
        output += '\n';
      }
    });
  }
});

// Process modules for DB calls
if (fs.existsSync(modulesDir)) {
  output += '### Modules\n\n';
  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  moduleDirs.forEach(moduleName => {
    const modulePath = path.join(modulesDir, moduleName);
    const subdirs = ['controllers', 'repositories', 'services', 'routes'];
    subdirs.forEach(subdir => {
      const subPath = path.join(modulePath, subdir);
      if (fs.existsSync(subPath)) {
        const files = getJsFiles(subPath);
        files.forEach(filePath => {
          const relativePath = path.relative(path.join(__dirname, '../'), filePath);
          const calls = extractDbCalls(filePath);
          if (calls.length > 0) {
            output += `#### ${relativePath}\n\n`;
            calls.forEach(call => {
              output += `- Line ${call.line}: \`${call.code.substring(0, 100)}${call.code.length > 100 ? '...' : ''}\`\n`;
            });
            output += '\n';
          }
        });
      }
    });
  });
}

output += '---\n\n';
output += '*This document is auto-generated by extract-routes-and-db.js*\n';

// Write output
const outputPath = path.join(__dirname, '../../docs/routes-and-db-calls.md');
fs.writeFileSync(outputPath, output);

console.log('Documentation generated:', outputPath);
console.log('Total routes found:', routeFiles.reduce((sum, f) => sum + extractRoutes(f).length, 0));
