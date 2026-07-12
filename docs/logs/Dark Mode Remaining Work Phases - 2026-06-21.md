# Dark Mode Remaining Work - Sequential Phases
**Date:** 2026-06-21
**Total Remaining:** ~2,700+ changes
**Approach:** Sequential execution, no subagents

## Phase 1: Remove Dark Variants from Core Pages (Priority: High)
**Target:** Most frequently used pages
**Estimated Changes:** ~300

### Files to Process (15 files):
1. `/pages/dashboard/Dashboard.jsx`
2. `/pages/dashboard/DashboardHome.jsx`
3. `/pages/members/MembersList.jsx`
4. `/pages/settings/Settings.jsx` ✅ Already done
5. `/pages/settings/Profile.jsx`
6. `/pages/settings/Security.jsx`
7. `/pages/treasury/TreasuryDashboard.jsx`
8. `/pages/treasury/Contributions.jsx`
9. `/pages/treasury/Pledges.jsx`
10. `/pages/treasury/Projects.jsx`
11. `/pages/content/ContentManagement.jsx`
12. `/pages/content/Announcements.jsx`
13. `/pages/gallery/GalleryManagement.jsx`
14. `/pages/gallery/GalleryAlbums.jsx`
15. `/pages/sms/SMS.jsx`

### Pattern to Remove:
- `dark:bg-*` classes
- `dark:text-*` classes
- `dark:border-*` classes
- `dark:from-*` classes
- `dark:to-*` classes
- Any other `dark:` variants

### Method:
For each file:
1. Read the file
2. Use `replace_all: true` to remove each dark variant pattern
3. Verify the change

---

## Phase 2: Remove Dark Variants from Common Components (Priority: High)
**Target:** Shared components used across the app
**Estimated Changes:** ~400

### Files to Process (20 files):
1. `/components/common/Sidebar.jsx` ✅ Already done
2. `/components/common/Header.jsx`
3. `/components/common/Modal.jsx`
4. `/components/common/DataTable.jsx`
5. `/components/common/Pagination.jsx`
6. `/components/common/SearchAndFilter.jsx`
7. `/components/common/Input.jsx`
8. `/components/common/Button.jsx`
9. `/components/common/Card.jsx`
10. `/components/common/Breadcrumb.jsx`
11. `/components/common/Loading.jsx`
12. `/components/common/EmptyState.jsx`
13. `/components/common/ConfirmationDialog.jsx`
14. `/components/common/FileUpload.jsx`
15. `/components/common/RichTextEditor.jsx`
16. `/components/common/DatePicker.jsx`
17. `/components/common/PermissionButton.jsx`
18. `/components/common/NotificationBadge.jsx`
19. `/components/common/UserAvatar.jsx`
20. `/components/common/StatusBadge.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 3: Remove Dark Variants from Auth Components (Priority: Medium)
**Target:** Authentication and user management
**Estimated Changes:** ~200

### Files to Process (10 files):
1. `/pages/auth/Login.jsx`
2. `/pages/auth/Register.jsx`
3. `/pages/auth/ForgotPassword.jsx`
4. `/pages/auth/ResetPassword.jsx`
5. `/pages/auth/EmailVerification.jsx`
6. `/pages/auth/MFASetup.jsx`
7. `/pages/auth/Sessions.jsx`
8. `/pages/users/UserManagement.jsx`
9. `/pages/users/Profile.jsx`
10. `/pages/users/MemberDirectory.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 4: Remove Dark Variants from Telegram Components (Priority: Medium)
**Target:** Telegram integration
**Estimated Changes:** ~150

### Files to Process (8 files):
1. `/pages/telegram/Telegram.jsx`
2. `/pages/telegram/TelegramAuth.jsx`
3. `/pages/telegram/TelegramChannels.jsx`
4. `/pages/telegram/TelegramPosts.jsx`
5. `/pages/telegram/TelegramPostMessage.jsx`
6. `/pages/telegram/TelegramSettings.jsx`
7. `/pages/telegram/TelegramCacheHealth.jsx`
8. `/pages/telegram/TelegramPhotoUpload.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 5: Remove Dark Variants from Department Components (Priority: Medium)
**Target:** Department-specific pages
**Estimated Changes:** ~150

### Files to Process (8 files):
1. `/pages/departments/DepartmentsList.jsx`
2. `/pages/departments/DepartmentDashboard.jsx`
3. `/pages/departments/DepartmentBranding.jsx`
4. `/pages/departments/DepartmentMembers.jsx`
5. `/pages/departments/DepartmentContent.jsx`
6. `/pages/departments/DepartmentGallery.jsx`
7. `/pages/departments/DepartmentTreasury.jsx`
8. `/pages/departments/DepartmentSettings.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 6: Remove Dark Variants from Gallery Components (Priority: Low)
**Target:** Gallery and photo management
**Estimated Changes:** ~150

