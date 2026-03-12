/**
 * Function Calling 支持
 * 让 AI 可以自动调用工具
 */

import { ChatMessage } from './client';
import { mcpToolManager } from '../agent/mcp-tools';

// OpenAI 格式的工具定义
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
}

// 工具调用请求
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// 扩展的聊天响应（包含工具调用）
export interface ChatResponseWithTools {
  content: string;
  model: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 获取内置工具定义（OpenAI 格式）
 */
export function getBuiltinTools(): ToolDefinition[] {
  return [
    // 学习技能
    {
      type: 'function',
      function: {
        name: 'learn_skill',
        description: '学习新技能并保存到技能库��当用户希望 AI 记住某个能力或知识时使用。',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '技能 ID，用英文和连字符，如 price-analyzer',
            },
            name: {
              type: 'string',
              description: '技能名称，中文，如 价格分析器',
            },
            description: {
              type: 'string',
              description: '技能描述',
            },
            prompt: {
              type: 'string',
              description: '技能的完整提示词，告诉 AI 如何执行这个技能',
            },
          },
          required: ['id', 'name', 'prompt'],
        },
      },
    },

    // 读写文件
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: '读取本地文件内容',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文件路径，可以是绝对路径或相对于 ~/.memeclaw/ 的路径',
            },
          },
          required: ['path'],
        },
      },
    },

    {
      type: 'function',
      function: {
        name: 'write_file',
        description: '写入内容到本地文件',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文件路径',
            },
            content: {
              type: 'string',
              description: '文件内容',
            },
          },
          required: ['path', 'content'],
        },
      },
    },

    // 列出文件
    {
      type: 'function',
      function: {
        name: 'list_files',
        description: '列出目录下的文件',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '目录路径，默认为 ~/.memeclaw/',
            },
          },
        },
      },
    },

    // 删除技能
    {
      type: 'function',
      function: {
        name: 'delete_skill',
        description: '删除已学习的技能',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '要删除的技能 ID',
            },
          },
          required: ['id'],
        },
      },
    },

    // 搜索网络
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: '搜索网络获取最新信息',
        parameters: {
          type: 'object',
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

    // 获取价格
    {
      type: 'function',
      function: {
        name: 'get_crypto_price',
        description: '查询加密货币价格',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: '代币符号，如 BTC, ETH, SOL, BNB',
            },
          },
          required: ['symbol'],
        },
      },
    },

    // 天气查询
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '查询城市天气',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '城市名称',
            },
          },
          required: ['city'],
        },
      },
    },

    // 读取配置
    {
      type: 'function',
      function: {
        name: 'read_config',
        description: '读取当前系统配置（AI 自配置能力）',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },

    // 写入配置
    {
      type: 'function',
      function: {
        name: 'write_config',
        description: '更新系统配置（AI 自配置能力），修改后需要重启生效',
        parameters: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'AI 模型名称',
            },
            apiEndpoint: {
              type: 'string',
              description: 'API 端点地址',
            },
          },
        },
      },
    },
  ];
}

/**
 * 执行工具调用
 */
