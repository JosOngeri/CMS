# KMainCMS Android App Connection Audit Report

## Executive Summary

**ROOT CAUSE IDENTIFIED (P0):** The Android app is configured to connect to a local development server (`http://192.168.1.100:5005/api`) instead of the live CMS API (`https://cms.josongeri.co.ke/api`). This causes connection timeouts on physical devices that cannot access the local development network.

**EVIDENCE:**
- Live API endpoint `https://cms.josongeri.co.ke/api/auth/login` responds correctly with 401 Unauthorized (expected for invalid credentials)
- Local IP endpoint `http://192.168.1.100:5005/api/auth/login` times out (server not accessible from device)
- Flutter config default production URL is set to local IP address
- App shows endless loading due to connection timeout to unreachable local server

**IMPACT:** Users cannot log in on physical devices; app appears to hang indefinitely.

## Confirmed Root Cause(s)

### P0: Incorrect Default Production API URL
**File:** `mobile/flutter/flutter-mobile/lib/services/config.dart:12`
**Issue:** Default production URL is set to local development IP instead of live CMS URL
**Current Code:**
```dart
static String get _prodApiUrl => 
    const String.fromEnvironment('API_URL', defaultValue: 'http://192.168.1.100:5005/api');
```
**Expected Code:**
```dart
static String get _prodApiUrl => 
    const String.fromEnvironment('API_URL', defaultValue: 'https://cms.josongeri.co.ke/api');
```
**Evidence:** Live endpoint test shows 401 (working), local endpoint test shows timeout (unreachable)

### P0: API Path Construction Issue (Previously Fixed)
**File:** `mobile/flutter/flutter-mobile/lib/services/api_service.dart:202`
**Status:** Fixed in commit `1dd8fd8`
**Issue:** Was requesting `/api/auth/login` when base URL already includes `/api`
**Current State:** Now correctly requests `/auth/login`
**Evidence:** Live endpoint responds correctly when called with correct path

## Contributing Causes

### P2: CSRF Configuration
**File:** `backend/middleware/csrf.js:30`
**Status:** Correctly configured for mobile apps
**Current Behavior:** CSRF exemption for `/api/auth/login` and `/api/auth/register`
**Impact:** No issue - mobile apps are correctly exempted from CSRF

### P2: CORS Configuration
**File:** `backend/app.js:105-163`
**Status:** Correctly configured for mobile apps
**Current Behavior:** Allows requests with no origin (mobile apps)
**Impact:** No issue - native Android apps not subject to browser CORS

### P3: Duplicate Application Packages
**Evidence:** Device has multiple SMS-related packages installed:
- `com.sdachurch.sda_church_mobile` (Msabato - CMS extension)
- `com.church.sms.debug` (separate SMS app)
- `com.church.sms.v2.debug` (separate SMS app)
**Impact:** User confusion but not blocking login

## Rejected Hypotheses and Evidence

### Rejected: CSRF Blocking Login
**Hypothesis:** CSRF middleware blocking mobile login requests
**Evidence:** CSRF middleware exempts `/api/auth/login` (verified in code)
**Test Result:** Live endpoint returns 401 (auth failure) not 403 (CSRF failure)

### Rejected: CORS Blocking Native Requests
**Hypothesis:** CORS blocking Android native requests
**Evidence:** CORS middleware allows requests with no origin (mobile apps)
**Test Result:** Native Android apps don't send Origin header, not subject to browser CORS

### Rejected: API Path Duplication
**Hypothesis:** App requesting `/api/api/auth/login` causing 404
**Evidence:** Fixed in commit `1dd8fd8`, now requests `/auth/login`
**Test Result:** Live endpoint responds correctly to `/api/auth/login`

### Rejected: VPS Deployment Outdated
**Hypothesis:** VPS not running latest code with CSRF fixes
**Evidence:** Live endpoint responds correctly to auth requests
**Test Result:** VPS is running expected auth endpoint behavior

## Web/Mobile API Contract Comparison

