/**
 * 上下文管理器 - 管理对话历史的上下文窗口
 */

import { Message } from '../types';

export interface ContextConfig {
  maxMessages: number;       // 最大消息数量
  maxTokens: number;         // 最大 token 数量（估算）
  summaryThreshold: number;  // 触发摘要的消息数阈值
  keepRecentMessages: number;// 始终保留的最近消息数
}

const DEFAULT_CONFIG: ContextConfig = {
  maxMessages: 50,
  maxTokens: 32000, // 约 24k tokens for context
  summaryThreshold: 30,
  keepRecentMessages: 10,
};

/**
 * 估算文本的 token 数量
 * 简单估算：英文约 4 字符 = 1 token，中文约 1.5 字符 = 1 token
 */
export function estimateTokens(text: string): number {
  // 统计中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 统计其他字符
  const otherChars = text.length - chineseChars;

  // 中文：1.5 字符/token，英文：4 字符/token
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 上下文管理器
 */
export class ContextManager {
  private config: ContextConfig;
  private summary: string = '';

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 裁剪消息历史以适应上下文窗口
   */
  public trimMessages(messages: Message[]): Message[] {
    if (messages.length <= this.config.maxMessages) {
      return messages;
    }

    // 保留最近的 N 条消息
    const recentMessages = messages.slice(-this.config.keepRecentMessages);

    // 获取需要摘要的旧消息
    const oldMessages = messages.slice(0, -this.config.keepRecentMessages);

    // 如果旧消息很多，生成摘要
    if (oldMessages.length > this.config.summaryThreshold) {
      this.summary = this.generateSummary(oldMessages);
    }

    return recentMessages;
  }

  /**
   * 生成消息摘要
   */
  private generateSummary(messages: Message[]): string {
    const parts: string[] = ['[历史对话摘要]'];

    let currentRole = '';
    let currentContent: string[] = [];

    for (const msg of messages) {
      if (msg.role !== currentRole) {
        if (currentContent.length > 0) {
          parts.push(`${currentRole === 'user' ? '用户' : '助手'}: ${currentContent.join(' ').substring(0, 200)}...`);
        }
        currentRole = msg.role;
        currentContent = [msg.content];
      } else {
        currentContent.push(msg.content);
      }
    }

    // 添加最后一组
    if (currentContent.length > 0) {
      parts.push(`${currentRole === 'user' ? '用户' : '助手'}: ${currentContent.join(' ').substring(0, 200)}...`);
    }

    return parts.join('\n');
  }

  /**
   * 获取当前摘要
   */
  public getSummary(): string {
    return this.summary;
  }

  /**
   * 检查是否需要摘要
   */
  public needsSummary(messages: Message[]): boolean {
    return messages.length > this.config.summaryThreshold;
  }

  /**
   * 计算消息列表的总 token 数
   */
  public countTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
  }

  /**
   * 智能裁剪 - 考虑 token 限制
   */
  public smartTrim(messages: Message[]): { messages: Message[]; summary?: string } {
    const totalTokens = this.countTokens(messages);

    if (totalTokens <= this.config.maxTokens && messages.length <= this.config.maxMessages) {
      return { messages };
    }

    // 需要裁剪
    let trimmedMessages = [...messages];
    let finalSummary = this.summary;

    while (
      this.countTokens(trimmedMessages) > this.config.maxTokens ||
      trimmedMessages.length > this.config.maxMessages
    ) {
      // 每次移除最旧的一对消息（用户+助手）
      if (trimmedMessages.length > this.config.keepRecentMessages + 2) {
        trimmedMessages = trimmedMessages.slice(2);
      } else {
        break;
      }
    }

    // 生成摘要
    if (messages.length > trimmedMessages.length) {
      const removedMessages = messages.slice(0, messages.length - trimmedMessages.length);
      finalSummary = this.generateSummary(removedMessages);
    }

    return {
      messages: trimmedMessages,
      summary: finalSummary,
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 默认上下文管理器实例
export const contextManager = new ContextManager();