export async function executeToolCall(toolCall: ToolCall): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const { name, arguments: argsStr } = toolCall.function;

  let args: Record<string, any> = {};
  try {
    args = JSON.parse(argsStr);
  } catch {
    return { success: false, error: 'Invalid JSON arguments' };
  }

  try {
    switch (name) {
      case 'learn_skill': {
        const { learnSkill } = await import('../skills/loader');
        const result = learnSkill({
          id: args.id,
          name: args.name,
          description: args.description || '',
          prompt: args.prompt,
        });
        return { success: true, result };
      }

      case 'read_file': {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        let filePath = args.path;
        if (!path.default.isAbsolute(filePath)) {
          filePath = path.default.join(os.default.homedir(), '.memeclaw', filePath);
        }

        if (!fs.default.existsSync(filePath)) {
          return { success: false, error: `File not found: ${filePath}` };
        }

        const content = fs.default.readFileSync(filePath, 'utf-8');
        return { success: true, result: { content, path: filePath } };
      }

      case 'write_file': {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        let filePath = args.path;
        if (!path.default.isAbsolute(filePath)) {
          filePath = path.default.join(os.default.homedir(), '.memeclaw', filePath);
        }

        // 确保目录存在
        const dir = path.default.dirname(filePath);
        if (!fs.default.existsSync(dir)) {
          fs.default.mkdirSync(dir, { recursive: true });
        }

        fs.default.writeFileSync(filePath, args.content, 'utf-8');
        return { success: true, result: { path: filePath, written: true } };
      }

      case 'list_files': {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        let dirPath = args.path || '';
        if (!path.default.isAbsolute(dirPath)) {
          dirPath = path.default.join(os.default.homedir(), '.memeclaw', dirPath);
        }

        if (!fs.default.existsSync(dirPath)) {
          return { success: false, error: `Directory not found: ${dirPath}` };
        }

        const files = fs.default.readdirSync(dirPath).map(file => {
          const fullPath = path.default.join(dirPath, file);
          const stat = fs.default.statSync(fullPath);
          return {
            name: file,
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtime,
          };
        });

        return { success: true, result: { path: dirPath, files } };
      }

      case 'delete_skill': {
        const { forgetSkill } = await import('../skills/loader');
        const result = forgetSkill(args.id);
        return { success: result.success, result, error: result.error };
      }

      case 'web_search': {
        // 使用 DuckDuckGo HTML 搜索（免费，无需 API Key）
        try {
          const query = encodeURIComponent(args.query);
          const response = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!response.ok) {
            throw new Error(`搜索失败: ${response.status}`);
          }

          const html = await response.text();

          // 简单解析搜索结果
          const results: { title: string; snippet: string; url: string }[] = [];
          const resultRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__url"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

          let match;
          while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
            results.push({
              title: match[1].trim(),
              url: match[2].trim(),
              snippet: match[3].replace(/<[^>]+>/g, '').trim().substring(0, 200)
            });
          }

          if (results.length === 0) {
            // 备用：简单提取
            const links = html.match(/<a[^>]*class="[^"]*result[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi);
            if (links) {
              for (let i = 0; i < Math.min(links.length, 5); i++) {
                const urlMatch = links[i].match(/href="([^"]+)"/);
                const titleMatch = links[i].match(/>([^<]+)<\/a>/);
                if (urlMatch && titleMatch) {
                  results.push({
                    title: titleMatch[1].trim(),
                    url: urlMatch[1],
                    snippet: ''
                  });
                }
              }
            }
          }

          return {
            success: true,
            result: {
              query: args.query,
              results: results.length > 0 ? results : [{ title: '搜索完成', snippet: '未能解析结果，请尝试其他关键词', url: '' }],
              source: 'DuckDuckGo'
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: `搜索失败: ${error.message}. 可能需要检查网络连接。`
          };
        }
      }

      case 'get_crypto_price': {
        // 加密货币价格查询 - 由于国内网络限制，需要代理
        try {
          const symbol = args.symbol.toUpperCase();

          // 尝试多个 API 源
          const apis = [
            {
              name: 'Binance',
              url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
              parse: (data: any) => ({ price: parseFloat(data.price), pair: `${symbol}USDT` })
            },
            {
              name: 'OKX',
              url: `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`,
              parse: (data: any) => ({ price: parseFloat(data.data?.[0]?.last), pair: `${symbol}-USDT` })
            }
          ];

          let lastError: string | null = null;

          for (const api of apis) {
            try {
              const response = await fetch(api.url, {
                signal: AbortSignal.timeout(8000)
              });

              if (response.ok) {
                const data = await response.json();
                const { price } = api.parse(data);

                if (price && !isNaN(price)) {
                  return {
                    success: true,
                    result: {
                      symbol,
                      price,
                      currency: 'USDT',
                      exchange: api.name,
                      timestamp: Date.now(),
                      note: '价格仅供参考，实际交易请以交易所为准'
                    }
                  };
                }
              }
            } catch (e: any) {
              lastError = e.message;
              continue; // 尝试下一个 API
            }
          }

          // 所有 API 都失败了
          return {
            success: false,
            error: `无法获取 ${symbol} 价格。可能原因：\n1. 网络连接问题\n2. 国内无法直接访问加密货币 API\n3. 需要配置代理\n\n建议：请直接访问 coinmarketcap.com 或 coingecko.com 查询价格。`
          };
        } catch (error: any) {
          return {
            success: false,
            error: `获取价格失败: ${error.message}`
          };
        }
      }

      case 'get_weather': {
        // 使用免费的 Open-Meteo API（无需 API Key）
        try {
          const city = args.city;

          // 1. 地理编码获取坐标
          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`
          );

          if (!geoResponse.ok) {
            throw new Error(`地理编码失败: ${geoResponse.status}`);
          }

          const geoData = await geoResponse.json() as any;

          if (!geoData.results?.length) {
            return {
              success: false,
              error: `找不到城市: ${city}。请检查城市名称是否正确。`
            };
          }

          const { latitude, longitude, name, country } = geoData.results[0];

          // 2. 获取天气数据
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
          );

          if (!weatherResponse.ok) {
            throw new Error(`天气查询失败: ${weatherResponse.status}`);
          }

          const weatherData = await weatherResponse.json() as any;
          const current = weatherData.current;

          // 天气代码转描述
          const weatherCodes: Record<number, string> = {
            0: '晴', 1: '多云', 2: '阴', 3: '小雨', 45: '雾', 61: '小雪', 63: '中雪', 65: '雨雪'
          };

          return {
            success: true,
            result: {
              city: name,
              country,
              latitude,
              longitude,
              temperature: current.temperature_2m,
              feelsLike: current.apparent_temperature,
              humidity: current.relative_humidity_2m,
              weatherCode: current.weather_code,
              weather: weatherCodes[current.weather_code] || '未知',
              windSpeed: current.wind_speed_10m,
              unit: 'celsius',
              timestamp: Date.now()
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: `天气查询失败: ${error.message}`
          };
        }
      }

      case 'read_config': {
        // 读取系统配置
        try {
          const { loadConfig } = await import('../config/loader');
          const config = loadConfig();

          // 隐藏敏感信息
          const safeConfig = {
            ...config,
            api: config.api ? {
              ...config.api,
              key: config.api.key ? `***${config.api.key.slice(-4)}` : undefined
            } : undefined,
            telegram: config.telegram ? {
              ...config.telegram,
              botToken: config.telegram.botToken ? `***${config.telegram.botToken.slice(-4)}` : undefined
            } : undefined
          };

          return { success: true, result: safeConfig };
        } catch (error: any) {
          return {
            success: false,
            error: `读取配置失败: ${error.message}`
          };
        }
      }

      case 'write_config': {
        // 写入系统配置
        try {
          const { saveConfig, loadConfig } = await import('../config/loader');
          const currentConfig = loadConfig();

          // 合并配置
          const newConfig: any = { ...currentConfig };

          if (args.model) {
            newConfig.model = args.model;
          }
          if (args.apiEndpoint) {
            newConfig.api = newConfig.api || {};
            newConfig.api.endpoint = args.apiEndpoint;
          }

          saveConfig(newConfig);

          return {
            success: true,
            result: {
              message: '配置已更新。请重启 MemeClaw Gateway 使配置生效。',
              restart: true
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: `写入配置失败: ${error.message}`
          };
        }
      }

      default:
        // 尝试调用 MCP 工具
        const mcpResult = await mcpToolManager.execute(name, args);
        return { success: mcpResult.success ?? true, result: mcpResult };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 检查响应是否包含工具调用
 */
export function hasToolCalls(response: any): boolean {
  return !!(response?.choices?.[0]?.message?.tool_calls?.length);
}

/**
 * 提取工具调用
 */
export function extractToolCalls(response: any): ToolCall[] {
  return response?.choices?.[0]?.message?.tool_calls || [];
}
