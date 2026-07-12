# KMainCMS Server Restart Log

**Date:** 2026-06-23  
**Branch:** `refactor/PHASE4_20260622_1931`  
**User request:** Kill any running instance of the webapp and start the servers again.

## Actions Performed

1. Identified the running application processes:
   - Backend `kmaincms` managed by PM2 (PID 34712), listening on `0.0.0.0:5005`.
   - Frontend Vite dev server (PID 29264 / 30276), listening on `[::1]:5180`.
   - PM2 daemon also running (PID 25076).
   - Apache `httpd.exe` was listening on `0.0.0.0:8080` but is unrelated to this project; left running.

2. Stopped the application:
   - `pm2 kill` to stop the backend, all PM2-managed processes, and the PM2 daemon.
   - `taskkill` on the frontend npm/Vite process tree.

3. Verified no app processes were left:
   - No listeners on `:5005` or `:5180`.
   - No `node.exe` processes remained.

4. Restarted the servers:
   - Started backend from the `backend` directory with PM2:
     ```powershell
     cd "D:\Kiserian Main SDA Communications Department\KMainCMS\backend"
     pm2 start ecosystem.config.cjs
     ```
   - Started frontend Vite dev server from the project root:
     ```powershell
     npm run dev --workspace=frontend
     ```

5. Verified both servers are running:
   - Backend listening on `0.0.0.0:5005` (PID 5952, PM2 status `online`).
   - Frontend listening on `[::1]:5180`.

## Notes

- The backend log shows Redis connection failures (`Redis reconnection failed after maximum attempts`). The server continues to run without the Redis cache, but Redis should be started if caching is required.
- The frontend Vite dev server proxies `/api` and other backend routes to `http://localhost:5005`.

## Next Steps / Suggested Commands

1. Open the frontend in the browser: `http://localhost:5180`
2. If Redis is needed, start the Redis service before restarting the backend.
3. Monitor the backend logs: `pm2 logs kmaincms`
