const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 5000;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

// Service URLs
const services = {
  'auth': process.env.AUTH_SERVICE_URL || 'http://auth-service:5001',
  'content': process.env.CONTENT_SERVICE_URL || 'http://content-service:5002',
  'departments': process.env.DEPARTMENTS_SERVICE_URL || 'http://departments-service:5003',
  'gallery': process.env.GALLERY_SERVICE_URL || 'http://gallery-service:5004',
  'treasury': process.env.TREASURY_SERVICE_URL || 'http://treasury-service:5005',
  'payments': process.env.PAYMENTS_SERVICE_URL || 'http://payments-service:5006',
  'sms': process.env.SMS_SERVICE_URL || 'http://sms-service:5007',
  'documents': process.env.DOCUMENTS_SERVICE_URL || 'http://documents-service:5008',
  'approvals': process.env.APPROVALS_SERVICE_URL || 'http://approvals-service:5009',
  'notifications': process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:5010',
  'settings': process.env.SETTINGS_SERVICE_URL || 'http://settings-service:5011',
  'reports': process.env.REPORTS_SERVICE_URL || 'http://reports-service:5012',
  'analytics': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:5013',
  'search': process.env.SEARCH_SERVICE_URL || 'http://search-service:5014',
  'security': process.env.SECURITY_SERVICE_URL || 'http://security-service:5015',
  'mobile': process.env.MOBILE_SERVICE_URL || 'http://mobile-service:5016',
  'telegram': process.env.TELEGRAM_SERVICE_URL || 'http://telegram-service:5017'
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Gateway is running', services: Object.keys(services) });
});

// Proxy configuration
const createProxy = (target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${target}`]: '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`Proxying ${req.method} ${req.url} to ${target} service`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(500).json({ error: 'Service unavailable' });
    }
  });
};

// Route to services
Object.keys(services).forEach(service => {
  app.use(`/api/${service}`, createProxy(services[service]));
});

// Fallback for unknown routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Service not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Available services: ${Object.keys(services).join(', ')}`);
});