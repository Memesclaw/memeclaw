#!/bin/bash
# MemeClaw 启动脚本 (Linux/macOS)

set -e

echo "🦞 Starting MemeClaw..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env and add your API key"
    echo "   Example: ANTHROPIC_API_KEY=sk-ant-..."
fi

# 构建后端
echo "🔨 Building backend..."
npm run build

# 启动 Gateway (后台)
echo "🚀 Starting Gateway on port 18789..."
npm run gateway &
GATEWAY_PID=$!

# 等待 Gateway 启动
sleep 2

# 启动前端
echo "🎨 Starting Frontend on port 5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ MemeClaw is running!"
echo ""
echo "   📡 Gateway API:  http://127.0.0.1:18789"
echo "   🎨 Frontend UI:  http://localhost:5173"
echo "   🔌 WebSocket:    ws://127.0.0.1:18789/ws"
echo ""
echo "Press Ctrl+C to stop"

# 等待信号
trap "kill $GATEWAY_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
