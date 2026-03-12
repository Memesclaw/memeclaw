# 🎯 MemeClaw 技能开发指南

## 技能是什么？

技能是 MemeClaw 的扩展功能，可以执行特定任务（如代币分析、链上查询等）。

## 创建新技能

### 1. 创建技能文件

在 `src/skills/` 目录创建新文件：

```typescript
// src/skills/my-skill.ts
import { Skill } from '../types';
import { skillRegistry } from './registry';

export const mySkill: Skill = {
  // 技能唯一标识
  id: 'my-skill',

  // 显示名称
  name: '我的技能',

  // 描述（用户可见）
  description: '技能描述',

  // 分类
  category: 'custom',

  // 是否启用
  enabled: true,

  // 技能处理函数
  handler: async (input: any, context: any) => {
    // input: 用户输入的参数
    // context: 包含 session, config 等

    // 处理逻辑
    const result = processData(input);

    // 返回结果
    return {
      success: true,
      data: result,
    };
  },
};

// 注册技能
skillRegistry.register(mySkill);
```

### 2. 在 index.ts 中导入

编辑 `src/skills/index.ts`：

```typescript
// 添加这两行
export * from './my-skill';
import './my-skill';
```

### 3. 重新编译

```bash
npm run build
```

## 技能示例

### 示例 1：BSC 余额查询

```typescript
// src/skills/bsc-balance.ts
import axios from 'axios';
import { Skill } from '../types';
import { skillRegistry } from './registry';

export const bscBalanceSkill: Skill = {
  id: 'bsc-balance',
  name: 'BSC 余额查询',
  description: '查询 BSC 链上地址的余额',
  category: 'analysis',
  enabled: true,
  handler: async (input: any) => {
    const { address } = input;

    if (!address) {
      return { error: '请提供地址' };
    }

    // 使用 BscScan API
    const apiKey = process.env.BSCSCAN_API_KEY;
    const url = `https://api.bscscan.com/api?module=account&action=balance&address=${address}&apikey=${apiKey}`;

    const response = await axios.get(url);
    const balance = response.data.result;

    return {
      success: true,
      data: {
        address,
        balance: balance / 1e18, // 转换为 BNB
        unit: 'BNB',
      },
    };
  },
};

skillRegistry.register(bscBalanceSkill);
```

### 示例 2：代币价格查询

```typescript
// src/skills/price-check.ts
import axios from 'axios';
import { Skill } from '../types';
import { skillRegistry } from './registry';

export const priceCheckSkill: Skill = {
  id: 'price-check',
  name: '价格查询',
  description: '查询代币价格',
  category: 'analysis',
  enabled: true,
  handler: async (input: any) => {
    const { symbol, address } = input;

    // 使用 DexScreener API（免费）
    const url = `https://api.dexscreener.com/latest/dex/search?q=${symbol || address}`;

    const response = await axios.get(url);
    const pair = response.data.pairs[0];

    if (!pair) {
      return { error: '未找到代币' };
    }

    return {
      success: true,
      data: {
        symbol: pair.baseToken.symbol,
        price: pair.priceUsd,
        liquidity: pair.liquidity?.usd || 0,
        pairAddress: pair.pairAddress,
      },
    };
  },
};

skillRegistry.register(priceCheckSkill);
```

## 调用技能

### 在 Telegram 中

```
/skill:my-skill {"param": "value"}
```

### 在 API 中

```bash
curl -X POST http://127.0.0.1:18789/api/skill \
  -H "Content-Type: application/json" \
  -d '{"skillId": "my-skill", "input": {"param": "value"}}'
```

### 在代码中

```typescript
const agent = createAgent();
await agent.createOrLoadSession({ channel: 'cli' });

const result = await agent.callSkill('my-skill', { param: 'value' });
console.log(result);
```

## 技能最佳实践

1. **错误处理**：始终处理可能的错误情况
2. **输入验证**：验证用户输入的参数
3. **超时控制**：对于网络请求设置超时
4. **返回格式**：统一返回 `{ success, data?, error? }` 格式

## 技能分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `memecoin` | MEME 币相关 | 代币分析、市值计算 |
| `tokenomics` | 代币经济学 | 供应量分析、税收计算 |
| `trading` | 交易相关 | 价格查询、滑点计算 |
| `analysis` | 分析工具 | 链上数据、持仓分析 |
| `custom` | 自定义 | 任何自定义功能 |
