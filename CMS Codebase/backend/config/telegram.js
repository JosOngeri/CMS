module.exports = {
  // Telegram API configuration
  apiTimeout: parseInt(process.env.TELEGRAM_API_TIMEOUT || '30000', 10), // 30 seconds
  maxFileSize: parseInt(process.env.TELEGRAM_MAX_FILE_SIZE || '52428800', 10), // 50MB
  maxRetries: parseInt(process.env.TELEGRAM_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.TELEGRAM_RETRY_DELAY || '1000', 10), // 1 second

  // Webhook configuration
  webhookPath: process.env.TELEGRAM_WEBHOOK_PATH || '/api/telegram/webhook',
  webhookMaxConnections: parseInt(process.env.TELEGRAM_WEBHOOK_MAX_CONNECTIONS || '100', 10),

  // Cache configuration
  cacheExpirationHours: parseInt(process.env.TELEGRAM_CACHE_EXPIRATION_HOURS || '24', 10),
  cacheRefreshIntervalHours: parseInt(process.env.TELEGRAM_CACHE_REFRESH_HOURS || '12', 10),

  // Sync configuration
  defaultSyncIntervalHours: parseInt(process.env.TELEGRAM_SYNC_INTERVAL_HOURS || '1', 10),
  maxPostsPerSync: parseInt(process.env.TELEGRAM_MAX_POSTS_PER_SYNC || '100', 10),

  // Supported media types
  supportedMediaTypes: ['photo', 'video', 'document', 'audio', 'animation'],

  // Parse modes
  parseModes: ['HTML', 'Markdown', 'MarkdownV2'],
  defaultParseMode: process.env.TELEGRAM_DEFAULT_PARSE_MODE || 'HTML',
};