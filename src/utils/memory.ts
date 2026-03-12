import fs from 'fs';
import path from 'path';
import { Message, Session } from '../types';

/**
 * 记忆存���配置
 */
export interface MemoryConfig {
  type: 'memory' | 'file' | 'database';
  path?: string;
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

/**
 * 记忆条目
 */
export interface MemoryEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl?: number;
  metadata?: Record<string, any>;
}

/**
 * 记忆管理器 - 持久化存储和检索
 */
export class MemoryManager {
  private config: MemoryConfig;
  private memory: Map<string, MemoryEntry> = new Map();
  private filePath: string | null = null;

  constructor(config: MemoryConfig) {
    this.config = config;

    if (config.type === 'file' && config.path) {
      this.filePath = path.resolve(config.path);
      this.loadFromFile();
    }
  }

  /**
   * 存储记忆
   */
  public set(key: string, value: any, ttl?: number, metadata?: Record<string, any>): void {
    const entry: MemoryEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      metadata,
    };

    this.memory.set(key, entry);

    if (this.config.type === 'file' && this.filePath) {
      this.saveToFile();
    }
  }

  /**
   * 获取记忆
   */
  public get(key: string): any | null {
    const entry = this.memory.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * 删除记忆
   */
  public delete(key: string): boolean {
    const deleted = this.memory.delete(key);

    if (deleted && this.config.type === 'file' && this.filePath) {
      this.saveToFile();
    }

    return deleted;
  }

  /**
   * 检查记忆是否存在
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取所有记忆
   */
  public getAll(): MemoryEntry[] {
    const now = Date.now();
    const valid: MemoryEntry[] = [];

    for (const entry of this.memory.values()) {
      if (!entry.ttl || now - entry.timestamp <= entry.ttl) {
        valid.push(entry);
      }
    }

    return valid;
  }

  /**
   * 按前缀获取记忆
   */
  public getByPrefix(prefix: string): MemoryEntry[] {
    return this.getAll().filter(entry => entry.key.startsWith(prefix));
  }

  /**
   * 搜索记忆
   */
  public search(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase();

    return this.getAll().filter(entry =>
      entry.key.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(entry.value).toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 清理过期记忆
   */
  public cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memory.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.memory.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0 && this.config.type === 'file' && this.filePath) {
      this.saveToFile();
    }

    return cleaned;
  }

  /**
   * 清空所有记忆
   */
  public clear(): void {
    this.memory.clear();

    if (this.config.type === 'file' && this.filePath) {
      this.saveToFile();
    }
  }

  /**
   * 从文件加载
   */
  private loadFromFile(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      const entries = JSON.parse(data);

      for (const entry of entries) {
        this.memory.set(entry.key, entry);
      }
    } catch (error) {
      console.error('Failed to load memory from file:', error);
    }
  }

  /**
   * 保存到文件
   */
  private saveToFile(): void {
    if (!this.filePath) {
      return;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const entries = Array.from(this.memory.values());
      fs.writeFileSync(this.filePath, JSON.stringify(entries, null, 2));
    } catch (error) {
      console.error('Failed to save memory to file:', error);
    }
  }

  /**
   * 获取记忆大小
   */
  public get size(): number {
    return this.memory.size;
  }
}

/**
 * 会话记忆管理器
 */
export class SessionMemory {
  private memory: MemoryManager;

  constructor(config: MemoryConfig) {
    this.memory = new MemoryManager(config);
  }

  /**
   * 保存会话
   */
  public saveSession(session: Session): void {
    this.memory.set(`session:${session.id}`, session, undefined, {
      updatedAt: Date.now(),
    });
  }

  /**
   * 获取会话
   */
  public getSession(id: string): Session | null {
    return this.memory.get(`session:${id}`);
  }

  /**
   * 获取所有会话
   */
  public getAllSessions(): Session[] {
    const entries = this.memory.getByPrefix('session:');
    return entries.map(e => e.value as Session);
  }

  /**
   * 删除会话
   */
  public deleteSession(id: string): boolean {
    return this.memory.delete(`session:${id}`);
  }

