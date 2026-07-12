# KMainCMS Module Integration Strategies

**Date:** 2026-06-22
**Project:** Kiserian Main SDA Church Management System
**Related:** MISSING_FUNCTIONALITIES_IMPORT_PLAN.md

---

## Integration Strategy Overview

This document provides detailed integration strategies for each module that needs enhancement or implementation. Each strategy follows the modular architecture principles defined in `.windsurfrules` and ensures proper API-based communication between modules.

---

## 1. TREASURY Module Integration Strategy

### Current State
- Basic account management
- Simple transaction tracking
- Basic budget structure

### Target State
- Full double-entry accounting system
- Chart of accounts with hierarchy
- Advanced financial reporting
- Bank reconciliation
- Project accounting
- Fixed asset tracking

### Database Schema Additions

#### New Tables

```sql
-- Chart of Accounts
CREATE TABLE chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
  parent_id INTEGER REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries
CREATE TABLE journal_entries (
  id SERIAL PRIMARY KEY,
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'posted', -- 'draft', 'posted', 'void'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES chart_of_accounts(id),
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funds
CREATE TABLE funds (
  id SERIAL PRIMARY KEY,
  fund_code VARCHAR(20) UNIQUE NOT NULL,
  fund_name VARCHAR(255) NOT NULL,
  fund_type VARCHAR(20) DEFAULT 'operating', -- 'operating', 'capital', 'restricted'
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fixed Assets
CREATE TABLE fixed_assets (
  id SERIAL PRIMARY KEY,
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50),
  purchase_date DATE,
  purchase_price NUMERIC,
  current_value NUMERIC,
  depreciation_method VARCHAR(20), -- 'straight_line', 'declining_balance'
  useful_life INTEGER, -- in years
  accumulated_depreciation NUMERIC DEFAULT 0,
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'disposed', 'sold'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank Reconciliations
CREATE TABLE bank_reconciliations (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES church_accounts(id),
  reconciliation_date DATE NOT NULL,
  statement_balance NUMERIC NOT NULL,
  book_balance NUMERIC NOT NULL,
  difference NUMERIC,
  reconciled_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reconciliation Items
CREATE TABLE reconciliation_items (
  id SERIAL PRIMARY KEY,
  reconciliation_id INTEGER REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id),
  item_type VARCHAR(20), -- 'outstanding', 'deposit_transit', 'bank_charge'
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Treasury Controller Enhancements

```javascript
// Chart of Accounts
GET    /api/treasury/accounts/chart          - Get chart of accounts
POST   /api/treasury/accounts/chart          - Create account
PUT    /api/treasury/accounts/chart/:id      - Update account
DELETE /api/treasury/accounts/chart/:id      - Delete account

// Journal Entries
GET    /api/treasury/journal-entries         - Get journal entries
POST   /api/treasury/journal-entries         - Create journal entry
PUT    /api/treasury/journal-entries/:id      - Update journal entry
POST   /api/treasury/journal-entries/:id/post - Post journal entry
DELETE /api/treasury/journal-entries/:id      - Delete journal entry

// Funds
GET    /api/treasury/funds                   - Get funds
POST   /api/treasury/funds                   - Create fund
PUT    /api/treasury/funds/:id               - Update fund
DELETE /api/treasury/funds/:id               - Delete fund

// Fixed Assets
GET    /api/treasury/fixed-assets            - Get fixed assets
POST   /api/treasury/fixed-assets            - Create fixed asset
PUT    /api/treasury/fixed-assets/:id        - Update fixed asset
DELETE /api/treasury/fixed-assets/:id        - Delete fixed asset
POST   /api/treasury/fixed-assets/:id/depreciate - Calculate depreciation

// Bank Reconciliation
GET    /api/treasury/reconciliations         - Get reconciliations
POST   /api/treasury/reconciliations         - Create reconciliation
PUT    /api/treasury/reconciliations/:id      - Update reconciliation
POST   /api/treasury/reconciliations/:id/complete - Complete reconciliation

