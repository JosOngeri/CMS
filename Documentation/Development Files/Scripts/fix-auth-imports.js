const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend', 'routes');

// Get all route files
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

let fixedCount = 0;

routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace import statement
  if (content.includes("const { authenticate } = require('../middleware/auth')")) {
    content = content.replace(
      "const { authenticate } = require('../middleware/auth')",
      "const { authenticateToken } = require('../middleware/auth')"
    );
    modified = true;
  }

  // Replace usage in router.use
  if (content.includes('router.use(authenticate)')) {
    content = content.replace(/router\.use\(authenticate\)/g, 'router.use(authenticateToken)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`✅ Fixed: ${file}`);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} route files`);
