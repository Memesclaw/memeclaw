import fs from 'fs';
import path from 'path';
import { getDataDir, getSessionsDir } from './sqlite';

/**
 * 会话类型
 */
export type SessionChannel = 'cli' | 'telegram' | 'web';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  userId?: string;
  channel?: SessionChannel;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: SessionMessage[];
  metadata?: Record<string, any>;
}

/**
 * 会话存储 - JSONL 格式
 * 参考 OpenClaw: src/config/sessions/store.ts
 */
export class SessionStore {
  private sessionsDir: string;

  constructor(sessionsDir?: string) {
    this.sessionsDir = sessionsDir || getSessionsDir();
  }

  /**
   * 获取会话文件路径
   */
  private getSessionPath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.jsonl`);
  }

  /**
   * 加载会话
   */
  load(sessionId: string): Session | null {
    const sessionPath = this.getSessionPath(sessionId);

    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    const messages: SessionMessage[] = [];
    let sessionData: Partial<Session> = {};

    const lines = fs.readFileSync(sessionPath, 'utf8').split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        if (data.type === 'session') {
          sessionData = data;
        } else if (data.type === 'message') {
          messages.push({
            id: data.id,
            role: data.role,
            content: data.content,
            timestamp: data.timestamp,
            metadata: data.metadata,
          });
        }
      } catch (e) {
        console.error('Failed to parse session line:', line);
      }
    }

    if (!sessionData.id) {
      return null;
    }

    return {
      id: sessionData.id,
      userId: sessionData.userId,
      channel: sessionData.channel || 'cli',
      model: sessionData.model || 'claude-opus-4-6',
      createdAt: sessionData.createdAt || Date.now(),
      updatedAt: sessionData.updatedAt || Date.now(),
      messages,
      metadata: sessionData.metadata,
    };
  }

  /**
   * 保存会话
   */
  save(session: Session): void {
    const sessionPath = this.getSessionPath(session.id);

    const lines: string[] = [];

    // 写入会话元数据
    lines.push(JSON.stringify({
      type: 'session',
      id: session.id,
      userId: session.userId,
      channel: session.channel,
      model: session.model,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata,
    }));

    // 写入所有消息
    for (const msg of session.messages) {
      lines.push(JSON.stringify({
        type: 'message',
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      }));
    }

    fs.writeFileSync(sessionPath, lines.join('\n') + '\n');
  }

  /**
   * 添加消息到会话
   */
  addMessage(sessionId: string, message: SessionMessage): void {
    const session = this.load(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.messages.push(message);
    session.updatedAt = Date.now();
    this.save(session);
  }

  /**
   * 创建新会话
   */
  create(config: {
    id?: string;
    userId?: string;
    channel: SessionChannel;
    model?: string;
  }): Session {
    const id = config.id || this.generateId();

    const session: Session = {
      id,
      userId: config.userId,
      channel: config.channel,
      model: config.model || 'claude-opus-4-6',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    this.save(session);
    return session;
  }

  /**
   * 列出所有会话
   */
  list(): Session[] {
    const sessions: Session[] = [];

    if (!fs.existsSync(this.sessionsDir)) {
      return sessions;
    }

    const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.jsonl'));

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const session = this.load(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 删除会话
   */
  delete(sessionId: string): void {
    const sessionPath = this.getSessionPath(sessionId);

    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }
  }

  /**
   * 生成会话 ID
   */
  private generateId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理旧会话
   */
  cleanup(beforeDate: number): number {
    let deleted = 0;
    const sessions = this.list();

    for (const session of sessions) {
      if (session.updatedAt < beforeDate) {
        this.delete(session.id);
        deleted++;
      }
    }

    return deleted;
  }
}

/**
 * 单例会话存储实例
 */
let sessionStore: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (!sessionStore) {
    sessionStore = new SessionStore();
  }
  return sessionStore;
}