// Financial Reports
GET    /api/treasury/reports/trial-balance   - Generate trial balance
GET    /api/treasury/reports/income-statement - Generate income statement
GET    /api/treasury/reports/balance-sheet   - Generate balance sheet
GET    /api/treasury/reports/fund-statement  - Generate fund statement
```

### Integration Points

#### With PAYMENTS Module
```javascript
// API Call from PAYMENTS to TREASURY
POST /api/treasury/journal-entries
{
  "entry_date": "2026-06-22",
  "description": "M-Pesa Payment - Member Contribution",
  "lines": [
    {
      "account_id": 101, // Cash account
      "debit_amount": 1000,
      "credit_amount": 0
    },
    {
      "account_id": 401, // Tithe income account
      "debit_amount": 0,
      "credit_amount": 1000
    }
  ]
}
```

#### With APPROVALS Module
```javascript
// Create approval request for large expenses
POST /api/approvals/requests
{
  "request_type": "expense",
  "module": "treasury",
  "amount": 50000,
  "description": "Building maintenance",
  "metadata": {
    "expense_id": 123,
    "category": "maintenance"
  }
}
```

### Frontend Components

```jsx
// Chart of Accounts Management
pages/treasury/ChartOfAccountsManagement.jsx

// Journal Entry Interface
pages/treasury/JournalEntries.jsx
components/treasury/JournalEntryForm.jsx

// Financial Reports
pages/treasury/FinancialReports.jsx
components/treasury/TrialBalance.jsx
components/treasury/IncomeStatement.jsx
components/treasury/BalanceSheet.jsx

// Bank Reconciliation
pages/treasury/BankReconciliation.jsx
components/treasury/ReconciliationForm.jsx