  /**
   * 添加消息到会话
   */
  public addMessage(sessionId: string, message: Message): void {
    const session = this.getSession(sessionId);

    if (session) {
      session.messages.push(message);
      session.updatedAt = Date.now();
      this.saveSession(session);
    }
  }

  /**
   * 获取会话消息
   */
  public getMessages(sessionId: string): Message[] {
    const session = this.getSession(sessionId);
    return session?.messages || [];
  }

  /**
   * 搜索会话历史
   */
  public searchSessions(query: string): Session[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSessions().filter(session => {
      return session.messages.some(msg =>
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 获取记忆管理器
   */
  public getMemory(): MemoryManager {
    return this.memory;
  }
}

/**
 * 技能学习记忆 - 记录用户偏好和学习内容
 */
export class SkillLearningMemory {
  private memory: MemoryManager;

  constructor(config: MemoryConfig) {
    this.memory = new MemoryManager({
      ...config,
      path: config.path ? path.join(path.dirname(config.path), 'skills') : undefined,
    });
  }

  /**
   * 记录技能使用
   */
  public recordSkillUse(skillId: string, context: any): void {
    const key = `skill_use:${skillId}`;
    const existing = this.memory.get(key) || { count: 0, contexts: [] };

    existing.count++;
    existing.contexts.push({
      timestamp: Date.now(),
      context,
    });

    // 保留最近 100 次使用记录
    if (existing.contexts.length > 100) {
      existing.contexts = existing.contexts.slice(-100);
    }

    this.memory.set(key, existing);
  }

  /**
   * 获取技能使用统计
   */
  public getSkillStats(skillId: string): { count: number; lastUsed: number | null } {
    const data = this.memory.get(`skill_use:${skillId}`);

    if (!data) {
      return { count: 0, lastUsed: null };
    }

    const lastUsed = data.contexts.length > 0
      ? data.contexts[data.contexts.length - 1].timestamp
      : null;

    return { count: data.count, lastUsed };
  }

  /**
   * 记录用户偏好
   */
  public setPreference(key: string, value: any): void {
    this.memory.set(`preference:${key}`, value);
  }

  /**
   * 获取用户偏好
   */
  public getPreference(key: string): any {
    return this.memory.get(`preference:${key}`);
  }

  /**
   * 记录学习内容
   */
  public learn(key: string, content: any): void {
    this.memory.set(`learned:${key}`, {
      content,
      learnedAt: Date.now(),
    });
  }

  /**
   * 获取学习内容
   */
  public getLearned(key: string): any | null {
    return this.memory.get(`learned:${key}`);
  }

  /**
   * 搜索学习内容
   */
  public searchLearned(query: string): Array<{ key: string; content: any; learnedAt: number }> {
    const results: Array<{ key: string; content: any; learnedAt: number }> = [];

    for (const entry of this.memory.getAll()) {
      if (entry.key.startsWith('learned:')) {
        const key = entry.key.replace('learned:', '');
        if (key.toLowerCase().includes(query.toLowerCase()) ||
            JSON.stringify(entry.value.content).toLowerCase().includes(query.toLowerCase())) {
          results.push({
            key,
            content: entry.value.content,
            learnedAt: entry.value.learnedAt,
          });
        }
      }
    }

    return results;
  }

  /**
   * 获取所有已学习的内容
   */
  public getAllLearned(): Array<{ key: string; content: any; learnedAt: number }> {
    const results: Array<{ key: string; content: any; learnedAt: number }> = [];

    for (const entry of this.memory.getAll()) {
      if (entry.key.startsWith('learned:')) {
        results.push({
          key: entry.key.replace('learned:', ''),
          content: entry.value.content,
          learnedAt: entry.value.learnedAt,
        });
      }
    }

    return results;
  }
}

/**
 * 创建记忆管理器
 */
export function createMemoryManager(config: MemoryConfig): MemoryManager {
  return new MemoryManager(config);
}

/**
 * 创建会话记忆
 */
export function createSessionMemory(config: MemoryConfig): SessionMemory {
  return new SessionMemory(config);
}

/**
 * 创建技能学习记忆
 */
export function createSkillLearningMemory(config: MemoryConfig): SkillLearningMemory {
  return new SkillLearningMemory(config);
}
