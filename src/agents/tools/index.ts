/**
 * MemeClaw 工具系统
 * 整合所有工具：记忆、Cron、BNB、通用工具
 */

import { MEMORY_TOOLS, executeMemoryTool } from './memory';
import { CRON_TOOLS, executeCronTool } from './cron';
import { BNB_TOOLS, executeBnbTool } from './bnb';

// 重新导出所有工具
export * from './memory';
export * from './cron';
export * from './bnb';

/**
 * 获取所有工具定义
 */
export function getAllTools(): any[] {
  return [
    ...MEMORY_TOOLS,
    ...CRON_TOOLS,
    ...BNB_TOOLS,
    // 通用工具可以继续添加...
  ];
}

/**
 * 执行工具调用（路由到对应的执行器）
 */
export async function executeTool(name: string, args: any): Promise<{ success: boolean; result?: any; error?: string }> {
  // 记忆工具
  if (name.startsWith('memory_') || name === 'daily_note') {
    return await executeMemoryTool(name, args);
  }

  // Cron 工具
  if (name.startsWith('cron_')) {
    return await executeCronTool(name, args);
  }

  // BNB 工具
  if (name.startsWith('bnb_')) {
    return await executeBnbTool(name, args);
  }

  return { success: false, error: `未知工具: ${name}` };
}

/**
 * 工具分类信息
 */
export const TOOL_CATEGORIES = {
  memory: {
    name: '记忆系统',
    tools: ['memory_save', 'memory_read', 'memory_search', 'daily_note', 'memory_stats'],
    description: '长期记忆和每日日志管理',
  },
  cron: {
    name: '定时任务',
    tools: ['cron_create', 'cron_list', 'cron_cancel', 'cron_status'],
    description: '创建和管理定时提醒',
  },
  bnb: {
    name: 'BNB Chain',
    tools: [
      'bnb_balance',
      'bnb_token_balance',
      'bnb_price',
      'bnb_gas',
      'bnb_token_info',
      'bnb_history',
      'bnb_token_search',
      'bnb_holdings',
      'bnb_common_tokens',
    ],
    description: 'BNB Chain 区块链操作',
  },
};

/**
 * 获取工具类别列表
 */
export function getToolCategories(): typeof TOOL_CATEGORIES {
  return TOOL_CATEGORIES;
}

/**
 * 根据类别获取工具
 */
export function getToolsByCategory(category: keyof typeof TOOL_CATEGORIES): string[] {
  return TOOL_CATEGORIES[category]?.tools || [];
}