// Fixed Assets
pages/treasury/FixedAssets.jsx
components/treasury/AssetForm.jsx
components/treasury/DepreciationSchedule.jsx
```

---

## 2. PAYMENTS Module Integration Strategy

### Current State
- M-Pesa STK push integration
- Basic payment tracking
- Payment link generation

### Target State
- Complete refund workflow
- QR code generation and processing
- Payment analytics dashboard
- Payment categorization
- Integration with treasury

### Database Schema Additions

```sql
-- Refunds Table
CREATE TABLE refunds (
  id SERIAL PRIMARY KEY,
  refund_number VARCHAR(50) UNIQUE NOT NULL,
  original_payment_id INTEGER REFERENCES payments(id),
  amount NUMERIC NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Categories
CREATE TABLE payment_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  treasury_account_id INTEGER REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Analytics
CREATE TABLE payment_analytics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category_id INTEGER REFERENCES payment_categories(id),
  total_amount NUMERIC DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  average_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dispute Tracking
CREATE TABLE payment_disputes (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES payments(id),
  dispute_reason TEXT,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed'
  resolved_by INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```javascript
// Refunds
GET    /api/payments/refunds              - Get refunds
POST   /api/payments/refunds              - Create refund request
PUT    /api/payments/refunds/:id/approve  - Approve refund
PUT    /api/payments/refunds/:id/reject   - Reject refund
POST   /api/payments/refunds/:id/process  - Process refund

// QR Codes
POST   /api/payments/qrcode/generate      - Generate QR code
GET    /api/payments/qrcode/:id           - Get QR code details
POST   /api/payments/qrcode/:id/process   - Process QR payment

// Categories
GET    /api/payments/categories           - Get payment categories
POST   /api/payments/categories           - Create category
PUT    /api/payments/categories/:id       - Update category

// Analytics
GET    /api/payments/analytics            - Get payment analytics
GET    /api/payments/analytics/daily      - Daily analytics
GET    /api/payments/analytics/category   - Category analytics

// Disputes
GET    /api/payments/disputes             - Get disputes
POST   /api/payments/disputes             - Create dispute
PUT    /api/payments/disputes/:id/resolve - Resolve dispute
```

### Integration Points

#### With TREASURY Module
```javascript
// Auto-create journal entry on successful payment
POST /api/treasury/journal-entries
{
  "entry_date": "2026-06-22",
  "description": "M-Pesa Payment",
  "lines": [
    {
      "account_id": 101, // Cash
      "debit_amount": payment.amount,
      "credit_amount": 0
    },
    {
      "account_id": category.treasury_account_id,
      "debit_amount": 0,
      "credit_amount": payment.amount
    }
  ]
}
```

#### With APPROVALS Module
```javascript
// Refund approval workflow
POST /api/approvals/requests
{
  "request_type": "refund",
  "module": "payments",
  "amount": refund.amount,
  "description": refund.reason,
  "metadata": {
    "refund_id": refund.id,
    "original_payment_id": refund.original_payment_id
  }
}
```

### Frontend Components

```jsx
// Refund Management
pages/payments/RefundManagement.jsx
components/payments/RefundForm.jsx
components/payments/RefundApproval.jsx

// QR Code System
pages/payments/QRCodeGenerator.jsx
components/payments/QRCodeDisplay.jsx

// Analytics Dashboard
pages/payments/PaymentAnalytics.jsx
components/payments/AnalyticsCharts.jsx
components/payments/CategoryBreakdown.jsx

// Dispute Management
pages/payments/DisputeManagement.jsx
components/payments/DisputeForm.jsx
```

---

## 3. CONTENT Module Integration Strategy

### Current State
- Basic content CRUD
- Simple categorization
- Basic tagging

### Target State
- Version control with rollback
- Scheduled publishing
- Approval workflow integration
- Rich text editor backend
- Advanced search
- SEO management

### Database Schema Enhancements

```sql
-- Enhance existing content_revisions table
ALTER TABLE content_revisions ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;
ALTER TABLE content_revisions ADD COLUMN IF NOT EXISTS rollback_from_id INTEGER REFERENCES content_revisions(id);

-- Scheduled Publishing
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scheduled_unpublish_at TIMESTAMP;

-- Content Collaboration
CREATE TABLE content_collaborators (
  id SERIAL PRIMARY KEY,
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_item_id, user_id)
);

-- Content Comments
CREATE TABLE content_comments (
  id SERIAL PRIMARY KEY,
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  comment TEXT NOT NULL,
  parent_id INTEGER REFERENCES content_comments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Locking
CREATE TABLE content_locks (
  id SERIAL PRIMARY KEY,
  content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(content_item_id)
);
```

### API Endpoints

```javascript
// Version Control
GET    /api/content/:id/revisions           - Get content revisions
POST   /api/content/:id/revisions           - Create revision
POST   /api/content/:id/rollback/:revisionId - Rollback to revision

// Scheduled Publishing
PUT    /api/content/:id/schedule            - Schedule publishing
PUT    /api/content/:id/unpublish            - Unpublish content

// Collaboration
GET    /api/content/:id/collaborators        - Get collaborators
POST   /api/content/:id/collaborators        - Add collaborator
DELETE /api/content/:id/collaborators/:userId - Remove collaborator

// Comments
GET    /api/content/:id/comments             - Get comments
POST   /api/content/:id/comments             - Add comment
PUT    /api/content/:id/comments/:id         - Update comment
DELETE /api/content/:id/comments/:id         - Delete comment

// Locking
POST   /api/content/:id/lock                 - Lock content
DELETE /api/content/:id/lock                 - Unlock content
GET    /api/content/:id/lock-status          - Check lock status

// Advanced Search
GET    /api/content/search                   - Advanced search
GET    /api/content/search/full-text         - Full-text search
```

### Integration Points

#### With APPROVALS Module
```javascript
// Content approval workflow
POST /api/approvals/requests
{
  "request_type": "content_publish",
  "module": "content",
  "description": "Publish content: " + content.title,
  "metadata": {
    "content_id": content.id,
    "content_type": content.content_type
  }
}
```

#### With NOTIFICATIONS Module
```javascript
// Notify collaborators on changes
POST /api/notifications/send
{
  "recipients": collaborator_ids,
  "type": "content_update",
  "title": "Content Updated",
  "message": content.title + " has been updated",
  "metadata": {
    "content_id": content.id
  }
}
```

### Frontend Components

```jsx
// Version Control
components/content/VersionHistory.jsx
components/content/RollbackConfirmation.jsx

// Scheduled Publishing
components/content/SchedulePublish.jsx
components/content/PublishCalendar.jsx

// Collaboration
components/content/CollaboratorManager.jsx
components/content/CommentSystem.jsx

// Advanced Editor
components/content/AdvancedEditor.jsx
components/content/MediaLibrary.jsx
```

---

## 4. SMS Module Integration Strategy

### Current State
- Basic SMS sending
- Provider management

### Target State
- Template system with variables
- Bulk SMS campaigns
- Delivery tracking
- Automation rules
- Credit management

### Database Schema Additions

```sql
-- SMS Templates
CREATE TABLE sms_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB, -- Array of variable names
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Credits
CREATE TABLE sms_credits (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER REFERENCES sms_providers(id),
  balance INTEGER DEFAULT 0,
  last_recharge_at TIMESTAMP,
  low_balance_threshold INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Campaigns
CREATE TABLE sms_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  template_id INTEGER REFERENCES sms_templates(id),
  target_audience JSONB, -- Criteria for selecting recipients
  scheduled_for TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'failed'
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Automation Rules
CREATE TABLE sms_automation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trigger_module VARCHAR(50), -- 'payments', 'treasury', 'events', etc.
  trigger_event VARCHAR(50), -- 'payment_received', 'expense_approved', etc.
  template_id INTEGER REFERENCES sms_templates(id),
  conditions JSONB, -- Conditions for triggering
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Opt-out Management
CREATE TABLE sms_optouts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  opt_out_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```javascript
// Templates
GET    /api/sms/templates               - Get templates
POST   /api/sms/templates               - Create template
PUT    /api/sms/templates/:id           - Update template
DELETE /api/sms/templates/:id           - Delete template
POST   /api/sms/templates/:id/preview   - Preview template with variables

// Credits
GET    /api/sms/credits                 - Get credit balances
POST   /api/sms/credits/recharge        - Recharge credits

// Campaigns
GET    /api/sms/campaigns               - Get campaigns
POST   /api/sms/campaigns               - Create campaign
PUT    /api/sms/campaigns/:id           - Update campaign
POST   /api/sms/campaigns/:id/send      - Send campaign
DELETE /api/sms/campaigns/:id           - Delete campaign

// Automation
GET    /api/sms/automation              - Get automation rules
POST   /api/sms/automation              - Create automation rule
PUT    /api/sms/automation/:id          - Update automation rule
DELETE /api/sms/automation/:id          - Delete automation rule

// Opt-out
POST   /api/sms/optout                  - Opt-out number
GET    /api/sms/optout/:number          - Check opt-out status
DELETE /api/sms/optout/:number          - Remove opt-out
```

### Integration Points

#### With PAYMENTS Module
```javascript
// Automation rule trigger: payment received
// Check automation rules for trigger_event = 'payment_received'
// Send SMS using template with payment details
```

#### With TREASURY Module
```javascript
// Automation rule trigger: expense approved
// Notify department head of approved expense
POST /api/sms/send
{
  "phone_number": department_head.phone,
  "template_id": template.id,
  "variables": {
    "amount": expense.amount,
    "category": expense.category,
    "date": expense.date
  }
}
```

#### With EVENTS Module
```javascript
// Send event reminder SMS
POST /api/sms/campaigns
{
  "name": "Event Reminder",
  "template_id": template.id,
  "target_audience": {
    "type": "event_registrants",
    "event_id": event.id
  },
  "scheduled_for": event.reminder_time
}
```

### Frontend Components

```jsx
// Template Management
pages/sms/TemplateManagement.jsx
components/sms/TemplateEditor.jsx
components/sms/VariableSelector.jsx

// Campaign Management
pages/sms/CampaignManagement.jsx
components/sms/CampaignWizard.jsx
components/sms/CampaignAnalytics.jsx

// Automation
pages/sms/SMSAutomation.jsx
components/sms/RuleBuilder.jsx
components/sms/TriggerSelector.jsx

// Credits
components/sms/CreditBalance.jsx
components/sms/RechargeForm.jsx
```

---

## 5. DOCUMENTS Module Integration Strategy

### Current State
- Basic document upload
- Simple file management

### Target State
- Version control with rollback
- Document permissions
- Full-text search
- Cloud storage integration
- Document preview

### Database Schema Additions

```sql
-- Document Versions
CREATE TABLE document_versions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by INTEGER REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Permissions
CREATE TABLE document_permissions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id),
  permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'edit', 'delete', 'admin'
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id),
  UNIQUE(document_id, department_id)
);

