# Project Cleanup Script

## Current Status
The project has been partially reorganized with the following structure:

## ✅ Already Organized

### Documentation Folder
- **Audit Reports**: All audit documentation
- **Implementation Plans**: Implementation and architecture reports  
- **TODO Lists**: All task lists and phase documentation
- **Deployment**: Complete deployment guides
- **Configuration Files**: Project configuration
- **Other Files**: Miscellaneous files
- **Development Files**: Scripts, infrastructure, tools, progress files
- **Archive**: Archived files
- **IDE Configuration**: VSCode and IntelliJ settings
- **Project Files**: Root project configuration files

### CMS Codebase Folder
- **backend/**: Complete backend source code
- **frontend/**: Complete frontend source code  
- **mobile/**: Mobile app source code
- **services/**: API gateway and microservices
- **Root files**: package.json, Dockerfile, .gitignore, README.md

## 📋 Remaining Files to Organize

The following folders still exist in the root and need to be moved:

### Development/Infrastructure Folders
- `database/` - Database schemas and migration files
- `logging/` - Logging configuration
- `monitoring/` - Monitoring setup
- `nginx/` - Nginx configuration
- `shared/` - Shared utilities
- `assets/` - Project assets (fonts, images)
- `backups/` - Backup files
- `todo-lists/` - Additional todo lists
- `plans/` - Project plans

### Development/Tool Folders
- `.vscode/` - Already copied to IDE Configuration
- `.idea/` - Already copied to IDE Configuration
- `.windsurf/` - Windsurf IDE configuration
- `.agents/` - AI agent configurations
- `.devin/` - Devin AI configurations
- `docs/` - Additional documentation

### Cache/Build Folders (Can be deleted)
- `node_modules/` - Node dependencies (can be regenerated)
- `.vite-cache/` - Vite build cache (can be regenerated)
- `backend/` - Already copied to CMS Codebase
- `frontend/` - Already copied to CMS Codebase
- `mobile/` - Already copied to CMS Codebase

## 🧹 Manual Cleanup Steps

### Step 1: Delete Cache/Build Folders
```bash
# From project root
rm -rf node_modules
rm -rf .vite-cache
rm -rf backend/node_modules
rm -rf frontend/node_modules
rm -rf frontend/dist
rm -rf frontend/dist-test
rm -rf mobile/flutter/flutter-mobile/.dart_tool
rm -rf mobile/react-native/mobile-app/node_modules
```

### Step 2: Move Development Folders
```bash
# Move infrastructure folders
mv database/ Documentation/Development Files/Infrastructure/
mv logging/ Documentation/Development Files/Infrastructure/
mv monitoring/ Documentation/Development Files/Infrastructure/
mv nginx/ Documentation/Development Files/Infrastructure/
mv shared/ Documentation/Development Files/Infrastructure/
mv assets/ Documentation/Development Files/Infrastructure/
mv backups/ Documentation/Development Files/Infrastructure/
```

### Step 3: Move Planning Folders
```bash
mv todo-lists/ Documentation/TODO Lists/
mv plans/ Documentation/Implementation Plans/
```

### Step 4: Move IDE Configurations
```bash
mv .windsurf/ Documentation/IDE Configuration/
mv .agents/ Documentation/IDE Configuration/
mv .devin/ Documentation/IDE Configuration/
```

### Step 5: Move Additional Documentation
```bash
mv docs/ Documentation/
```

### Step 6: Clean Up Root Files
```bash
# Remove files that have been copied
rm run-*.js run-*.bat continue-*.js continue-*.bat
rm fix-auth-imports.js setup-microservices.js
rm refactor_*.py refactor_*.log
rm "All code files.txt" cookies.txt
rm docker-compose*.yml
rm .env.production
rm CONTINUE_WORK_README.md
```

### Step 7: Remove Original Backend/Frontend/Mobile
```bash
# Only if CMS Codebase copies are verified working
rm -rf backend/
rm -rf frontend/
rm -rf mobile/
```

## 🎯 Final Structure

After cleanup, the root should only contain:
- `Documentation/` - All documentation and development files
- `CMS Codebase/` - All source code for deployment
- `.git/` - Git repository
- `README.md` - Main project README

## 📝 Verification Steps

### 1. Verify CMS Codebase
```bash
cd "CMS Codebase/backend"
npm install --production
node server.js
```

### 2. Verify Documentation
```bash
cd Documentation
ls -la
# Should see all organized folders
```

### 3. Verify Git Status
```bash
git status
# Should show only the reorganized structure
```

## ⚠️ Important Notes

1. **Backup First**: Before running cleanup commands, create a backup:
   ```bash
   tar -czf kmaincms-backup-$(date +%Y%m%d).tar.gz .
   ```

2. **Test CMS Codebase**: Ensure the copied CMS Codebase works before deleting originals

3. **Git Considerations**: The cleanup will significantly change git history - consider creating a new branch

4. **Dependencies**: After cleanup, you'll need to reinstall dependencies in CMS Codebase

## 🔄 Alternative Approach

If manual cleanup is too complex, consider:

1. **Start Fresh**: Create a new repository with just the CMS Codebase
2. **Selective Import**: Import only the necessary files from the old structure
3. **Git History**: Keep the old structure as an archive branch

## 📞 Support

If you encounter issues during cleanup:
1. Restore from backup: `tar -xzf kmaincms-backup-YYYYMMDD.tar.gz`
2. Consult the deployment documentation
3. Verify file permissions
4. Check for locked files/processes

---

**Recommendation**: Given the complexity, it may be better to use the current CMS Codebase folder for VPS deployment as-is, and consider this reorganization as a future cleanup task when you have more time.