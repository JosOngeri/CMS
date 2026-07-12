# Phase 18 — ENVIRONMENT AND DEPLOYMENT
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 18.1 Environment Variables

- [ ] 🔴 Add `DB_CA_CERT` to `.env.example` — required for the SSL fix in `database.js`
- [ ] 🟠 Add `REDIS_URL` to `.env.example` — required for Redis rate limiter fix
- [ ] 🟠 Add `TELEGRAM_BOT_TOKEN` to `.env.example`
- [ ] 🟠 Add `TELEGRAM_WEBHOOK_SECRET` to `.env.example`
- [ ] 🟠 Add `GEMINI_API_KEY` to `.env.example`
- [ ] 🟠 Add `TRUSTED_IPS` to `.env.example` with a comment explaining format (`comma-separated IP list`)
- [ ] 🟠 Add `TREASURY_ROLES` to `.env.example` with default value
- [ ] 🟠 Add `DEV_IP_ADDRESS` to `.env.example` to replace hardcoded IP in `app.js`
- [ ] 🟠 Add `BASE_DOMAIN` to `.env.example` to replace hardcoded `kmaincms.org`
- [ ] 🟡 Add `CSRF_MAX_AGE` and `CSRF_COOKIE_NAME` to `.env.example`
- [ ] 🟡 Add `AUTH_CACHE_SIZE` to `.env.example`

### 18.2 Docker and CI

- [ ] 🟡 Add a Docker health check in `Dockerfile` that hits `GET /api/health` every 30 seconds
- [ ] 🟡 Add a GitHub Actions workflow step that runs `npm test` before allowing merges to main
- [ ] 🟡 Add a `docker-compose.yml` Redis service for local development rate-limiting and caching
- [ ] 🟢 Add `NODE_ENV` enforcement in start scripts: `production` start must not allow `NODE_ENV=development`

### 18.3 Database Migrations in CI

- [ ] 🟠 Add a migration runner step to `reset-db.js` that executes all SQL files in `backend/migrations/` in numeric order after `complete_schema.sql`
- [ ] 🟡 Add a migration version table `db_migrations(filename, applied_at)` and skip already-applied migrations
- [ ] 🟡 Add a `npm run migrate` script that runs only unapplied migrations (for production deployments without a full reset)
