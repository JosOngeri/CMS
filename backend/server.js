/**
 * Process entry point — validates env, builds the HTTP server, attaches Socket.io, wires services, graceful shutdown.
 * @exports {app, server, io}
 * @deps app.js, config/env-validation, helpers/websocket, services/{MessagingService,SmsHub,notificationService,hybridSMS}
 * @known FIXED: default-namespace sockets now require JWT (socket.user set at handshake);
 *        relay/room joins are church-namespaced, never client-supplied; auto-joins
 *        user:{id}/church:{id} so MessagingService.sendNotification/sendActivityUpdate deliver.
 *        The separate ws server on /ws (helpers/websocket.js) is path-scoped — no upgrade
 *        conflict with socket.io's /socket.io/ path; it is JWT-authenticated too.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

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
const { verifyAccessToken } = require('./helpers/security');
const { pool } = require('./config/database');
// Redis cache disabled - using in-memory fallback
// const redisCache = require('./services/redisCache');

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

// Gateway registry — live JOSms relay presence (truthfulness gate for sends)
const gatewayRegistry = require('./services/gatewayRegistry');
gatewayRegistry.setIo(io);

// Initialize SMS Push Controller for Android app sync
try {
  const smsPushController = require('./controllers/smsPush.controller');
  smsPushController.initializeWebSocket(io);
  logger.info('SMS Push Controller initialized for Android app sync');
} catch (error) {
  logger.warn('Failed to initialize SMS Push Controller:', error.message);
}



// Authenticate every socket on the default namespace — verifies JWT from
// handshake.auth.token, resolves church + active status from DB.
// io.use applies to '/' only; namespaced endpoints (e.g. /api/sms/sync/push)
// run their own auth middleware and are unaffected.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication token required'));

    const decoded = verifyAccessToken(token);
    if (!decoded?.userId) return next(new Error('Invalid token'));

    const result = await pool.query(
      'SELECT church_id FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
      [decoded.userId]
    );
    if (result.rows.length === 0) return next(new Error('User not found'));

    socket.user = {
      userId: decoded.userId,
      churchId: result.rows[0].church_id,
      roles: decoded.roles || []
    };
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const { userId, churchId } = socket.user;
  logger.info(`Socket connected: ${socket.id} user=${userId} church=${churchId}`);

  // Personal + church rooms — activates MessagingService.sendNotification/sendActivityUpdate
  socket.join(`user:${userId}`);
  if (churchId) socket.join(`church:${churchId}`);

  socket.on('register_relay', (data) => {
    // Relay room is always the authenticated user's own church — never client-supplied
    if (!churchId) return;
    socket.join(`relay:${churchId}`);
    socket.isRelay = true;
    gatewayRegistry.register(churchId, socket.id, {
      ...(data || {}),
      userId,
    }).catch(err => logger.error('relay register failed:', err.message));
    logger.info(`Relay registered for church: ${churchId} device=${data?.deviceId || socket.id}`);
    socket.emit('relay_registered', { churchId, socketId: socket.id });
  });

  // Lightweight socket heartbeat — battery/signal/last-seen without an HTTP hop.
  socket.on('gateway_heartbeat', (data) => {
    if (!churchId || !data?.deviceId) return;
    gatewayRegistry.heartbeat(churchId, data.deviceId, {
      ...data,
      userId,
    }).catch(err => logger.error('gateway heartbeat failed:', err.message));
  });

  socket.on('join_room', (data) => {
    const { roomId } = data || {};
    if (!roomId || !churchId) return;
    // Church-namespaced — prevents cross-tenant room snooping on guessable ids
    socket.join(`room:${churchId}:${roomId}`);
    logger.info(`User joined chat room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    if (socket.isRelay) {
      gatewayRegistry.unregister(churchId, socket.id)
        .catch(err => logger.error('relay unregister failed:', err.message));
      logger.info(`Relay disconnected for church: ${churchId}`);
    }
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

    // Expire temporary department leadership grants — on boot and daily
    const { expireTemporaryGrants } = require('./helpers/departmentLeadership');
    const sweepExpired = () => expireTemporaryGrants()
      .then(n => { if (n) logger.info(`Expired ${n} temporary department grants`); })
      .catch(e => logger.error('Temporary grant sweep failed:', e));
    sweepExpired();
    setInterval(sweepExpired, 24 * 60 * 60 * 1000).unref();

    // Platform scheduler — alert rules (5min), dunning (6h), backups (daily).
    require('./services/platformScheduler.service').start();

    // Scheduled-SMS sweeper — dispatches sms_logs whose schedule time arrived.
    // 60s cadence; the claim UPDATE is atomic so multi-node is safe.
    const smsController = require('./controllers/sms.controller');
    setInterval(() => {
      smsController.processDueScheduledSms()
        .catch(e => logger.error('Scheduled SMS sweep failed:', e.message));
    }, 60 * 1000).unref();

    // 8.3 Record this boot as a deploy so operators can see history and
    // know which commit to roll back to. No-op if unchanged.
    require('./services/platformDeploys.service').recordBoot()
      .catch(e => logger.error('Deploy record failed:', e));

    // Initialize WebSocket server
    initActivityWebSocket(server);

    // Notify PM2 that the server is ready (when running under PM2)
    if (typeof process.send === 'function') {
      process.send('ready');
    }
  });
}

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
  logger.error({ err: error, message: error.message, stack: error.stack }, 'Uncaught Exception');
  logger.error('Shutting down due to uncaught exception');
  process.exit(1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server, io };
