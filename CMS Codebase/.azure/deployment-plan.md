# Azure Deployment Plan - KMainCMS (MVP Workflow)

## Status
- [x] Phase 1: Planning
- [ ] Phase 2: Core Migration (Landing, Login, Admin Dashboard) - **IN PROGRESS**
- [ ] Phase 3: Database & Feature Expansion
- [ ] Ready for Validation

## Workflow Strategy
1. **Local Development**: All production-ready code is prepared in the `D:/VIbeCode/KMainCMS/MVP` directory.
2. **GitHub Integration**: Changes are committed and pushed from the `MVP` directory (or merged to the main branch) to the GitHub repository.
3. **Azure Deployment**: Azure App Service is configured with a GitHub Action workflow to automatically deploy on push.

## Phase 1: Planning (Completed)
1. **Analyze Workspace**: Monorepo with Node.js/Express backend and React/Vite frontend.
2. **Architecture Selection**: Phased migration to Azure App Service (Linux) + PostgreSQL Flexible Server.
3. **Cost Optimization**: Using In-memory caching (`node-cache`) for MVP phase.

## Phase 2: Core Migration (Current)
1. **Prepare MVP Codebase (`/MVP`)**:
    - **Controllers**: Copy `auth.controller.js`. Create `stub.controller.js` for all other features.
    - **Routes**: Configure `auth.routes.js`. Set all other routes (Announcements, Members, Financials, etc.) to use `stub.controller.js`.
    - **Frontend**: Copy only `Landing`, `Login`, and `Admin Dashboard` components.
2. **Graceful Degradation**:
    - Stub controllers return `{ success: true, data: [], message: "Feature coming in Phase 3" }` to prevent frontend crashes (500 errors).
3. **Database Initialization (Core Only)**:
    - Target: `users`, `roles`, `user_roles`, `sessions`.
    - Seed: Initial Admin user (`admin@kmaincms.org` / `admin123`).
    - Use `initDb()` logic in `MVP/backend/config/database.js` restricted to core tables.
4. **App Service Configuration**:
    - `NODE_ENV=production`
    - `PORT=5005`
    - Startup: `node backend/server.js`

## Phase 3: Database & Feature Expansion
1. **Full Schema Migration**: Migrate `members`, `departments`, `financials`, `announcements`.
2. **Feature Implementation**: Replace stubs with actual logic from the main `backend/controllers`.
3. **Advanced Integration**: Socket.io for notifications, Managed Identity for DB, and full security hardening.

## Execution Steps (Phase 2)
1. [x] Create `MVP/backend/controllers/stub.controller.js`.
2. [ ] Update `MVP/backend/app.js` to point all non-core routes to the stub controller.
3. [ ] Verify `MVP/backend/config/database.js` only initializes core tables.
4. [ ] Build frontend and move to `MVP/frontend/dist` (if not already handled by deployment script).
5. [ ] Commit `MVP` changes to GitHub to trigger Azure Deployment.
