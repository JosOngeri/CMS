# Phase 15 — DOCUMENT MANAGEMENT
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 15.1 Document Upload and Approval

- [x] 🟠 Verify `backend/routes/documents.routes.js` uses `uploadLimiter` and `multer` middleware correctly
- [x] 🟠 Add file type validation on upload: allow only `pdf`, `doc`, `docx`, `xlsx`, `pptx` — reject other types
- [x] 🟠 Add file size limit: reject files > 25MB before writing to disk/cloud storage
- [x] 🟠 Add `church_id` to all document queries so documents from other churches are invisible
- [x] 🟠 Implement `POST /api/document-approval/:id/approve` and `/:id/reject` — verify they create an audit entry
- [x] 🟡 Add document versioning: on `PUT /api/documents/:id`, save the old content to `document_versions` table before overwriting
- [x] 🟡 Add document search: add a full-text search index on `title` and `content` using PostgreSQL `to_tsvector`
