@echo off
REM Test Runner Script for Windows (Phase 15)
REM Runs all tests with coverage reporting

echo ========================================
echo KMainCMS Test Suite
echo ========================================
echo.

echo [1/2] Running Backend Tests...
cd backend
call npm test -- --coverage
if %errorlevel% neq 0 (
    echo.
    echo ❌ Backend tests failed
    cd ..
    exit /b 1
)
cd ..
echo ✅ Backend tests passed
echo.

echo [2/2] Running Frontend Tests...
cd frontend
call npm test -- --coverage --watchAll=false
if %errorlevel% neq 0 (
    echo.
    echo ❌ Frontend tests failed
    cd ..
    exit /b 1
)
cd ..
echo ✅ Frontend tests passed
echo.

echo ========================================
echo 🎉 All tests passed!
echo 📊 Coverage reports generated
echo ========================================
