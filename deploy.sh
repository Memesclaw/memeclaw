#!/bin/bash
# MemeClaw 快速部署脚本
# 使用: ./deploy.sh [install|start|stop|status]

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🦞 MemeClaw 部署脚本${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 请先安装 Node.js (>=18)${NC}"
    exit 1
fi

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "$1" in
    install)
        echo -e "${YELLOW}📦 安装依赖...${NC}"
        npm install

        echo -e "${YELLOW}🔨 编译项目...${NC}"
        npm run build

        echo -e "${YELLOW}📝 检查配置...${NC}"
        if [ ! -f ".env" ]; then
            echo -e "${YELLOW}创建 .env 文件...${NC}"
            cat > .env << 'EOF'
# API 配置
MEMECLAW_API_MODE=relay
MEMECLAW_API_ENDPOINT=https://cloud.hongqiye.com
MEMECLAW_API_KEY=your-api-key
MEMECLAW_MODEL=claude-opus-4-6

# Telegram Bot (可选)
# TELEGRAM_BOT_TOKEN=your-bot-token
EOF
            echo -e "${GREEN}✅ 已创建 .env 文件，请编辑配置 API Key${NC}"
        fi

        echo -e "${GREEN}✅ 安装完成！${NC}"
        echo ""
        echo "下一步："
        echo "  1. 编辑 .env 文件配置 API Key"
        echo "  2. 运行 ./deploy.sh start 启动服务"
        ;;

    start)
        echo -e "${YELLOW}🚀 启动 MemeClaw...${NC}"
        node dist/main.js
        ;;

    stop)
        echo -e "${YELLOW}🛑 停止 MemeClaw...${NC}"
        pkill -f "node dist/main.js" || true
        echo -e "${GREEN}✅ 已停止${NC}"
        ;;

    status)
        echo -e "${YELLOW}📊 检查状态...${NC}"
        if pgrep -f "node dist/main.js" > /dev/null; then
            echo -e "${GREEN}✅ MemeClaw 正在运行${NC}"
            curl -s http://127.0.0.1:18789/health || echo "API 无响应"
        else
            echo -e "${RED}❌ MemeClaw 未运行${NC}"
        fi
        ;;

    test)
        echo -e "${YELLOW}🧪 运行测试...${NC}"
        node test.js
        ;;

    build)
        echo -e "${YELLOW}🔨 编译项目...${NC}"
        npm run build
        echo -e "${GREEN}✅ 编译完成${NC}"
        ;;

    *)
        echo "使用方法: $0 {install|start|stop|status|test|build}"
        echo ""
        echo "命令说明："
        echo "  install - 安装依赖并编译"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  status  - 查看状态"
        echo "  test    - 运行测试"
        echo "  build   - 编译项目"
        exit 1
        ;;
esac
