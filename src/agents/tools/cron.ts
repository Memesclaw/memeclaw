/**
 * Cron 定时任务系统
 * 基于 SeekerClaw 的调度器设计
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// 配置
const CRON_FILE = path.join(os.homedir(), '.memeclaw', 'cron.json');
const ERROR_BACKOFF_MS = [30000, 60000, 300000, 900000, 3600000]; // 30s, 1m, 5m, 15m, 1h

/**
 * Cron 调度类型
 */
interface CronSchedule {
  kind: 'at' | 'every' | 'cron';
  atMs?: number;        // 一次性任务的执行时间戳
  everyMs?: number;     // 循环任务的间隔毫秒
  cronExpr?: string;    // 标准 cron 表达式（暂不支持）
}

/**
 * Cron 任务负载
 */
interface CronPayload {
  kind: 'reminder' | 'agentTurn';
  message: string;
  channel?: string;     // 发送渠道（telegram, websocket）
  to?: string;          // 目标地址/ID
}

/**
 * Cron 任务状态
 */
interface CronJobState {
  nextRunAtMs: number;
  lastRunAtMs?: number;
  lastStatus?: 'success' | 'error' | 'skipped';
  lastError?: string;
  consecutiveErrors: number;
}

/**
 * Cron 任务
 */
export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  schedule: CronSchedule;
  payload: CronPayload;
  state: CronJobState;
}

/**
 * 回调函数类型
 */
type CronCallback = (job: CronJob) => Promise<void>;

/**
 * Cron 调度器
 */
class CronScheduler {
  private jobs: CronJob[] = [];
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private callback: CronCallback | null = null;
  private initialized = false;

  /**
   * 设置任务执行回调
   */
  setCallback(callback: CronCallback): void {
    this.callback = callback;
  }

