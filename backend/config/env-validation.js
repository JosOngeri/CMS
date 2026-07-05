/**
 * Environment Variable Validation
 * Ensures all required environment variables are set and valid
 */

const requiredEnvVars = {
  // Database (PGHOST convention is used in production)
  PGHOST: 'Database host',
  PGPORT: 'Database port',
  PGDATABASE: 'Database name',
  PGUSER: 'Database user',
  PGPASSWORD: 'Database password',

  // Server
  PORT: 'Server port',
  NODE_ENV: 'Environment (development/production/test)',

  // JWT
  JWT_SECRET: 'JWT secret key',
  REFRESH_TOKEN_SECRET: 'Refresh token secret',

  // Session
  SESSION_SECRET: 'Session secret',

  // Security
  BCRYPT_ROUNDS: 'Bcrypt rounds'
};

const validateEnv = () => {
  const errors = [];

  // Check required variables
  for (const [varName, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName} (${description})`);
    }
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV) {
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(process.env.NODE_ENV)) {
      errors.push(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`);
    }
  }

  // Validate critical secrets are not default values
  const criticalSecrets = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'SESSION_SECRET', 'DB_PASSWORD'];
  const defaultPatterns = [
    'changeme',
    'your_',
    'CHANGE_THIS',
    'secret',
    'password'
  ];

  for (const secret of criticalSecrets) {
    const value = process.env[secret];
    if (value) {
      const isDefault = defaultPatterns.some(pattern =>
        value.toLowerCase().includes(pattern)
      );
      if (isDefault) {
        errors.push(`CRITICAL: ${secret} appears to be a default value. Please change it to a secure random string.`);
      }

      // Check minimum length (skip DB_PASSWORD in development)
      if (secret !== 'DB_PASSWORD' && value.length < 24) {
        errors.push(`WARNING: ${secret} is less than 24 characters. Consider using a longer secret for better security.`);
      }
    }
  }

  // Validate numeric values
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
    }
  }

  if (process.env.BCRYPT_ROUNDS) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS);
    if (isNaN(rounds) || rounds < 8 || rounds > 16) {
      errors.push(`Invalid BCRYPT_ROUNDS: ${process.env.BCRYPT_ROUNDS}. Must be a number between 8 and 16.`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment Validation Failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');

  // Log environment info (without secrets)
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Server Port: ${process.env.PORT}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`🔐 Bcrypt Rounds: ${process.env.BCRYPT_ROUNDS}`);
};

module.exports = { validateEnv };
