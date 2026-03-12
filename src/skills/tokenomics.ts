import { Skill } from '../types';
import { skillRegistry } from './registry';

/**
 * 代币经济学技能 - 分析和设计代币经济学
 */
export const tokenomicsSkill: Skill = {
  id: 'tokenomics',
  name: '代币经济学分析',
  description: '分析代币经济学，包括供应量、分配、税收机制等',
  category: 'tokenomics',
  enabled: true,
  handler: async (input, context) => {
    const { action, data } = input;

    switch (action) {
      case 'analyze':
        return analyzeTokenomics(data);

      case 'design':
        return designTokenomics(data);

      case 'calculate':
        return calculateTokenomics(data);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

/**
 * 分析代币经济学
 */
function analyzeTokenomics(data: any) {
  const { totalSupply, circulatingSupply, taxRate, liquidity } = data;

  const analysis = {
    supplyRatio: circulatingSupply / totalSupply,
    taxImpact: calculateTaxImpact(taxRate),
    liquidityHealth: assessLiquidity(liquidity),
    recommendations: [] as string[],
  };

  // 生成建议
  if (analysis.supplyRatio < 0.5) {
    analysis.recommendations.push('流通供应量较低，考虑增加流动性释放');
  }
  if (taxRate > 500) { // > 5%
    analysis.recommendations.push('税率较高可能影响交易活跃度');
  }
  if (liquidity < 10000) {
    analysis.recommendations.push('流动性较低，存在价格波动风险');
  }

  return analysis;
}

/**
 * 设计代币经济学
 */
function designTokenomics(data: any) {
  const { name, symbol, totalSupply, taxRate } = data;

  return {
    name,
    symbol,
    totalSupply,
    circulatingSupply: totalSupply * 0.8, // 80% 流通
    taxRate: taxRate || 100, // 默认 1%
    allocation: {
      liquidity: 40,
      team: 15,
      marketing: 10,
      community: 20,
      reserve: 15,
    },
    vesting: {
      team: { cliff: 6, duration: 24 }, // 月
      marketing: { cliff: 0, duration: 12 },
      reserve: { cliff: 12, duration: 36 },
    },
  };
}

/**
 * 计算代币经济学数据
 */
function calculateTokenomics(data: any) {
  const { price, totalSupply, taxRate, volume } = data;

  const marketCap = price * totalSupply;
  const dailyTaxRevenue = volume * (taxRate / 10000);

  return {
    marketCap,
    dailyTaxRevenue,
    monthlyTaxRevenue: dailyTaxRevenue * 30,
    yearlyTaxRevenue: dailyTaxRevenue * 365,
    priceImpactPerTrade: (taxRate / 10000) * 100,
  };
}

/**
 * 计算税收影响
 */
function calculateTaxImpact(taxRate: number): string {
  const percent = taxRate / 100;
  if (percent < 1) return '极低';
  if (percent < 3) return '低';
  if (percent < 5) return '中等';
  if (percent < 10) return '高';
  return '极高';
}

/**
 * 评估流动性
 */
function assessLiquidity(liquidity: number): string {
  if (liquidity < 5000) return '极低';
  if (liquidity < 20000) return '低';
  if (liquidity < 100000) return '中等';
  if (liquidity < 500000) return '良好';
  return '优秀';
}

// 注册技能
skillRegistry.register(tokenomicsSkill);
