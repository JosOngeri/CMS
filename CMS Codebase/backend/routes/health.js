const express = require('express');
const path = require('path');
const router = express.Router();
const packageJson = require(path.join(__dirname, '../../package.json'));

// Overall health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const { pool } = require('../config/database');
    await pool.query('SELECT 1');
    
    // Get memory usage (Phase 7)
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memoryTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: packageJson.version,
      database: 'connected',
      api: 'SDA Church Kiserian Main API',
      memory: {
        heapUsed: `${memoryUsedMB}MB`,
        heapTotal: `${memoryTotalMB}MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Database health check endpoint (Phase 7)
router.get('/db', async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const startTime = Date.now();
    
    await pool.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    // Get connection pool stats
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      pool: {
        total: totalCount,
        idle: idleCount,
        waiting: waitingCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Redis health check endpoint (Phase 7)
router.get('/redis', async (req, res) => {
  try {
    const redisCache = require('../services/redisCache');
    const startTime = Date.now();
    
    await redisCache.ping();
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      connected: true
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      connected: false
    });
  }
});

// Memory health check endpoint (Phase 7)
router.get('/memory', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memoryTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    const memoryRSSMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
    const memoryExternalMB = (memoryUsage.external / 1024 / 1024).toFixed(2);
    
    // Memory threshold check (500MB limit)
    const memoryThreshold = 500;
    const isMemoryHealthy = parseFloat(memoryRSSMB) < memoryThreshold;
    
    res.json({
      status: isMemoryHealthy ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: `${memoryUsedMB}MB`,
        heapTotal: `${memoryTotalMB}MB`,
        rss: `${memoryRSSMB}MB`,
        external: `${memoryExternalMB}MB`
      },
      threshold: `${memoryThreshold}MB`,
      withinLimit: isMemoryHealthy
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
