/**
 * 记忆工具系统
 * 基于 OpenClaw 和 SeekerClaw 的记忆系统设计
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// 记忆系统配置
const MEMORY_DIR = path.join(os.homedir(), '.memeclaw', 'workspace');
const MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md');
const DAILY_MEMORY_DIR = path.join(MEMORY_DIR, 'memory');
const SESSIONS_DIR = path.join(os.homedir(), '.memeclaw', 'sessions');

// 注入限制（与 OpenClaw 一致）
const MAX_MEMORY_INJECT = 3000; // MEMORY.md 最大注入字符数
const MAX_DAILY_INJECT = 1500; // 每日记忆最大注入字符数
const MAX_SESSION_SUMMARY = 5; // 最近会话数量

/**
 * 初始化记忆系统
 */
export function initMemorySystem(): void {
  // 确保目录存在
  [MEMORY_DIR, DAILY_MEMORY_DIR, SESSIONS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * 保存长期记忆到 MEMORY.md
 */
export async function saveMemory(content: string): Promise<{ success: boolean; error?: string }> {
  try {
    initMemorySystem();

    const timestamp = new Date().toISOString();
    const entry = `\n\n### ${timestamp.split('T')[0]} ${timestamp.split('T')[1].slice(0, 5)}\n${content}\n---`;

    // 追加到 MEMORY.md
    fs.appendFileSync(MEMORY_FILE, entry, 'utf-8');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 写入每日日志
 */
export async function writeDailyNote(content: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    initMemorySystem();

    const today = new Date().toISOString().split('T')[0];
    const dailyFile = path.join(DAILY_MEMORY_DIR, `${today}.md`);
    const timestamp = new Date().toTimeString().slice(0, 8);

    const entry = `\n## ${timestamp}\n${content}`;

    // 追加到今日日志
    fs.appendFileSync(dailyFile, entry, 'utf-8');

    return { success: true, path: dailyFile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 读取记忆文件
 */
export async function readMemory(file: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    let filePath: string;

    if (file === 'MEMORY.md') {
      filePath = MEMORY_FILE;
    } else if (file.startsWith('daily:')) {
      const date = file.slice(6);
      filePath = path.join(DAILY_MEMORY_DIR, `${date}.md`);
    } else {
      filePath = path.join(MEMORY_DIR, file);
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: `文件不存在: ${file}` };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 简单关键词搜索记忆（未来可升级为向量搜索）
 */
export async function searchMemory(query: string): Promise<{ success: boolean; results?: Array<{ file: string; snippet: string }>; error?: string }> {
  try {
    initMemorySystem();

    const results: Array<{ file: string; snippet: string }> = [];
    const lowerQuery = query.toLowerCase();

    // 搜索 MEMORY.md
    if (fs.existsSync(MEMORY_FILE)) {
      const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length, i + 2);
          const snippet = lines.slice(start, end).join('\n');
          results.push({ file: 'MEMORY.md', snippet });
          if (results.length >= 5) break;
        }
      }
    }

    // 搜索最近的每日日志
    if (results.length < 5) {
      const dailyFiles = fs.readdirSync(DAILY_MEMORY_DIR)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 7);

      for (const file of dailyFiles) {
        if (results.length >= 5) break;

        const filePath = path.join(DAILY_MEMORY_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.toLowerCase().includes(lowerQuery)) {
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(lowerQuery)) {
              results.push({ file, snippet: lines.slice(Math.max(0, i - 1), i + 2).join('\n') });
              break;
            }
          }
        }
      }
    }

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取记忆统计
 */
export async function getMemoryStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
  try {
    initMemorySystem();

    const stats = {
      memoryMd: {
        exists: fs.existsSync(MEMORY_FILE),
        size: fs.existsSync(MEMORY_FILE) ? fs.readFileSync(MEMORY_FILE, 'utf-8').length : 0,
        entries: 0
      },
      dailyNotes: {
        count: 0,
        totalSize: 0
      },
      sessions: {
        count: 0
      }
    };

    // 统计 MEMORY.md 条目数
    if (stats.memoryMd.exists) {
      const content = fs.readFileSync(MEMORY_FILE, 'utf-8');
      stats.memoryMd.entries = (content.match(/### \d{4}-\d{2}-\d{2}/g) || []).length;
    }

    // 统计每日日志
    if (fs.existsSync(DAILY_MEMORY_DIR)) {
      const dailyFiles = fs.readdirSync(DAILY_MEMORY_DIR).filter(f => f.endsWith('.md'));
      stats.dailyNotes.count = dailyFiles.length;
      stats.dailyNotes.totalSize = dailyFiles.reduce((sum, file) => {
        return sum + fs.readFileSync(path.join(DAILY_MEMORY_DIR, file), 'utf-8').length;
      }, 0);
    }

    // 统计会话数
    if (fs.existsSync(SESSIONS_DIR)) {
      stats.sessions.count = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json')).length;
    }

    return { success: true, stats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 构建系统提示的记忆部分（用于注入到 Claude API）
 */
export async function buildMemoryBlocks(): Promise<{
  stable: string[];
  dynamic: { [key: string]: string };
}> {
  initMemorySystem();

  const stable: string[] = [];
  const dynamic: { [key: string]: string } = {};

  // 稳定部分：IDENTITY.md, SOUL.md, USER.md
  const identityFile = path.join(MEMORY_DIR, 'IDENTITY.md');
  const soulFile = path.join(MEMORY_DIR, 'SOUL.md');
  const userFile = path.join(MEMORY_DIR, 'USER.md');

  if (fs.existsSync(identityFile)) {
    stable.push(fs.readFileSync(identityFile, 'utf-8'));
  }
  if (fs.existsSync(soulFile)) {
    stable.push(fs.readFileSync(soulFile, 'utf-8'));
  }
  if (fs.existsSync(userFile)) {
    stable.push(fs.readFileSync(userFile, 'utf-8'));
  }

  // 动态部分：MEMORY.md（前 3000 字符）
  if (fs.existsSync(MEMORY_FILE)) {
    const memoryContent = fs.readFileSync(MEMORY_FILE, 'utf-8');
    dynamic.memory = memoryContent.slice(0, MAX_MEMORY_INJECT);
  }

  // 今日每日日志（前 1500 字符）
  const today = new Date().toISOString().split('T')[0];
  const dailyFile = path.join(DAILY_MEMORY_DIR, `${today}.md`);
  if (fs.existsSync(dailyFile)) {
    const dailyContent = fs.readFileSync(dailyFile, 'utf-8');
    dynamic.dailyNote = dailyContent.slice(0, MAX_DAILY_INJECT);
  }

  // 当前时间
  dynamic.currentTime = new Date().toISOString();

  return { stable, dynamic };
}

/**
 * 创建会话摘要
 */
export async function createSessionSummary(sessionId: string, messages: any[], trigger: 'idle' | 'count' | 'time' | 'manual'): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    initMemorySystem();

    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];
    const slug = sessionId.slice(0, 8);
    const summaryFile = path.join(DAILY_MEMORY_DIR, `${today}-${slug}.md`);

    // 生成摘要
    const summary = `# Session Summary — ${timestamp}

> Trigger: ${trigger} | Session: ${sessionId} | Messages: ${messages.length}

## Key Points

${messages.slice(-10).map((m: any) => m.role === 'user' ? `- ${m.content}` : '').join('\n')}

---

`;

    fs.writeFileSync(summaryFile, summary, 'utf-8');

    return { success: true, path: summaryFile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取最近的会话摘要（用于上下文）
 */
export async function getRecentSessions(limit: number = MAX_SESSION_SUMMARY): Promise<string> {
  try {
    initMemorySystem();

    if (!fs.existsSync(DAILY_MEMORY_DIR)) {
      return '';
    }

    const files = fs.readdirSync(DAILY_MEMORY_DIR)
      .filter(f => f.match(/\d{4}-\d{2}-\d{2}-[a-f0-9]+\.md/))
      .sort()
      .reverse()
      .slice(0, limit);

    if (files.length === 0) {
      return '';
    }

    const summaries = files.map(file => {
      const filePath = path.join(DAILY_MEMORY_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // 提取第一行（标题和时间戳）
      const title = lines[0] || '';
      // 提取 trigger 行
      const triggerLine = lines.find((l: string) => l.startsWith('>')) || '';

      return `${title}\n${triggerLine}`;
    }).join('\n\n');

    return summaries;
  } catch (error) {
    return '';
  }
}

// 工具定义（用于 Claude API）
export const MEMORY_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'memory_save',
      description: '保存重要信息到长期记忆（MEMORY.md）。用于记录用户偏好、重要事件、学习内容等。',
      parameters: {
        type: 'object' as const,
        properties: {
          content: {
            type: 'string',
            description: '要保存的记忆内容',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'daily_note',
      description: '写入今日日志（memory/YYYY-MM-DD.md）。用于记录当天的活动、笔记、临时信息等。',
      parameters: {
        type: 'object' as const,
        properties: {
          content: {
            type: 'string',
            description: '日志内容',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'memory_read',
      description: '读取记忆文件内容。支持读取 MEMORY.md 或每日日志（如 daily:2024-03-11）。',
      parameters: {
        type: 'object' as const,
        properties: {
          file: {
            type: 'string',
            description: '文件名，如 "MEMORY.md" 或 "daily:2024-03-11"',
          },
        },
        required: ['file'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'memory_search',
      description: '在长期记忆和每日日志中搜索关键词。返回匹配的片段。',
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'memory_stats',
      description: '获取记忆系统统计信息，包括记忆条目数、文件大小等。',
      parameters: {
        type: 'object' as const,
        properties: {},
      },
    },
  },
];

/**
 * 执行记忆工具调用
 */
export async function executeMemoryTool(name: string, args: any): Promise<{ success: boolean; result?: any; error?: string }> {
  switch (name) {
    case 'memory_save':
      return await saveMemory(args.content);

    case 'daily_note':
      return await writeDailyNote(args.content);

    case 'memory_read':
      return await readMemory(args.file);

    case 'memory_search':
      return await searchMemory(args.query);

    case 'memory_stats':
      return await getMemoryStats();

    default:
      return { success: false, error: `未知工具: ${name}` };
  }
}
