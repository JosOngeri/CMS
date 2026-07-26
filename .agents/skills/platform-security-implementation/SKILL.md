---
name: platform-security-implementation
description: Implement secure platform-administration authentication, authorization, audit logging, and module-safe API boundaries in KMainCMS.
---

# Platform Security Implementation

1. Inspect existing authentication middleware, database migration conventions, route mounting, and module APIs before editing.
2. Use bcrypt password hashes and required environment-provided JWT secrets; never retain fallback credentials or secrets.
3. Enforce explicit permissions per platform endpoint and apply least privilege.
4. Record platform mutations in audit logs without logging credentials or tokens.
5. Maintain module isolation: platform code obtains tenant-owned metrics via documented APIs or aggregation contracts, never direct tenant-table queries.
6. Add focused unit/integration tests and run the relevant test suite before completion.