-- Document Preview Cache
CREATE TABLE document_previews (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  preview_type VARCHAR(20), -- 'thumbnail', 'pdf', 'text'
  preview_path TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Access Logs
CREATE TABLE document_access_logs (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(20), -- 'view', 'download', 'edit', 'delete'
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```javascript
// Version Control
GET    /api/documents/:id/versions          - Get document versions
POST   /api/documents/:id/versions          - Upload new version
POST   /api/documents/:id/rollback/:versionId - Rollback to version
GET    /api/documents/:id/versions/:id/download - Download specific version

// Permissions
GET    /api/documents/:id/permissions       - Get document permissions
POST   /api/documents/:id/permissions       - Grant permission
PUT    /api/documents/:id/permissions/:id   - Update permission
DELETE /api/documents/:id/permissions/:id   - Revoke permission

// Preview
GET    /api/documents/:id/preview           - Get document preview
POST   /api/documents/:id/preview/generate  - Generate preview

// Access Logs
GET    /api/documents/:id/access-logs      - Get access logs
GET    /api/documents/:id/access-logs/export - Export access logs
```

### Integration Points

#### With APPROVALS Module
```javascript
// Document approval workflow
POST /api/approvals/requests
{
  "request_type": "document_publish",
  "module": "documents",
  "description": "Publish document: " + document.name,
  "metadata": {
    "document_id": document.id,
    "version_id": document.current_version_id
  }
}
```

#### With DEPARTMENTS Module
```javascript
// Auto-grant permissions to department members
// When document is assigned to department
POST /api/documents/:id/permissions
{
  "department_id": department.id,
  "permission_level": "view"
}
```

### Frontend Components

```jsx
// Version Control
components/documents/VersionHistory.jsx
components/documents/VersionComparison.jsx

// Permissions
components/documents/PermissionManager.jsx
components/documents/AccessControl.jsx

// Preview
components/documents/DocumentPreview.jsx
components/documents/ThumbnailGallery.jsx

// Access Logs
components/documents/AccessLogViewer.jsx
components/documents/AccessAnalytics.jsx
```

---

## 6. GALLERY Module Integration Strategy

### Current State
- Basic photo upload
- Simple categorization
- Telegram sync

### Target State
- Album management
- Photo tagging
- Nested albums
- Photo editing
- Privacy settings
- Comments system

### Database Schema Additions

```sql
-- Gallery Albums
CREATE TABLE gallery_albums (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES gallery_categories(id),
  parent_id INTEGER REFERENCES gallery_albums(id),
  cover_photo_id INTEGER REFERENCES gallery_photos(id),
  is_public BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo Tags
CREATE TABLE photo_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo-Tag Junction
CREATE TABLE photo_tag_assignments (
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES photo_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id, tag_id)
);

-- Photo Comments
CREATE TABLE photo_comments (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo Privacy
CREATE TABLE photo_privacy (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'restricted'
  allowed_departments INTEGER[], -- Array of department IDs
  allowed_users INTEGER[], -- Array of user IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

```javascript
// Albums
GET    /api/gallery/albums                  - Get albums
POST   /api/gallery/albums                  - Create album
PUT    /api/gallery/albums/:id              - Update album
DELETE /api/gallery/albums/:id              - Delete album
POST   /api/gallery/albums/:id/photos       - Add photos to album
DELETE /api/gallery/albums/:id/photos/:photoId - Remove photo from album

// Tags
GET    /api/gallery/tags                    - Get tags
POST   /api/gallery/tags                    - Create tag
PUT    /api/gallery/tags/:id                - Update tag
DELETE /api/gallery/tags/:id                - Delete tag
POST   /api/gallery/photos/:id/tags         - Add tags to photo
DELETE /api/gallery/photos/:id/tags/:tagId  - Remove tag from photo

// Comments
GET    /api/gallery/photos/:id/comments     - Get photo comments
POST   /api/gallery/photos/:id/comments     - Add comment
DELETE /api/gallery/photos/:id/comments/:id - Delete comment

// Privacy
GET    /api/gallery/photos/:id/privacy      - Get privacy settings
PUT    /api/gallery/photos/:id/privacy      - Update privacy settings
```

### Integration Points

#### With TELEGRAM Module
```javascript
// Sync Telegram photos to albums
POST /api/gallery/albums/:id/sync-telegram
{
  "channel_id": telegram_channel.id,
  "date_range": {
    "from": "2026-06-01",
    "to": "2026-06-30"
  }
}
```

#### With CONTENT Module
```javascript
// Embed gallery in content
// Content editor can select photos/albums to embed
GET /api/gallery/photos/:id/embed-code
// Returns embed code for content editor
```

### Frontend Components

```jsx
// Album Management
pages/gallery/AlbumManagement.jsx
components/gallery/AlbumGrid.jsx
components/gallery/AlbumForm.jsx

// Photo Tagging
components/gallery/PhotoTagger.jsx
components/gallery/TagCloud.jsx

// Photo Editing
components/gallery/PhotoEditor.jsx
components/gallery/CropTool.jsx
components/gallery/FilterTool.jsx

// Privacy
components/gallery/PrivacySettings.jsx
components/gallery/AccessControl.jsx
```

---

## 7. Testing & QA Integration Strategy

### Test Framework Setup

#### Unit Tests
```javascript
// Backend Unit Tests
backend/tests/unit/controllers/treasury.controller.test.js
backend/tests/unit/controllers/payments.controller.test.js
backend/tests/unit/services/kopokopo.service.test.js

// Frontend Unit Tests
frontend/src/__tests__/components/treasury/JournalEntryForm.test.jsx
frontend/src/__tests__/components/payments/RefundForm.test.jsx
```

#### Integration Tests
```javascript
// API Integration Tests
backend/tests/integration/treasury.integration.test.js
backend/tests/integration/payments.integration.test.js
backend/tests/integration/module-communication.integration.test.js
```

#### E2E Tests
```javascript
// User Flow Tests
frontend/e2e/treasury-workflow.spec.js
frontend/e2e/payment-flow.spec.js
frontend/e2e/content-publishing.spec.js
```

### Test Coverage Goals
- Unit Tests: 80%+ coverage on business logic
- Integration Tests: All API endpoints covered
- E2E Tests: Critical user flows covered

---

## 8. DevOps & Deployment Integration Strategy

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run E2E tests
        run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: ./deploy.sh
```

### Docker Configuration

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Monitoring Setup

#### Application Monitoring
- Use Winston for logging
- Implement health check endpoints
- Set up error tracking (Sentry)
- Configure performance monitoring (New Relic)

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Set up Jest testing framework
- [ ] Configure Supertest for API testing
- [ ] Create baseline unit tests
- [ ] Set up GitHub Actions CI/CD
- [ ] Create Dockerfiles
- [ ] Configure Docker Compose

### Phase 2: Core Business Logic
- [ ] Implement Treasury double-entry accounting
- [ ] Create chart of accounts hierarchy
- [ ] Build financial reporting system
- [ ] Implement payment refund workflow
- [ ] Add QR code generation
- [ ] Create payment analytics
- [ ] Enhance content version control
- [ ] Implement scheduled publishing

### Phase 3: Communication & Collaboration
- [ ] Implement SMS template system
- [ ] Create bulk SMS campaigns
- [ ] Build SMS automation rules
- [ ] Implement document version control
- [ ] Add document permissions
- [ ] Create gallery album system
- [ ] Implement photo tagging

### Phase 4: Mobile & Optimization
- [ ] Create mobile-specific APIs
- [ ] Implement push notifications
- [ ] Add data synchronization
- [ ] Optimize application performance
- [ ] Implement advanced caching

### Phase 5: Monitoring & Maintenance
- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Implement automated backups
- [ ] Create disaster recovery procedures
- [ ] Set up alerting system

---

## Conclusion

This integration strategy provides detailed guidance for implementing each missing functionality while maintaining the modular architecture principles. Each module enhancement follows the established patterns and ensures proper API-based communication between modules.

The phased approach ensures that foundation work (testing, deployment) is completed first, followed by critical business modules, then communication features, and finally optimization and monitoring.
