import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * MemeClaw 数据存储路径
 */
export function getDataDir(): string {
  const homeDir = os.homedir();
  const dataDir = path.join(homeDir, '.memeclaw');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dataDir;
}

export function getSessionsDir(): string {
  const sessionsDir = path.join(getDataDir(), 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  return sessionsDir;
}

/**
 * 数据库初始化和操作
 */
export class MemeClawDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(getDataDir(), 'memeclaw.db');
    const fullPath = dbPath || defaultPath;

    this.db = new Database(fullPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  /**
   * 初始化数据库表结构
   */
  private initSchema(): void {
    // 会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        channel TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_channel ON sessions(channel);
    `);

    // 消息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);

    // 记忆表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_memory_session_id ON memory(session_id);
      CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory(tags);
    `);
  }

  /**
   * 会话操作
   */
  createSession(session: {
    id: string;
    userId?: string;
    channel: string;
    model: string;
    metadata?: Record<string, any>;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, channel, model, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.userId || null,
      session.channel,
      session.model,
      Date.now(),
      Date.now(),
      session.metadata ? JSON.stringify(session.metadata) : null
    );
  }

  getSession(id: string): Record<string, any> | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      channel: row.channel,
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    };
  }

  updateSessionTime(id: string): void {
    const stmt = this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?');
    stmt.run(Date.now(), id);
  }

  deleteSession(id: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(id);
  }

  listSessions(channel?: string): Record<string, any>[] {
    let query = 'SELECT * FROM sessions';
    const params: any[] = [];

    if (channel) {
      query += ' WHERE channel = ?';
      params.push(channel);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      channel: row.channel,
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  /**
   * 消息操作
   */
  addMessage(message: {
    id: string;
    sessionId: string;
    role: string;
    content: string;
    metadata?: Record<string, any>;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.sessionId,
      message.role,
      message.content,
      Date.now(),
      message.metadata ? JSON.stringify(message.metadata) : null
    );

    // 更新会话时间
    this.updateSessionTime(message.sessionId);
  }

  getMessages(sessionId: string, limit?: number): Record<string, any>[] {
    let query = 'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC';
    const params: any[] = [sessionId];

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  }

  /**
   * 记忆操作
   */
  addMemory(memory: {
    id: string;
    sessionId: string;
    content: string;
    tags?: string[];
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO memory (id, session_id, content, tags, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.sessionId,
      memory.content,
      memory.tags ? JSON.stringify(memory.tags) : null,
      Date.now()
    );
  }

  getMemories(sessionId: string, tag?: string): Record<string, any>[] {
    let query = 'SELECT * FROM memory WHERE session_id = ?';
    const params: any[] = [sessionId];

    if (tag) {
      query += " AND tags LIKE ?";
      params.push(`%"${tag}"%`);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      content: row.content,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
    }));
  }

  /**
   * 清理旧数据
   */
  cleanup(beforeTimestamp: number): void {
    const stmt1 = this.db.prepare('DELETE FROM messages WHERE timestamp < ?');
    stmt1.run(beforeTimestamp);

    const stmt2 = this.db.prepare('DELETE FROM memory WHERE created_at < ?');
    stmt2.run(beforeTimestamp);

    // 删除没有消息的会话
    this.db.exec(`
      DELETE FROM sessions WHERE id NOT IN (SELECT DISTINCT session_id FROM messages)
    `);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

/**
 * 单例数据库实例
 */
let dbInstance: MemeClawDatabase | null = null;

export function getDatabase(): MemeClawDatabase {
  if (!dbInstance) {
    dbInstance = new MemeClawDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