  /**
   * 加载任务
   */
  private loadJobs(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (fs.existsSync(CRON_FILE)) {
        const data = fs.readFileSync(CRON_FILE, 'utf-8');
        this.jobs = JSON.parse(data);
      }
    } catch (error) {
      console.error('加载 Cron 任务失败:', error);
      this.jobs = [];
    }
  }

  /**
   * 保存任务
   */
  private saveJobs(): void {
    try {
      const dir = path.dirname(CRON_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CRON_FILE, JSON.stringify(this.jobs, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存 Cron 任务失败:', error);
    }
  }

  /**
   * 生成任务 ID
   */
  private generateId(): string {
    return `cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 计算下次运行时间
   */
  private computeNextRun(schedule: CronSchedule, fromMs: number): number {
    switch (schedule.kind) {
      case 'at':
        return schedule.atMs || fromMs;

      case 'every':
        if (schedule.everyMs) {
          // 对齐到间隔
          const interval = schedule.everyMs;
          const remainder = fromMs % interval;
          return fromMs + (interval - remainder);
        }
        return fromMs;

      case 'cron':
        // TODO: 实现标准 cron 表达式解析
        return fromMs + 60000; // 默认 1 分钟后

      default:
        return fromMs;
    }
  }

  /**
   * 创建任务
   */
  create(input: {
    name: string;
    schedule: {
      kind: 'at' | 'every';
      at?: string;      // ISO 时间字符串或相对时间（如 "in 30 minutes"）
      every?: string;   // 间隔描述（如 "2 hours"）
    };
    payload: {
      kind: 'reminder' | 'agentTurn';
      message: string;
      channel?: string;
      to?: string;
    };
  }): CronJob {
    const now = Date.now();
    let schedule: CronSchedule;

    // 解析调度
    if (input.schedule.kind === 'at') {
      const atTime = this.parseTime(input.schedule.at || 'now');
      schedule = {
        kind: 'at',
        atMs: atTime.getTime(),
      };
    } else if (input.schedule.kind === 'every') {
      const everyMs = this.parseInterval(input.schedule.every || '1 hour');
      schedule = {
        kind: 'every',
        everyMs,
      };
    } else {
      throw new Error('不支持的调度类型');
    }

    const job: CronJob = {
      id: this.generateId(),
      name: input.name,
      enabled: true,
      createdAt: now,
      schedule,
      payload: input.payload,
      state: {
        nextRunAtMs: this.computeNextRun(schedule, now),
        consecutiveErrors: 0,
      },
    };

    this.jobs.push(job);
    this.saveJobs();
    this.armTimer();

    return job;
  }

  /**
   * 解析时间表达式
   */
  private parseTime(expr: string): Date {
    const lower = expr.toLowerCase().trim();
    const now = new Date();

    // "now" 或空
    if (lower === 'now' || lower === '') {
      return now;
    }

    // "in 30 minutes"
    const inMatch = lower.match(/^in\s+(\d+)\s*(second|minute|hour|day)s?$/i);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      const ms: Record<string, number> = {
        second: 1000,
        minute: 60000,
        hour: 3600000,
        day: 86400000,
      };
      return new Date(now.getTime() + amount * ms[unit]);
    }

    // ISO 时间字符串
    const isoDate = new Date(expr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // "tomorrow at 9am"
    if (lower.startsWith('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const timeMatch = lower.match(/at\s+(\d+)(?::(\d+))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3]?.toLowerCase();

        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;

        tomorrow.setHours(hours, minutes, 0, 0);
      }

      return tomorrow;
    }

    // 默认：尝试解析为时间
    return now;
  }

  /**
   * 解析间隔表达式
   */
  private parseInterval(expr: string): number {
    const lower = expr.toLowerCase().trim();

    const match = lower.match(/^(\d+)\s*(second|minute|hour|day)s?$/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const ms: Record<string, number> = {
        second: 1000,
        minute: 60000,
        hour: 3600000,
        day: 86400000,
      };
      return amount * ms[unit];
    }

    // 默认：1 小时
    return 3600000;
  }

  /**
   * 列出任务
   */
  list(filter?: { enabled?: boolean }): CronJob[] {
    let result = [...this.jobs];

    if (filter?.enabled !== undefined) {
      result = result.filter(j => j.enabled === filter.enabled);
    }

    return result.sort((a, b) => a.state.nextRunAtMs - b.state.nextRunAtMs);
  }

  /**
   * 获取任务
   */
  get(id: string): CronJob | undefined {
    return this.jobs.find(j => j.id === id);
  }

  /**
   * 更新任务
   */
  update(id: string, updates: Partial<Pick<CronJob, 'name' | 'enabled'>>): CronJob | null {
    const job = this.jobs.find(j => j.id === id);
    if (!job) return null;

    if (updates.name !== undefined) job.name = updates.name;
    if (updates.enabled !== undefined) job.enabled = updates.enabled;

    this.saveJobs();
    this.armTimer();

    return job;
  }

  /**
   * 删除任务
   */
  delete(id: string): boolean {
    const index = this.jobs.findIndex(j => j.id === id);
    if (index === -1) return false;

    this.jobs.splice(index, 1);
    this.saveJobs();
    this.armTimer();

    return true;
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.armTimer();
    console.log('🕐 Cron 调度器已启动');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('🕐 Cron 调度器已停止');
  }

  /**
   * 武装定时器
   */
  private armTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.running) return;

    // 找到最早的待执行任务
    const enabledJobs = this.jobs.filter(j => j.enabled);
    if (enabledJobs.length === 0) return;

    const nextJob = enabledJobs.reduce((earliest, job) => {
      if (!earliest || job.state.nextRunAtMs < earliest.state.nextRunAtMs) {
        return job;
      }
      return earliest;
    }, null as CronJob | null);

    if (!nextJob) return;

    const delay = Math.max(0, nextJob.state.nextRunAtMs - Date.now());

    // 限制最大延迟（约 24 天）
    const maxDelay = 2147483647;
    const actualDelay = Math.min(delay, maxDelay);

    this.timer = setTimeout(() => this.onTimer(), actualDelay);
  }

  /**
   * 定时器回调
   */
  private async onTimer(): Promise<void> {
    if (!this.running) return;

    const now = Date.now();
    const dueJobs = this.jobs.filter(j =>
      j.enabled && j.state.nextRunAtMs <= now
    );

    for (const job of dueJobs) {
      try {
        await this.executeJob(job);
        job.state.consecutiveErrors = 0;
        job.state.lastStatus = 'success';
      } catch (error: any) {
        job.state.consecutiveErrors++;
        job.state.lastStatus = 'error';
        job.state.lastError = error.message;

        // 指数退避
        const backoffIdx = Math.min(job.state.consecutiveErrors - 1, ERROR_BACKOFF_MS.length - 1);
        const backoff = ERROR_BACKOFF_MS[backoffIdx];

        if (job.schedule.kind === 'every') {
          job.state.nextRunAtMs = now + backoff;
        }
      }

      job.state.lastRunAtMs = now;

      // 计算下次运行时间
      if (job.schedule.kind === 'every') {
        job.state.nextRunAtMs = this.computeNextRun(job.schedule, now);
      } else {
        // 一次性任务执行后禁用
        job.enabled = false;
      }
    }

    this.saveJobs();
    this.armTimer();
  }

  /**
   * 执行任务
   */
  private async executeJob(job: CronJob): Promise<void> {
    if (this.callback) {
      await this.callback(job);
    } else {
      console.log(`🔔 执行任务: ${job.name} - ${job.payload.message}`);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    running: boolean;
    jobCount: number;
    enabledCount: number;
    nextRunAt?: number;
  } {
    const enabledJobs = this.jobs.filter(j => j.enabled);
    const nextJob = enabledJobs.reduce((earliest, job) => {
      if (!earliest || job.state.nextRunAtMs < earliest.state.nextRunAtMs) {
        return job;
      }
      return earliest;
    }, null as CronJob | null);

    return {
      running: this.running,
      jobCount: this.jobs.length,
      enabledCount: enabledJobs.length,
      nextRunAt: nextJob?.state.nextRunAtMs,
    };
  }
}

// 单例实例
export const cronScheduler = new CronScheduler();

// 工具定义（用于 Claude API）
export const CRON_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'cron_create',
      description: '创建定时任务。支持一次性提醒和循环任务。',
      parameters: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string',
            description: '任务名称',
          },
          schedule: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: ['at', 'every'],
                description: 'at=一次性, every=循环',
              },
              at: {
                type: 'string',
                description: '执行时间，如 "in 30 minutes", "tomorrow at 9am"',
              },
              every: {
                type: 'string',
                description: '循环间隔，如 "2 hours", "30 minutes"',
              },
            },
            required: ['kind'],
          },
          payload: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: ['reminder', 'agentTurn'],
                description: 'reminder=简单提醒, agentTurn=让AI执行任务',
              },
              message: {
                type: 'string',
                description: '提醒消息或任务描述',
              },
              channel: {
                type: 'string',
                description: '发送渠道: telegram, websocket',
              },
            },
            required: ['kind', 'message'],
          },
        },
        required: ['name', 'schedule', 'payload'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cron_list',
      description: '列出所有定时任务',
      parameters: {
        type: 'object' as const,
        properties: {
          enabled: {
            type: 'boolean',
            description: '只显示启用/禁用的任务',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cron_cancel',
      description: '取消/删除定时任务',
      parameters: {
        type: 'object' as const,
        properties: {
          id: {
            type: 'string',
            description: '任务 ID',
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cron_status',
      description: '获取调度器状态',
      parameters: {
        type: 'object' as const,
        properties: {},
      },
    },
  },
];

/**
 * 执行 Cron 工具调用
 */
export async function executeCronTool(name: string, args: any): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (name) {
      case 'cron_create': {
        const job = cronScheduler.create(args);
        return {
          success: true,
          result: {
            id: job.id,
            name: job.name,
            nextRunAt: new Date(job.state.nextRunAtMs).toISOString(),
            message: `任务已创建: ${job.name}`,
          },
        };
      }

      case 'cron_list': {
        const jobs = cronScheduler.list(args);
        return {
          success: true,
          result: {
            count: jobs.length,
            jobs: jobs.map(j => ({
              id: j.id,
              name: j.name,
              enabled: j.enabled,
              nextRunAt: new Date(j.state.nextRunAtMs).toISOString(),
              payload: j.payload,
            })),
          },
        };
      }

      case 'cron_cancel': {
        const deleted = cronScheduler.delete(args.id);
        return {
          success: deleted,
          error: deleted ? undefined : '任务不存在',
        };
      }

      case 'cron_status': {
        return {
          success: true,
          result: cronScheduler.getStatus(),
        };
      }

      default:
        return { success: false, error: `未知工具: ${name}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