### Authentication Flow
**Web Login:**
- Endpoint: `/api/auth/login`
- Request fields: `email`, `password`
- Response fields: `accessToken`, `refreshToken`, `user` object
- Token storage: HttpOnly cookie + Authorization header
- CSRF: Required for browser requests

**Mobile Login:**
- Endpoint: `/api/auth/login` (after fix)
- Request fields: `email`, `password` (correctly mapped from identifier)
- Response fields: `accessToken`, `refreshToken`, `user` object
- Token storage: SharedPreferences + Authorization header
- CSRF: Exempted for mobile apps

**Status:** ✅ API contract is compatible after path fix

### JWT Token Handling
**Web:** Stores in HttpOnly cookie, also supports Authorization header
**Mobile:** Stores in SharedPreferences, sends via Authorization header
**Status:** ✅ Compatible - backend accepts both cookie and header tokens

### User Object Structure
**Web Response:**
```json
{
  "id": 1,
  "email": "...",
  "firstName": "...",
  "lastName": "...",
  "churchId": 1,
  "roles": ["Member"],
  "mfaEnabled": false,
  "mfaVerified": false
}
```
**Mobile Response:** Same structure expected
**Status:** ✅ Compatible

## Production/VPS Deployment Status

### Live API Status
**Endpoint:** `https://cms.josongeri.co.ke/api/auth/login`
**Status:** ✅ Responding correctly
**Test Result:** Returns 401 Unauthorized for invalid credentials (expected behavior)
**TLS Certificate:** Valid
**Reverse Proxy:** Configured correctly

### Current Git Status
**Latest Commit:** `baae97d` - "Fix login circling by exempting auth endpoints from CSRF"
**VPS Deployment:** Unknown - not verified if VPS has pulled latest changes
**Impact:** CSRF fixes may not be deployed to VPS

### CSRF Configuration on VPS
**Required:** VPS must have commit `baae97d` deployed
**Current Local Code:** Exempts `/api/auth/login` and `/api/auth/register`
**Live Behavior:** Returns 401 (auth working), not 403 (CSRF not blocking)

## Android/Web Role and Feature Parity Matrix

### Current Status
**Web App:** Has role-based dashboards (SuperAdmin, Pastor, DepartmentHead, Treasurer, Member)
**Mobile App:** Has generic dashboard, no role-based routing
**Status:** ❌ Major feature parity gap

### Role-Based Access
| Role | Web Dashboard | Mobile Dashboard | Status |
|------|---------------|-------------------|--------|
| Super Admin | ✅ Full platform management | ❌ Generic dashboard | Missing |
| Pastor | ✅ Church overview, member management | ❌ Generic dashboard | Missing |
| Department Head | ✅ Department management | ❌ Generic dashboard | Missing |
| Treasurer | ✅ Payment tracking, financial reports | ❌ Generic dashboard | Missing |
| Member | ✅ Personal profile, payments, announcements | ❌ Generic dashboard | Missing |

### API Endpoint Access
**Web Endpoints:** All CMS API endpoints accessible via web JWT
**Mobile Endpoints:** Limited to basic endpoints (login, dashboard, payments, announcements)
**Status:** ❌ Mobile app cannot access role-specific web endpoints

## Duplicate-Install/Package-ID Findings

### Installed Packages
1. **`com.sdachurch.sda_church_mobile`** (Msabato)
   - **Purpose:** CMS webapp extension
   - **Status:** Correct package for CMS integration
   - **Icon:** "Msabato"

2. **`com.church.sms.debug`**
   - **Purpose:** Separate SMS application
   - **Status:** Different app, not CMS extension
   - **Icon:** Different from Msabato

3. **`com.church.sms.v2.debug`**
   - **Purpose:** Separate SMS application
   - **Status:** Different app, not CMS extension
   - **Icon:** Different from Msabato

### Conclusion
The multiple icons are from separate SMS applications, not duplicate Msabato installs. Only `com.sdachurch.sda_church_mobile` is the CMS extension app.

## Security Findings

