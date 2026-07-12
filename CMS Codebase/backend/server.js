require('dotenv').config();

const { validateEnv } = require('./config/env-validation');

// Validate environment variables before starting
validateEnv();

const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./config/logging');
const reportScheduler = require('./helpers/reportScheduler');
const { initActivityWebSocket } = require('./helpers/websocket');
const MessagingService = require('./services/MessagingService');
// Redis cache disabled - using in-memory fallback
// const redisCache = require('./services/redisCache');
const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 5005;

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Define allowed origins for Socket.io
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  process.env.PRODUCTION_FRONTEND_URL,
  'http://localhost:5180',
].filter(Boolean);

// Initialize Socket.io with restricted CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : (process.env.NODE_ENV === 'production' ? false : '*'),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize MessagingService with Socket.io instance
MessagingService.initialize(io);

// Link SmsHub to Socket.io
try {
  const smsHub = require('./services/SmsHub');
  smsHub.setIo(io);
} catch (error) {
  logger.warn('Failed to initialize SmsHub:', error.message);
}

// Link NotificationService to Socket.io (Phase 10)
try {
  const notificationService = require('./services/notificationService');
  notificationService.setIo(io);
} catch (error) {
  logger.warn('Failed to initialize NotificationService:', error.message);
}

// Link HybridSMS to Socket.io (Phase 9)
try {
  const hybridSMS = require('./services/hybridSMS');
  hybridSMS.setIo(io);
} catch (error) {
  logger.warn('Failed to initialize HybridSMS:', error.message);
}



io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('register_relay', (data) => {
    const { churchId } = data;
    socket.join(`relay:${churchId}`);
    logger.info(`Relay registered for church: ${churchId}`);
  });

  socket.on('join_room', (data) => {
    const { roomId } = data;
    socket.join(`room:${roomId}`);
    logger.info(`User joined chat room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Store io in app for use in controllers
app.set('io', io);

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Redis cache disabled - skipping initialization
    logger.info('Redis cache disabled, using in-memory fallback');

    // Initialize report scheduler after server starts
    reportScheduler.init().catch(error => {
      logger.error('Failed to initialize report scheduler:', error);
    });

    // Initialize WebSocket server
    initActivityWebSocket(server);

    // Notify PM2 that the server is ready (when running under PM2)
    if (typeof process.send === 'function') {
      process.send('ready');
    }
  });
}

const { pool } = require('./config/database');

// Graceful Shutdown (Phase 7 - Enhanced)
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down server...`);
  
  // Set timeout for force shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.warn('Force shutting down after timeout...');
    process.exit(1);
  }, 10000);

  try {
    // Close HTTP server
    server.close(async () => {
      logger.info('HTTP server closed.');
      
      try {
        // Close database connections
        await pool.end();
        logger.info('Database pool closed.');
        
        // Redis cache disabled - skipping disconnect
        logger.info('Redis cache disabled, skipping disconnect');
        
        // Clear force shutdown timeout
        clearTimeout(forceShutdownTimeout);
        
        logger.info('Graceful shutdown complete.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
      }
    });
  } catch (err) {
    logger.error('Error closing server:', err);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
};

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);
  logger.error('Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  logger.error('Shutting down due to uncaught exception');
  process.exit(1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server, io };
