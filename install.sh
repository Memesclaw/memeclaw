#!/bin/bash

# MemeClaw 安装脚本
# 支持本地、服务器、云端安装

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${RED}"
echo "🦞 MemeClaw Installer"
echo "   The AI assistant that learns any MEME skill"
echo -e "${NC}"

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# 检查 Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            echo -e "${GREEN}✓ Node.js $(node -v) 已安装${NC}"
            return 0
        else
            echo -e "${YELLOW}! Node.js 版本过低，需要 18+${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Node.js 未安装${NC}"
        return 1
    fi
}

# 检查包管理器
check_pm() {
    if command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v npm &> /dev/null; then
        echo "npm"
    elif command -v yarn &> /dev/null; then
        echo "yarn"
    else
        echo "none"
    fi
}

# 安装依赖
install_deps() {
    local pm=$1
    echo -e "${BLUE}正在安装依赖...${NC}"

    case $pm in
        pnpm)
            pnpm install
            cd frontend && pnpm install && cd ..
            ;;
        npm)
            npm install
            cd frontend && npm install && cd ..
            ;;
        yarn)
            yarn install
            cd frontend && yarn install && cd ..
            ;;
    esac

    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 构建项目
build_project() {
    echo -e "${BLUE}正在构建项目...${NC}"

    # 构建后端
    npx tsc || true

    # 构建前端
    cd frontend && npm run build && cd ..

    echo -e "${GREEN}✓ 构建完成${NC}"
}

# 创建配置目录
setup_config() {
    local config_dir="$HOME/.memeclaw"
    mkdir -p "$config_dir"

    if [ ! -f "$config_dir/config.json" ]; then
        cat > "$config_dir/config.json" << EOF
{
  "gateway": {
    "port": 18789,
    "host": "127.0.0.1",
    "wsPath": "/ws"
  },
  "agent": {
    "model": "claude-3-5-sonnet-20241022",
    "provider": "anthropic",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "api": {
    "mode": "direct"
  },
  "skills": {
    "enabled": true,
    "autoLoad": true,
    "skillPaths": ["./src/skills"]
  },
  "token": {
    "enabled": false,
    "taxRate": 100
  },
  "storage": {
    "type": "file",
    "path": "$config_dir/memory"
  }
}
EOF
        echo -e "${GREEN}✓ 配置文件已创建: $config_dir/config.json${NC}"
    fi
}

# 创建环境变量模板
create_env_template() {
    if [ ! -f ".env.example" ]; then
        cat > .env.example << EOF
# MemeClaw 环境变量配置

# API 配置 (选择一个)
ANTHROPIC_API_KEY=your-anthropic-key
# OPENAI_API_KEY=your-openai-key
# GEMINI_API_KEY=your-gemini-key

# 或者使用自定义端点
# MEMECLAW_API_KEY=your-key
# MEMECLAW_API_ENDPOINT=https://your-relay.com/v1

# Gateway 配置
# MEMECLAW_PORT=18789
# MEMECLAW_HOST=127.0.0.1

# 代币配置 (可选)
# MEMECLAW_TOKEN_ADDRESS=0x...
EOF
        echo -e "${GREEN}✓ 环境变量模板已创建: .env.example${NC}"
    fi
}

# 主安装流程
main() {
    echo -e "${BLUE}检测系统环境...${NC}"
    OS=$(detect_os)
    echo -e "  操作系统: ${YELLOW}$OS${NC}"

    # 检查 Node.js
    if ! check_node; then
        echo -e "${YELLOW}请先安装 Node.js 18+: https://nodejs.org/${NC}"
        exit 1
    fi

    # 检查包管理器
    PM=$(check_pm)
    if [ "$PM" == "none" ]; then
        echo -e "${RED}未找到包管理器，请安装 npm 或 pnpm${NC}"
        exit 1
    fi
    echo -e "  包管理器: ${YELLOW}$PM${NC}"

    # 安装依赖
    install_deps "$PM"

    # 构建项目
    build_project

    # 设置配置
    setup_config
    create_env_template

    echo ""
    echo -e "${GREEN}🎉 MemeClaw 安装完成！${NC}"
    echo ""
    echo -e "下一步操作:"
    echo -e "  1. 复制环境变量: ${YELLOW}cp .env.example .env${NC}"
    echo -e "  2. 编辑 ${YELLOW}.env${NC} 添加你的 API Key"
    echo -e "  3. 启动服务: ${YELLOW}npm run gateway${NC}"
    echo -e "  4. 启动前端: ${YELLOW}npm run frontend:dev${NC}"
    echo ""
    echo -e "🦞 Happy MEME-ing!"
}

# 运行安装
main "$@"
