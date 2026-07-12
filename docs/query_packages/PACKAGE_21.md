# Query Refactoring Package 21
**Total Queries:** 30
**Controllers:** 3
**Status:** ✅ COMPLETED

## Controllers
1. search.controller.js (4 - remaining 4 of 15) ✅
2. documentVersions.controller.js (15 - all) ✅
3. payments.controller.js (11 - first 11 of 15) ✅

**Note:** payments.controller.js has 15 queries total, remaining 4 will be in PACKAGE_22.

## Refactoring Summary

### Search Repository
- Created `SearchRepository.js` with methods for:
  - `saveSearch()` - Save search queries
  - `getSavedSearches()` - Get user's saved searches
  - `deleteSavedSearch()` - Delete saved searches
  - `getMemberSuggestions()` - Get member search suggestions
  - `getContentSuggestions()` - Get content search suggestions
  - `getDepartmentSuggestions()` - Get department search suggestions

### Document Versions Repository
- Added methods to `DocumentVersionsRepository.js`:
  - `getDocumentById()` - Get document by ID
  - `createVersion()` - Create new document version
  - `updateDocumentFilePath()` - Update document file path
  - `getVersionByIdAndDocumentId()` - Get version by ID and document ID
  - `createRollbackVersion()` - Create rollback version
  - `getDocumentTitle()` - Get document title
  - `getDocumentFilePath()` - Get document file path
  - `getDocumentPermissions()` - Get document permissions
  - `grantDocumentPermission()` - Grant document permission
  - `revokeDocumentPermission()` - Revoke document permission
  - `getAccessLogs()` - Get document access logs
  - `deleteVersion()` - Delete document version

### Payments Repository
- Added methods to `PaymentsRepository.js`:
  - `getPaymentMethods()` - Get active payment methods
  - `getPaymentsWithFilters()` - Get payments with filtering
  - `createPayment()` - Create new payment
  - `updatePaymentStatus()` - Update payment status
  - `getPledgesWithFilters()` - Get pledges with filtering
  - `createPledge()` - Create new pledge
  - `addPledgePayment()` - Add payment to pledge
  - `getPaymentSummary()` - Get payment summary
  - `getPaymentCategories()` - Get payment categories
  - `getMyPayments()` - Get user's payments
  - `getPaymentForReceipt()` - Get payment for receipt generation

## Controller Updates
- Removed direct `pool.query()` calls from controllers
- Updated controllers to use repository methods
- Maintained church_id filtering where applicable
- Preserved all existing functionality and error handling
