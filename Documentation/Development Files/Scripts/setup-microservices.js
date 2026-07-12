const fs = require('fs');
const path = require('path');

const services = [
  { name: 'auth-service', port: 5001, files: ['auth.controller.js', 'auth.routes.js'] },
  { name: 'content-service', port: 5002, files: ['content.controller.js', 'content.routes.js'] },
  { name: 'departments-service', port: 5003, files: ['departments.controller.js', 'departments.routes.js'] },
  { name: 'gallery-service', port: 5004, files: ['gallery.controller.js', 'gallery.routes.js'] },
  { name: 'treasury-service', port: 5005, files: ['treasury.controller.js', 'treasury.routes.js'] },
  { name: 'payments-service', port: 5006, files: ['payments.controller.js', 'payments.routes.js'] },
  { name: 'sms-service', port: 5007, files: ['sms.controller.js', 'sms.routes.js'] },
  { name: 'documents-service', port: 5008, files: ['documents.controller.js', 'documents.routes.js'] },
  { name: 'approvals-service', port: 5009, files: ['approvals.controller.js', 'approvals.routes.js'] },
  { name: 'notifications-service', port: 5010, files: ['notifications.controller.js', 'notifications.routes.js'] },
  { name: 'settings-service', port: 5011, files: ['settings.controller.js', 'settings.routes.js'] },
  { name: 'reports-service', port: 5012, files: ['reports.controller.js', 'reports.routes.js'] },
  { name: 'analytics-service', port: 5013, files: ['analytics.controller.js', 'analytics.routes.js'] },
  { name: 'search-service', port: 5014, files: ['search.controller.js', 'search.routes.js'] },
  { name: 'security-service', port: 5015, files: ['security.controller.js', 'security.routes.js'] },
  { name: 'mobile-service', port: 5016, files: ['mobile.controller.js', 'mobile.routes.js'] },
  { name: 'telegram-service', port: 5017, files: ['telegram.controller.js', 'telegram.routes.js'] }
];

const backendPath = path.join(__dirname, '..', 'backend');
const servicesPath = path.join(__dirname, '..');

// Create service directories and files
services.forEach(service => {
  const servicePath = path.join(servicesPath, 'services', service.name);
  
  // Create service directory
  if (!fs.existsSync(servicePath)) {
    fs.mkdirSync(servicePath, { recursive: true });
    console.log(`Created directory: ${service.name}`);
  }

  // Create package.json
  const packageJson = {
    name: service.name,
    version: '1.0.0',
    description: `${service.name} for KMainCMS`,
    main: 'server.js',
    scripts: {
      start: 'node server.js',
      dev: 'nodemon server.js'
    },
    dependencies: {
      express: '^4.18.2',
      pg: '^8.11.0',
      dotenv: '^16.0.3',
      cors: '^2.8.5',
      helmet: '^7.0.0',
      winston: '^3.11.0',
      'express-validator': '^7.0.1'
    }
  };

  fs.writeFileSync(
    path.join(servicePath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create Dockerfile
  const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE ${service.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${service.port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]`;

  fs.writeFileSync(path.join(servicePath, 'Dockerfile'), dockerfile);

  // Create server.js
  const serverJs = `require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || ${service.port};
const SERVICE_NAME = process.env.SERVICE_NAME || '${service.name}';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info({
    service: SERVICE_NAME,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: \`\${SERVICE_NAME} is running\`,
    service: SERVICE_NAME,
    port: PORT
  });
});

// Import and use routes
try {
  const router = require('./routes');
  app.use('/api', router);
  logger.info('Routes loaded successfully');
} catch (error) {
  logger.warn('No routes file found, running with health check only');
  logger.error(error.message);
  
  // Add basic routes if routes file fails
  app.get('/api', (req, res) => {
    res.json({ service: SERVICE_NAME, status: 'running' });
  });
}

// Error handling
app.use((err, req, res, next) => {
  logger.error({
    service: SERVICE_NAME,
    error: err.message,
    stack: err.stack
  });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(\`\${SERVICE_NAME} running on port \${PORT}\`);
  logger.info(\`Environment: \${process.env.NODE_ENV || 'development'}\`);
});

module.exports = { app, pool };`;

  fs.writeFileSync(path.join(servicePath, 'server.js'), serverJs);

  // Copy controller and routes from backend
  const controllersDir = path.join(servicePath, 'controllers');
  const routesDir = path.join(servicePath, 'routes');
  const configDir = path.join(servicePath, 'config');
  const helpersDir = path.join(servicePath, 'helpers');
  const middlewareDir = path.join(servicePath, 'middleware');

  [controllersDir, routesDir, configDir, helpersDir, middlewareDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Copy controller
  if (service.files[0]) {
    const controllerSource = path.join(backendPath, 'controllers', service.files[0]);
    if (fs.existsSync(controllerSource)) {
      fs.copyFileSync(controllerSource, path.join(controllersDir, service.files[0]));
      console.log(`Copied controller: ${service.files[0]} to ${service.name}`);
    }
  }

  // Copy routes
  if (service.files[1]) {
    const routesSource = path.join(backendPath, 'routes', service.files[1]);
    if (fs.existsSync(routesSource)) {
      fs.copyFileSync(routesSource, path.join(routesDir, service.files[1]));
      console.log(`Copied routes: ${service.files[1]} to ${service.name}`);
    }
  }

  // Create routes/index.js to export the route
  const routesIndex = `const express = require('express');
const router = express.Router();

// Import the specific route file
try {
  const routeFile = require('./${service.files[1]}');
  router.use('/', routeFile);
} catch (error) {
  console.log('Using basic routes due to import error:', error.message);
  router.get('/', (req, res) => {
    res.json({ service: '${service.name}', status: 'running' });
  });
}

module.exports = router;`;
  fs.writeFileSync(path.join(routesDir, 'index.js'), routesIndex);

  // Copy shared files
  const sharedFiles = ['config/database.js', 'config/logging.js', 'middleware/auth.js', 'helpers/security.js'];
  sharedFiles.forEach(file => {
    const source = path.join(backendPath, file);
    if (fs.existsSync(source)) {
      const dest = path.join(servicePath, file);
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(source, dest);
    }
  });

  // Create .env file
  const envContent = `DATABASE_URL=postgresql://postgres:postgres@db:5432/kmaincms
NODE_ENV=production
PORT=${service.port}
SERVICE_NAME=${service.name}
JWT_SECRET=your-secret-key-change-in-production`;
  fs.writeFileSync(path.join(servicePath, '.env'), envContent);

  console.log(`✅ Created ${service.name} microservice`);
});

console.log('\\n🚀 Microservices setup complete!');
console.log('📝 Run: docker-compose -f docker-compose.microservices.yml up -d');
console.log('🌐 API Gateway: http://localhost:5000');
console.log('📊 Services:', services.map(s => `${s.name} (${s.port})`).join(', '));