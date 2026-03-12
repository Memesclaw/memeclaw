/**
 * MCP 工具集成 - 内置实用工具
 * MCP = Model Context Protocol，用于扩展 AI 能力
 */

import { skillRegistry } from '../skills';
import { Skill } from '../types';

/**
 * MCP 工具定义
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
  handler: (args: Record<string, any>) => Promise<any>;
}

/**
 * 内置 MCP 工具列表
 */
export const builtinMCPTools: MCPTool[] = [
  // 网络搜索工具
  {
    name: 'web_search',
    description: '搜索网络获取最新信息（价格、新闻、数据）',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询',
        },
        limit: {
          type: 'number',
          description: '返回结果数量，默认5',
        },
      },
      required: ['query'],
    },
    handler: async (args) => {
      // 这里可以集成真实的搜索 API
      // 目前返回模拟结果
      return {
        success: true,
        message: `搜索: "${args.query}"`,
        note: '需要配置搜索 API (如 Serper, Google) 以启用真实搜索',
      };
    },
  },

  // 价格查询工具
  {
    name: 'get_price',
    description: '查询加密货币价格',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: '代币符号 (如 BTC, ETH, SOL)',
        },
        address: {
          type: 'string',
          description: '合约地址（可选）',
        },
      },
      required: ['symbol'],
    },
    handler: async (args) => {
      const { symbol } = args;
      // 可以集成 CoinGecko, DexScreener 等 API
      return {
        success: true,
        symbol: symbol.toUpperCase(),
        note: '需要配置价格 API 以获取实时价格',
        apis: ['CoinGecko', 'DexScreener', 'Birdeye'],
      };
    },
  },

  // 链上数据查询
  {
    name: 'get_onchain_data',
    description: '查询链上数据（余额、交易等）',
    inputSchema: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          description: '链名称 (bsc, eth, sol)',
        },
        address: {
          type: 'string',
          description: '钱包或合约地址',
        },
        action: {
          type: 'string',
          description: '操作类型 (balance, transactions, token_info)',
        },
      },
      required: ['chain', 'address'],
    },
    handler: async (args) => {
      return {
        success: true,
        ...args,
        note: '需要配置 RPC 节点或区块浏览器 API',
      };
    },
  },

  // 技能学习工具
  {
    name: 'learn_skill',
    description: '从对话中学习新技能',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '技能 ID',
        },
        name: {
          type: 'string',
          description: '技能名称',
        },
        description: {
          type: 'string',
          description: '技能描述',
        },
        prompt: {
          type: 'string',
          description: '技能提示词',
        },
        url: {
          type: 'string',
          description: '从 URL 学习（可选）',
        },
      },
      required: ['id', 'name', 'prompt'],
    },
    handler: async (args) => {
      // 动态导入避免循环依赖
      const { learnSkill } = await import('../skills/loader');
      return learnSkill({
        id: args.id,
        name: args.name,
        description: args.description || '',
        prompt: args.prompt,
      });
    },
  },

  // 技能列表
  {
    name: 'list_skills',
    description: '列出所有可用技能',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: '按分类筛选（可选）',
        },
      },
    },
    handler: async (args) => {
      const skills = args.category
        ? skillRegistry.getByCategory(args.category)
        : skillRegistry.getAll();

      return {
        success: true,
        skills: skills.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
        })),
      };
    },
  },

  // 会话管理
  {
    name: 'manage_session',
    description: '管理当前会话',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: '操作: reset, summarize, export',
        },
      },
      required: ['action'],
    },
    handler: async (args) => {
      return {
        success: true,
        action: args.action,
        note: '会话操作由 Agent 处理',
      };
    },
  },
];

/**
 * MCP 工具管理器
 */
export class MCPToolManager {
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    // 注册内置工具
    for (const tool of builtinMCPTools) {
      this.register(tool);
    }
  }

  /**
   * 注册工具
   */
  public register(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取工具
   */
  public get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  public getAll(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 执行工具
   */
  public async execute(name: string, args: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool not found: ${name}` };
    }

    try {
      return await tool.handler(args);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取工具的 OpenAI function calling 格式
   */
  public getOpenAITools(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * 获取工具的 Anthropic tools 格式
   */
  public getAnthropicTools(): Array<{
    name: string;
    description: string;
    input_schema: any;
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }
}

// 全局 MCP 工具管理器
export const mcpToolManager = new MCPToolManager();

/**
 * 将 MCP 工具转换为技能
 */
export function mcpToolsToSkills(): void {
  for (const tool of builtinMCPTools) {
    const skill: Skill = {
      id: `mcp-${tool.name}`,
      name: tool.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: tool.description,
      category: 'custom',
      enabled: true,
      handler: async (input) => {
        return mcpToolManager.execute(tool.name, input);
      },
    };

    skillRegistry.register(skill);
  }
}

// 自动注册 MCP 工具为技能
mcpToolsToSkills();
