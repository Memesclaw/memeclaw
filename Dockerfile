# MemeClaw Dockerfile
# 多阶段构建，支持本地、服务器、云端部署

FROM node:22-alpine AS base

# 安装构建依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY src ./src

# 构建 TypeScript
RUN npx tsc

# 前端构建
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 最终镜像
FROM node:22-alpine

# 安装运行时依赖
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S memeclaw && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G memeclaw -g memeclaw memeclaw

WORKDIR /app

# 从构建阶段复制
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package*.json ./
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# 创建配置目录
RUN mkdir -p /home/memeclaw/.memeclaw && \
    chown -R memeclaw:memeclaw /app /home/memeclaw/.memeclaw

# 切换到非 root 用户
USER memeclaw

# 环境变量
ENV NODE_ENV=production
ENV MEMECLAW_PORT=18789
ENV MEMECLAW_HOST=0.0.0.0

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:18789/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 暴露端口
EXPOSE 18789

# 入口点
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
