# APPENDIX B — PHASE ORDER SUMMARY
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

| Phase | Focus | Risk if Skipped |
|-------|-------|-----------------|
| 1 | Runtime crash fixes | App crashes on those code paths |
| 2 | church_id isolation in repositories | Any user sees all churches' data |
| 3 | Controller authorization | Any user performs any action |
| 4 | Route security | Unauthenticated access to CMS, gallery, events |
| 5 | Schema fixes | Migrations never run; settings are global |
| 6 | Service bug fixes | Reconciliation crashes; memory leaks |
| 7 | Frontend hook fixes | Activity feed never loads; memory leaks |
| 8 | Frontend context fixes | CSRF not sent; no token refresh |
| 9 | Component fixes | Broken export; broken selection |
| 10 | Dashboard pages | Dashboards show stale/hardcoded data |
| 11 | SEO + Telegram | Broken Telegram integration |
| 12 | M-Pesa security | Webhook spoofing possible |
| 13 | Reports | Treasury reports return empty/wrong data |
| 14 | SMS | Bulk SMS to opt-out users |
| 15 | Documents | Upload with no type validation |
| 16 | Audit logging | No trail of who changed what |
| 17 | Testing | Regressions go undetected |
| 18 | Environment/Deploy | Config errors in production |
| 19 | Code quality | Technical debt compounds |
| 20 | Final verification | Unfixed issues shipped |
