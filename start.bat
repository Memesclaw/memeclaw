@echo off
chcp 65001 > nul
echo.
echo 🦞 Starting MemeClaw...
echo.

:: 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is required. Please install Node.js 18+
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: 检查配置文件
set CONFIG_DIR=%USERPROFILE%\.memeclaw
set CONFIG_FILE=%CONFIG_DIR%\config.json

if not exist "%CONFIG_FILE%" (
    echo ⚠️  Configuration file not found: %CONFIG_FILE%
    echo 📝 Please run: npm run onboard
    echo    Or create config.json manually:
    echo.
    echo    {
    echo      "api": {
    echo        "mode": "relay",
    echo        "endpoint": "https://your-api-endpoint.com",
    echo        "key": "sk-your-api-key-here",
    echo        "model": "claude-opus-4-6"
    echo      },
    echo      "gateway": {
    echo        "port": 18789,
    echo        "host": "127.0.0.1",
    echo        "wsPath": "/ws"
    echo      },
    echo      "telegram": {
    echo        "enabled": false
    echo      }
    echo    }
    echo.
    pause
    exit /b 1
)

:: 构建后端
echo 🔨 Building backend...
call npm run build

:: 启动 Gateway
echo 🚀 Starting Gateway on port 18789...
start "MemeClaw Gateway" cmd /c "npm run gateway"

:: 等待 Gateway 启动
timeout /t 3 /nobreak > nul

:: 启动前端
echo 🎨 Starting Frontend on port 5173...
cd frontend
start "MemeClaw Frontend" cmd /c "npm run dev"
cd ..

echo.
echo ✅ MemeClaw is running!
echo.
echo    📡 Gateway API:  http://127.0.0.1:18789
echo    🎨 Frontend UI:  http://localhost:5173
echo    🔌 WebSocket:    ws://127.0.0.1:18789/ws
echo.
echo Press any key to stop all services...
pause > nul

:: 停止服务
taskkill /FI "WINDOWTITLE eq MemeClaw Gateway*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq MemeClaw Frontend*" /F >nul 2>nul

echo.
echo 👋 MemeClaw stopped.
