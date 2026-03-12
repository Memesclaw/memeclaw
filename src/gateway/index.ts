// 加载环境变量配置（必须在最前面）
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// 加载 ~/.memeclaw/.env（向后兼容）
const envPath = path.join(os.homedir(), '.memeclaw', '.env');
dotenv.config({ path: envPath });

// 优先使用新的 JSON 配置
import { loadConfig, getGatewayConfig, getTelegramConfig, ensureConfig } from '../config/loader';

// 确保配置目录和文件存在
ensureConfig();

const config = loadConfig();

// 检查是否已配置 API Key（跳过占位符）
const isPlaceholder = (key: string | undefined): boolean => {
  if (!key) return true;
  const placeholders = ['your-api-key', 'sk-your', 'sk-test', 'placeholder'];
  return placeholders.some(p => key.toLowerCase().includes(p.toLowerCase()));
};

if (!config.api?.key || isPlaceholder(config.api.key)) {
  console.log('\n' + '='.repeat(60));
  console.log('🦞 欢迎使用 MemeClaw！');
  console.log('='.repeat(60));
  console.log('\n检测到 API Key 未配置。');
  console.log('\n请运行配置向导：');
  console.log('\n  npm run onboard');
  console.log('\n或手动编辑配置文件：');
  console.log('  ~/.memeclaw/config.json');
  console.log('\n' + '='.repeat(60) + '\n');
  process.exit(0);
}

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { WSMessage, Session, Message } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createAgent, Agent } from '../agent';
import { startTelegramBot, getTelegramBotToken } from '../telegram/bot';
import { cronScheduler } from '../agents/tools/cron';
import { initMemorySystem } from '../agents/tools/memory';

export interface GatewayConfig {
  port: number;
  host: string;
  wsPath: string;
  auth?: {
    enabled: boolean;
    token?: string;
  };
  telegram?: {
    enabled: boolean;
    botToken?: string;
  };
}

/**
 * Gateway - MemeClaw 控制平面
 * 支持 WebSocket、HTTP API 和 Telegram Bot
 */
