@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: MemeClaw 快速部署脚本 (Windows)
:: 使用: deploy.cmd [install|start|stop|status|test|build]

echo.
echo 🦞 MemeClaw 部署脚本
echo.

:: 获取脚本目录
cd /d "%~dp0"

if "%1"=="" goto usage

if "%1"=="install" goto install
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="status" goto status
if "%1"=="test" goto test
if "%1"=="build" goto build

:usage
echo 使用方法: %~nx0 {install^|start^|stop^|status^|test^|build}
echo.
echo 命令说明：
echo   install - 安装依赖并编译
echo   start   - 启动服务
echo   stop    - 停止服务
echo   status  - 查看状态
echo   test    - 运行测试
echo   build   - 编译项目
exit /b 1

:install
echo 📦 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ npm install 失败
    exit /b 1
)

echo.
echo 🔨 编译项目...
call npm run build
if errorlevel 1 (
    echo ❌ 编译失败
    exit /b 1
)

echo.
echo 📝 检查配置...
if not exist ".env" (
    echo 创建 .env 文件...
    (
        echo # API 配置
        echo MEMECLAW_API_MODE=relay
        echo MEMECLAW_API_ENDPOINT=https://cloud.hongqiye.com
        echo MEMECLAW_API_KEY=your-api-key
        echo MEMECLAW_MODEL=claude-opus-4-6
        echo.
        echo # Telegram Bot (可选^)
        echo # TELEGRAM_BOT_TOKEN=your-bot-token
    ) > .env
    echo ✅ 已创建 .env 文件，请编辑配置 API Key
)

echo.
echo ✅ 安装完成！
echo.
echo 下一步：
echo   1. 编辑 .env 文件配置 API Key
echo   2. 运行 deploy.cmd start 启动服务
exit /b 0

:start
echo 🚀 启动 MemeClaw...
node dist/main.js
exit /b 0

:stop
echo 🛑 停止 MemeClaw...
taskkill /F /FI "WINDOWTITLE eq MemeClaw*" 2>nul
taskkill /F /IM node.exe /FI "MEMECLAW=1" 2>nul
echo ✅ 已停止
exit /b 0

:status
echo 📊 检查状态...
curl -s http://127.0.0.1:18789/health >nul 2>&1
if errorlevel 1 (
    echo ❌ MemeClaw 未运行
) else (
    echo ✅ MemeClaw 正在运行
    curl -s http://127.0.0.1:18789/health
)
exit /b 0

:test
echo 🧪 运行测试...
node test.js
exit /b 0

:build
echo 🔨 编译项目...
call npm run build
if errorlevel 1 (
    echo ❌ 编译失败
    exit /b 1
)
echo ✅ 编译完成
exit /b 0
