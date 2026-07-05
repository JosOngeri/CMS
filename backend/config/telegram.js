module.exports = {
  // Telegram API configuration
  apiTimeout: 30000, // 30 seconds
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxRetries: 3,
  retryDelay: 1000, // 1 second

  // Webhook configuration
  webhookPath: '/api/telegram/webhook',
  webhookMaxConnections: 100,

  // Cache configuration
  cacheExpirationHours: 24,
  cacheRefreshIntervalHours: 12,

  // Sync configuration
  defaultSyncIntervalHours: 1,
  maxPostsPerSync: 100,

  // Supported media types
  supportedMediaTypes: ['photo', 'video', 'document', 'audio', 'animation'],

  // Parse modes
  parseModes: ['HTML', 'Markdown', 'MarkdownV2'],
  defaultParseMode: 'HTML',
};