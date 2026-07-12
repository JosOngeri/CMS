# Phase 12 — M-Pesa and Payment Integration
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 12 — M-PESA AND PAYMENT INTEGRATION

### 12.1 M-Pesa Webhook Security

- [ ] 🔴 Add signature verification to `POST /api/mpesa/callback`: verify `X-Safaricom-Signature` header using Safaricom's public key before processing any callback data
- [ ] 🔴 Add `identityGuard` or IP whitelist to M-Pesa callback endpoint — only Safaricom IPs should be able to hit this endpoint
- [ ] 🟠 Store raw callback payload in `mpesa_raw_logs` table before processing so failed processing can be retried
- [ ] 🟠 Add idempotency: check `merchant_request_id` against existing records before inserting to prevent duplicate processing
- [ ] 🟡 Add M-Pesa STK push result handler: update payment status when push succeeds or fails

### 12.2 Payment Analytics

- [ ] 🟠 Implement `GET /api/payments/analytics` endpoint using real DB aggregations grouped by month
- [ ] 🟠 Implement `GET /api/payments/trends` endpoint returning 12-month giving trend data
- [ ] 🟡 Add `GET /api/payments/summary` breakdown by payment category (tithe, offering, building fund, etc.)
- [ ] 🟡 Implement refund flow: `POST /:paymentId/refund` → creates pending refund, `POST /refunds/:id/approve` → marks original payment as refunded and updates account balance
