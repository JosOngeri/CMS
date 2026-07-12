@echo off
REM Database setup script for KMainCMS (Windows)

echo Setting up KMainCMS database...

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: PostgreSQL is not installed or not in PATH
    exit /b 1
)

REM Set default values
set DB_USER=postgres
set DB_NAME=kmaincms

REM Prompt for database credentials
echo Enter PostgreSQL user (default: postgres):
set /p DB_USER_INPUT=
if not "%DB_USER_INPUT%"=="" set DB_USER=%DB_USER_INPUT%

echo Enter database name (default: kmaincms):
set /p DB_NAME_INPUT=
if not "%DB_NAME_INPUT%"=="" set DB_NAME=%DB_NAME_INPUT%

echo Enter PostgreSQL password:
set /p DB_PASSWORD=

REM Create database
echo Creating database...
set PGPASSWORD=%DB_PASSWORD%
psql -U %DB_USER% -c "DROP DATABASE IF EXISTS %DB_NAME%;"
psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"

REM Run migrations
echo Running migrations...
psql -U %DB_USER% -d %DB_NAME% -f database\001_auth_schema.sql

echo Database setup complete!
echo Update backend\.env with your database credentials
