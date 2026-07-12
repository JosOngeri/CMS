module.exports = {
  apps: [{
    name: 'kmaincms',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    env: {
      PORT: 5005
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    kill_timeout: 2000,
    // Phase 7: Enhanced monitoring
    watch_delay: 1000,
    ignore_watch: ['node_modules', 'logs', '.git'],
    // Phase 7: Memory optimization
    node_args: '--max-old-space-size=512'
  }]
};
