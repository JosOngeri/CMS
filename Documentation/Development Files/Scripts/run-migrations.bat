@echo off
REM Migration Runner Script for Windows
REM Runs all database migrations in the correct order

echo ========================================
echo KMainCMS Database Migrations
echo ========================================
echo.

REM Get database config from environment or use defaults
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_NAME%"=="" set DB_NAME=kmaincms
if "%DB_USER%"=="" set DB_USER=postgres

echo Database: %DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.

set SUCCESS_COUNT=0
set FAIL_COUNT=0

REM Migration order is critical - must run in this sequence
set MIGRATIONS[0]=add_tenancy_core.sql
set MIGRATIONS[1]=add_church_slug_indexes.sql
set MIGRATIONS[2]=enable_rls_policies.sql
set MIGRATIONS[3]=add_sms_providers.sql
set MIGRATIONS[4]=add_notification_templates.sql
set MIGRATIONS[5]=add_gallery_sync.sql
set MIGRATIONS[6]=add_payment_tracking.sql
set MIGRATIONS[7]=add_document_approval_workflow.sql
set MIGRATIONS[8]=add_ai_audit_logging.sql

for %%f in (add_tenancy_core.sql add_church_slug_indexes.sql enable_rls_policies.sql add_sms_providers.sql add_notification_templates.sql add_gallery_sync.sql add_payment_tracking.sql add_document_approval_workflow.sql add_ai_audit_logging.sql) do (
    echo [Running] %%f
    
    psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f database\migrations\%%f
    
    if %errorlevel% equ 0 (
        echo [OK] Completed: %%f
        echo.
        set /a SUCCESS_COUNT+=1
    ) else (
        echo [FAIL] Failed: %%f
        echo.
        set /a FAIL_COUNT+=1
    )
)

echo ========================================
echo Migration Summary:
echo Successful: %SUCCESS_COUNT%
echo Failed: %FAIL_COUNT%
echo Total: %SUCCESS_COUNT% + %FAIL_COUNT%
echo ========================================

if %FAIL_COUNT% gtr 0 (
    echo.
    echo Some migrations failed. Please review the errors above.
    exit /b 1
) else (
    echo.
    echo All migrations completed successfully!
    echo.
    echo Next steps:
    echo 1. Verify tables: psql -U postgres -d kmaincms -c "\dt"
    echo 2. Run tests: run-tests.bat
    echo 3. Start application: cd backend ^&^& npm start
)
