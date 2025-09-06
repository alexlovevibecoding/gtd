@echo off
REM GTD App Runner Script for Windows
REM Makes it easy to start your Getting Things Done application

title GTD Mini - Getting Things Done App

echo.
echo ^🎯 GTD Mini - Getting Things Done App
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed
    echo Please install npm ^(usually comes with Node.js^)
    pause
    exit /b 1
)

REM Display Node and npm versions
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo 📦 Node.js: %NODE_VERSION%
echo 📦 npm: %NPM_VERSION%
echo.

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ package.json not found
    echo Please run this script from the GTD app directory
    pause
    exit /b 1
)

REM Check if node_modules exists, install if not
if not exist node_modules (
    echo 📥 Installing dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Display app info
echo ✅ Ready to start GTD Mini...
echo.
echo Features available:
echo   • Complete GTD workflow ^(Capture → Clarify → Organize → Review → Engage^)
echo   • Context-based task organization
echo   • Due date management with overdue highlighting
echo   • IndexedDB persistence with backup/restore
echo   • Weekly review mode
echo   • Search and filtering
echo.
echo 📝 Access your app at: http://localhost:3000
echo 🛑 Press Ctrl+C to stop the server
echo.
echo ==============================================
echo.

REM Start the development server
npm start

pause