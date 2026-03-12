import { Skill } from '../types';
import { skillRegistry } from './registry';

/**
 * Four.meme 平台技能
 */
export const fourMemeSkill: Skill = {
  id: 'four-meme',
  name: 'Four.meme 平台分析',
  description: '分析 Four.meme 平台上的代币数据和规则',
  category: 'memecoin',
  enabled: true,
  handler: async (input, context) => {
    const { action, data } = input;

    switch (action) {
      case 'analyze_token':
        return analyzeFourMemeToken(data);

      case 'calculate_graduation':
        return calculateFourMemeGraduation(data);

      case 'estimate_tax':
        return estimateFourMemeTax(data);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

/**
 * 分析 Four.meme 代币
 */
function analyzeFourMemeToken(data: any) {
  const { marketCap, graduated, taxRate } = data;

  return {
    marketCap,
    graduated,
    taxRate,
    taxPercent: taxRate / 100,
    phase: graduated ? 'DEX' : 'Bonding Curve',
    taxStatus: graduated ? '已生效' : '未生效（毕业后生效）',
    recommendations: generateRecommendations(data),
  };
}

/**
 * 计算 Four.meme 毕业
 */
function calculateFourMemeGraduation(data: any) {
  const GRADUATION_THRESHOLD = 58753.91; // Four.meme 毕业阈值

  const { currentMarketCap } = data;
  const remaining = GRADUATION_THRESHOLD - currentMarketCap;
  const progress = (currentMarketCap / GRADUATION_THRESHOLD) * 100;

  return {
    currentMarketCap,
    graduationThreshold: GRADUATION_THRESHOLD,
    remaining,
    progress,
    isGraduated: currentMarketCap >= GRADUATION_THRESHOLD,
    estimateBuysNeeded: Math.ceil(remaining / 100), // 估算
  };
}

/**
 * 估算 Four.meme 税收
 */
function estimateFourMemeTax(data: any) {
  const { tradeAmount, taxRate, graduated } = data;

  if (!graduated) {
    return {
      tradeAmount,
      taxRate,
      taxAmount: 0,
      note: 'Bonding Curve 阶段无税',
    };
  }

  const taxAmount = tradeAmount * (taxRate / 10000);

  return {
    tradeAmount,
    taxRate,
    taxPercent: taxRate / 100,
    taxAmount,
    netAmount: tradeAmount - taxAmount,
  };
}

/**
 * 生成建议
 */
function generateRecommendations(data: any) {
  const recommendations: string[] = [];
  const { marketCap, graduated, taxRate } = data;

  if (!graduated) {
    const remaining = 58753.91 - marketCap;
    recommendations.push(`还需约 $${remaining.toFixed(2)} 达到毕业条件`);
    recommendations.push('毕业后税收将生效');
  }

  if (taxRate > 500) {
    recommendations.push('税率超过 5%，可能影响交易活跃度');
  }

  if (marketCap < 10000) {
    recommendations.push('市值较低，注意流动性风险');
  }

  return recommendations;
}

// 注册技能
skillRegistry.register(fourMemeSkill);