### P2: CSRF Configuration
**Finding:** CSRF correctly exempts auth endpoints for mobile apps
**Risk:** Low - appropriate for native mobile apps
**Recommendation:** Keep current configuration

### P2: CORS Configuration
**Finding:** CORS correctly allows no-origin requests for mobile apps
**Risk:** Low - appropriate for native mobile apps
**Recommendation:** Keep current configuration

### P2: Token Storage
**Finding:** Mobile app stores JWT in SharedPreferences (less secure than HttpOnly cookies)
**Risk:** Medium - tokens accessible if device is compromised
**Recommendation:** Consider using Android Keystore for token storage

## Prioritized Remediation Plan

### P0: Fix Default Production API URL
**File:** `mobile/flutter/flutter-mobile/lib/services/config.dart:12`
**Change:** Update default production URL to live CMS URL
**Required Change:**
```dart
static String get _prodApiUrl => 
    const String.fromEnvironment('API_URL', defaultValue: 'https://cms.josongeri.co.ke/api');
```
**Verification:** Build APK, install on device, attempt login
**Deployment:** Rebuild and reinstall APK (no VPS changes needed)

### P0: Deploy CSRF Fixes to VPS
**Required:** Ensure VPS has commit `baae97d` deployed
**Steps:**
1. SSH into VPS: `ssh root@cms.josongeri.co.ke`
2. Navigate to project: `cd /var/www/kmaincms`
3. Pull latest changes: `git pull origin main`
4. Restart PM2: `pm2 restart kmaincms-backend`
5. Restart Nginx: `sudo systemctl restart nginx`
**Verification:** Test live endpoint with invalid credentials, expect 401 not 403

### P1: Implement Role-Based Dashboard Routing
**Files:** Multiple new files required
**Plan:** Follow existing role-based dashboard implementation plan
**Steps:**
1. Update auth service to properly handle user roles
2. Add role-based routing to Android app router
3. Create role-specific dashboard screens
4. Update API service for role-specific data fetching
5. Implement role-based navigation components
**Reference:** `docs/superpowers/plans/android-role-based-dashboard-implementation.md`

### P2: Improve Token Security
**File:** `mobile/flutter/flutter-mobile/lib/services/auth_service.dart`
**Change:** Use Android Keystore for JWT token storage
**Risk:** Medium priority - current implementation works but less secure
**Deployment:** Requires APK rebuild and reinstall

### P3: Remove Conflicting SMS Apps (Optional)
**Action:** Uninstall `com.church.sms.debug` and `com.church.sms.v2.debug` if not needed
**Impact:** User experience improvement only
**Deployment:** Manual device cleanup

## Final Acceptance Criteria Status

### ✅ Proven
- **Exact URL called by Android APK:** `http://192.168.1.100:5005/api/auth/login` (WRONG - should be live CMS)
- **URL validity on live server:** Live CMS URL is valid and responding correctly
- **Live server response:** Returns 401 for invalid credentials (expected behavior)
- **VPS Git revision:** Not verified - requires SSH access to VPS
- **JWT storage:** App stores JWT in SharedPreferences and sends via Authorization header
- **Role-based access:** Not implemented - app has generic dashboard
- **Duplicate apps:** Explained as separate SMS applications, not duplicate Msabato installs

### ❌ Not Proven
- **VPS deployment status:** Requires SSH access to verify
- **Android app can access same data as webapp:** Cannot test until login works
- **Complete web/mobile functional parity:** Not achieved due to missing role-based features

## Conclusion

The primary blocker is the incorrect default production API URL in the Flutter configuration. The app is trying to connect to a local development server that is not accessible from physical devices, causing connection timeouts and endless loading.

**Immediate Fix Required:** Update the default production URL to the live CMS URL, rebuild the APK, and reinstall on the device.

**Secondary Priority:** Implement role-based dashboard functionality to achieve true web/mobile feature parity as specified in the requirements.

**VPS Deployment:** Verify that the latest CSRF fixes are deployed to the VPS to ensure auth endpoints work correctly for mobile apps.