export class Gateway {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private config: GatewayConfig;
  private sessions: Map<string, Session> = new Map();
  private clients: Map<WebSocket, string> = new Map(); // client -> sessionId
  private agent: Agent;
  private telegramStarted: boolean = false;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: config.wsPath });

    // 创建 Agent 实例
    this.agent = createAgent();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // 获取所有会话
    this.app.get('/api/sessions', (req, res) => {
      const sessions = Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        model: s.model,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
      res.json(sessions);
    });

    // 获取单个会话
    this.app.get('/api/sessions/:id', (req, res) => {
      const session = this.sessions.get(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    });

    // 创建会话
    this.app.post('/api/sessions', (req, res) => {
      const { model } = req.body;
      const session = this.createSession(model);
      res.json(session);
    });

    // 删除会话
    this.app.delete('/api/sessions/:id', (req, res) => {
      const deleted = this.sessions.delete(req.params.id);
      res.json({ success: deleted });
    });

    // 发送消息到会话
    this.app.post('/api/sessions/:id/messages', (req, res) => {
      const { content, role = 'user' } = req.body;
      const session = this.sessions.get(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const message: Message = {
        id: uuidv4(),
        role,
        content,
        timestamp: Date.now(),
      };

      session.messages.push(message);
      session.updatedAt = Date.now();

      // 广播消息给所有连接的客户端
      this.broadcast({
        type: 'message',
        sessionId: session.id,
        data: message,
        timestamp: Date.now(),
      });

      res.json(message);
    });
  }

  /**
   * 设置 WebSocket
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      // 认证检查
      if (this.config.auth?.enabled) {
        const token = req.url?.split('token=')[1];
        if (token !== this.config.auth.token) {
          ws.close(4001, 'Unauthorized');
          return;
        }
      }

      const clientId = uuidv4();
      console.log(`Client connected: ${clientId}`);

      // 发送连接确认
      this.sendToClient(ws, {
        type: 'connected',
        data: { clientId },
        timestamp: Date.now(),
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWSMessage(ws, message);
        } catch (error) {
          console.error('Error handling WS message:', error);
          this.sendToClient(ws, {
            type: 'error',
            data: { error: 'Invalid message format' },
            timestamp: Date.now(),
          });
        }
      });

      ws.on('close', () => {
        const sessionId = this.clients.get(ws);
        if (sessionId) {
          this.clients.delete(ws);
        }
        console.log(`Client disconnected: ${clientId}`);
      });
    });
  }

  /**
   * 处理 WebSocket 消息
   */
  private async handleWSMessage(ws: WebSocket, message: any): Promise<void> {
    const { type, data, sessionId } = message;
    console.log(`📩 收到消息: type=${type}, sessionId=${sessionId}`);

    switch (type) {
      case 'create_session':
        const session = this.createSession(data?.model);
        this.clients.set(ws, session.id);
        this.sendToClient(ws, {
          type: 'response',
          data: session,
          sessionId: session.id,
          timestamp: Date.now(),
        });
        break;

      case 'message':
        console.log(`💬 处理聊天消息: ${data?.content?.substring(0, 50)}...`);
        if (!sessionId) {
          console.log('❌ 没有 sessionId');
          return this.sendToClient(ws, {
            type: 'error',
            data: { error: 'No session ID provided' },
            timestamp: Date.now(),
          });
        }

        // 获取或创建会话
        let s = this.sessions.get(sessionId);
        if (!s) {
          console.log(`📝 创建新会话: ${sessionId}`);
          s = this.createSession();
          s.id = sessionId;
          this.sessions.set(sessionId, s);
        }

        // 设置 Agent 会话
        this.agent.setSession(s);

        const msg: Message = {
          id: uuidv4(),
          role: data.role || 'user',
          content: data.content,
          timestamp: Date.now(),
        };

        s.messages.push(msg);
        s.updatedAt = Date.now();

        // 广播用户消息
        this.broadcast({
          type: 'message',
          sessionId,
          data: msg,
          timestamp: Date.now(),
        });

        // 广播开始思考状态
        this.broadcast({
          type: 'thinking_start',
          sessionId,
          data: { message: 'AI 正在思考...' },
          timestamp: Date.now(),
        });

        // 调用 Agent 获取回复（带超时）
        try {
          console.log(`🤖 调用 Agent.chat...`);
          const response = await this.executeWithTimeout(
            () => this.agent.chat(data.content),
            120000 // 2 分钟超时
          );
          console.log(`✅ Agent 响应:`, JSON.stringify(response, null, 2)?.substring(0, 300));

          // 广播助手回复
          this.broadcast({
            type: 'response' as const,
            sessionId,
            data: response,
            timestamp: Date.now(),
          });
        } catch (error: any) {
          console.error(`❌ Agent 错误: ${error.message}`);
          const errorMsg = error.message || '发生未知错误';
          // 广播错误消息给所有客户端
          this.broadcast({
            type: 'error',
            data: { error: errorMsg },
            sessionId,
            timestamp: Date.now(),
          });
        } finally {
          // 广播结束思考状态
          this.broadcast({
            type: 'thinking_end',
            sessionId,
            timestamp: Date.now(),
          });
        }
        break;

      case 'skill_call':
        // 技能调用消息
        this.broadcast({
          type: 'skill_call',
          sessionId,
          data,
          timestamp: Date.now(),
        });
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { error: `Unknown message type: ${type}` },
          timestamp: Date.now(),
        });
    }
  }

  /**
   * 执行 Promise 带超时
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`请求超时 (${timeout / 1000}秒)`));
      }, timeout);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * 创建会话
   */
  private createSession(model: string = 'claude-3-5-sonnet-20241022'): Session {
    const session: Session = {
      id: uuidv4(),
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * 发送消息给客户端
   */
  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息给所有客户端
   */
  public broadcast(message: WSMessage): void {
    const data = JSON.stringify(message);
    const clientCount = this.wss.clients.size;
    let sentCount = 0;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
        sentCount++;
      }
    });
    console.log(`📡 广播消息 type=${message.type} 到 ${sentCount}/${clientCount} 客户端`);
  }

  /**
   * 启动服务
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, async () => {
        console.log(`🦞 MemeClaw Gateway running on ws://${this.config.host}:${this.config.port}${this.config.wsPath}`);
        console.log(`   HTTP API on http://${this.config.host}:${this.config.port}`);
        console.log(`   Health check: http://${this.config.host}:${this.config.port}/health`);

        // 初始化记忆系统
        try {
          initMemorySystem();
          console.log('🧠 记忆系统已初始化');
        } catch (error) {
          console.warn('⚠️ 记忆系统初始化失败:', error);
        }

        // 启动 Cron 调度器
        try {
          cronScheduler.setCallback(async (job) => {
            // 执行定时任务
            console.log(`🔔 执行任务: ${job.name}`);
            // 这里可以通过 gateway 广播或发送到 Telegram
            this.broadcast({
              type: 'cron_job',
              data: {
                name: job.name,
                payload: job.payload,
              },
              timestamp: Date.now(),
            });
          });
          cronScheduler.start();
          console.log('🕐 Cron 调度器已启动');
        } catch (error) {
          console.warn('⚠️ Cron 调度器启动失败:', error);
        }

        // 启动 Telegram Bot
        if (this.config.telegram?.enabled) {
          const token = this.config.telegram.botToken || getTelegramBotToken();
          if (token) {
            // 获取代理配置
            const proxy = process.env.TELEGRAM_PROXY || process.env.SOCKS_PROXY;
            this.startTelegram(token, proxy);
          } else {
            console.warn('⚠️ Telegram enabled but no bot token provided');
          }
        }

        resolve();
      });
    });
  }

  /**
   * 启动 Telegram Bot
   */
  private async startTelegram(token: string, proxy?: string): Promise<void> {
    if (this.telegramStarted) return;

    try {
      console.log('🤖 Starting Telegram Bot...');
      if (proxy) {
        console.log(`🔌 Using proxy: ${proxy}`);
      }
      await startTelegramBot(token, proxy);
      this.telegramStarted = true;
      console.log('✅ Telegram Bot ready');
    } catch (error) {
      console.error('Failed to start Telegram Bot:', error);
    }
  }

  /**
   * 停止服务
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          console.log('MemeClaw Gateway stopped');
          resolve();
        });
      });
    });
  }

  /**
   * 获取会话
   */
  public getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  /**
   * 获取所有会话
   */
  public getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

// 自动启动（当直接运行此文件时）
if (require.main === module || process.argv[1]?.includes('gateway')) {
  const gwConfig = getGatewayConfig();
  const tgConfig = getTelegramConfig();

  const gateway = new Gateway({
    port: gwConfig.port,
    host: gwConfig.host,
    wsPath: gwConfig.wsPath,
    telegram: tgConfig.enabled ? {
      enabled: true,
      botToken: tgConfig.botToken,
    } : undefined,
  });

  gateway.start().then(() => {
    console.log('✅ MemeClaw Gateway 已启动!');
    console.log('');
    console.log('   端点:');
    console.log(`   - HTTP API: http://${gwConfig.host}:${gwConfig.port}`);
    console.log(`   - WebSocket: ws://${gwConfig.host}:${gwConfig.port}${gwConfig.wsPath}`);
    console.log(`   - Health: http://${gwConfig.host}:${gwConfig.port}/health`);
    if (tgConfig.enabled) {
      console.log(`   - Telegram Bot: ${tgConfig.enabled ? '已启用' : '已禁用'}`);
    }
    console.log('');
    console.log('按 Ctrl+C 停止');
  }).catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
  });
}