### Files to Process (8 files):
1. `/pages/gallery/PhotoGallery.jsx`
2. `/pages/gallery/PhotoGalleryPage.jsx`
3. `/pages/gallery/PhotoLightbox.jsx`
4. `/pages/gallery/FeaturedPhotos.jsx`
5. `/pages/gallery/ApplePhotoGrid.jsx`
6. `/pages/gallery/GalleryNavigation.jsx`
7. `/components/gallery/PhotoCard.jsx`
8. `/components/gallery/AlbumCard.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 7: Remove Dark Variants from Public Components (Priority: Low)
**Target:** Public-facing pages
**Estimated Changes:** ~100

### Files to Process (6 files):
1. `/pages/public/Home.jsx`
2. `/pages/public/About.jsx`
3. `/pages/public/Contact.jsx`
4. `/pages/public/EventsPage.jsx`
5. `/components/public/HeroSection.jsx`
6. `/components/public/NewsletterSection.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 8: Remove Dark Variants from Contexts (Priority: Low)
**Target:** Context providers
**Estimated Changes:** ~50

### Files to Process (5 files):
1. `/contexts/AuthContext.jsx`
2. `/contexts/SettingsContext.jsx`
3. `/contexts/ToastContext.jsx`
4. `/contexts/NotificationContext.jsx`
5. `/contexts/PermissionContext.jsx`

### Pattern to Remove:
Same as Phase 1

### Method:
Same as Phase 1

---

## Phase 9: Replace bg-white with CSS Variables (Priority: High)
**Target:** All files with bg-white
**Estimated Changes:** ~390

### Pattern to Apply:
- `bg-white` → `bg-[var(--color-surface)]`

### Method:
1. Use grep to find all files with `bg-white`
2. For each file, read and replace using `replace_all: true`
3. Process in batches of 10 files

---

## Phase 10: Replace text-gray-900 with CSS Variables (Priority: High)
**Target:** All files with text-gray-900
**Estimated Changes:** ~367

### Pattern to Apply:
- `text-gray-900` → `text-[var(--color-text)]`

### Method:
1. Use grep to find all files with `text-gray-900`
2. For each file, read and replace using `replace_all: true`
3. Process in batches of 10 files

---

## Phase 11: Replace text-gray-600 with CSS Variables (Priority: High)
**Target:** All files with text-gray-600
**Estimated Changes:** ~217

### Pattern to Apply:
- `text-gray-600` → `text-[var(--color-textSecondary)]`

### Method:
1. Use grep to find all files with `text-gray-600`
2. For each file, read and replace using `replace_all: true`
3. Process in batches of 10 files

---

## Phase 12: Replace Remaining Gray Classes (Priority: Medium)
**Target:** All remaining gray classes
**Estimated Changes:** ~300

### Patterns to Apply:
- `bg-gray-50` → `bg-[var(--color-background)]`
- `bg-gray-100` → `bg-[var(--color-surface)]`
- `text-gray-500` → `text-[var(--color-textSecondary)]`
- `text-gray-800` → `text-[var(--color-text)]`
- `border-gray-200` → `border-[var(--color-border)]`
- `border-gray-300` → `border-[var(--color-border)]`

### Method:
1. Use grep to find all files with each pattern
2. For each file, read and replace using `replace_all: true`
3. Process in batches of 10 files

---

## Phase 13: Final Verification (Priority: High)
**Target:** Verify all changes are complete
**Estimated Changes:** 0

### Verification Steps:
1. Run grep for `dark:` - should return 0 matches
2. Run grep for `bg-white` - should return 0 matches
3. Run grep for `text-gray-900` - should return 0 matches
4. Run grep for `text-gray-600` - should return 0 matches
5. Run grep for other gray classes - should return 0 matches
6. Test the application to ensure palette switching works
7. Test dark palettes display correctly

---

## Execution Order

Execute phases sequentially:
1. Phase 1 (Core Pages)
2. Phase 2 (Common Components)
3. Phase 3 (Auth Components)
4. Phase 4 (Telegram Components)
5. Phase 5 (Department Components)
6. Phase 6 (Gallery Components)
7. Phase 7 (Public Components)
8. Phase 8 (Contexts)
9. Phase 9 (bg-white replacement)
10. Phase 10 (text-gray-900 replacement)
11. Phase 11 (text-gray-600 replacement)
12. Phase 12 (Remaining gray classes)
13. Phase 13 (Final verification)

**Total Phases:** 13
**Total Estimated Changes:** ~2,700+
**Estimated Time:** Multiple sessions (not one session)

## Important Notes

- **No subagents** - execute each phase sequentially
- **Read before edit** - always read file before editing
- **Use replace_all: true** - for pattern replacements
- **Verify after each phase** - run grep to confirm pattern is removed
- **Mark complete** - update checklist after each phase
- **Take breaks** - this is a large task, spread across multiple sessions
