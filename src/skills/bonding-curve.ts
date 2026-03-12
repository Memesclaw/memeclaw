import { Skill } from '../types';
import { skillRegistry } from './registry';

/**
 * Bonding Curve 技能 - 联合曲线机制
 */
export const bondingCurveSkill: Skill = {
  id: 'bonding-curve',
  name: 'Bonding Curve 分析',
  description: '分析联合曲线机制，计算价格和梯度',
  category: 'memecoin',
  enabled: true,
  handler: async (input, context) => {
    const { action, data } = input;

    switch (action) {
      case 'calculate_price':
        return calculateBondingPrice(data);

      case 'simulate':
        return simulateBondingCurve(data);

      case 'graduation':
        return calculateGraduation(data);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
};

/**
 * 计算 Bonding Curve 价格
 * 使用线性联合曲线: price = basePrice + (slope * supply)
 */
function calculateBondingPrice(data: any) {
  const { basePrice, slope, currentSupply, buyAmount } = data;

  // 当前价格
  const currentPrice = basePrice + (slope * currentSupply);

  // 买入后的价格
  const newSupply = currentSupply + buyAmount;
  const newPrice = basePrice + (slope * newSupply);

  // 平均买入价格
  const avgPrice = (currentPrice + newPrice) / 2;

  // 总成本
  const totalCost = avgPrice * buyAmount;

  return {
    currentPrice,
    newPrice,
    priceImpact: ((newPrice - currentPrice) / currentPrice) * 100,
    avgPrice,
    totalCost,
    newSupply,
  };
}

/**
 * 模拟 Bonding Curve
 */
function simulateBondingCurve(data: any) {
  const { basePrice, slope, initialSupply, targetSupply, steps } = data;

  const supplyStep = (targetSupply - initialSupply) / steps;
  const curve = [];

  for (let i = 0; i <= steps; i++) {
    const supply = initialSupply + (supplyStep * i);
    const price = basePrice + (slope * supply);
    const marketCap = price * supply;

    curve.push({
      step: i,
      supply,
      price,
      marketCap,
    });
  }

  return {
    curve,
    priceRange: {
      start: curve[0].price,
      end: curve[curve.length - 1].price,
    },
    marketCapRange: {
      start: curve[0].marketCap,
      end: curve[curve.length - 1].marketCap,
    },
  };
}

/**
 * 计算毕业条件（达到 DEX 的条件）
 */
function calculateGraduation(data: any) {
  const { basePrice, slope, currentSupply, targetMarketCap } = data;

  // 反推达到目标市值需要的供应量
  // marketCap = price * supply = (basePrice + slope * supply) * supply
  // 解二次方程: slope * supply^2 + basePrice * supply - targetMarketCap = 0
  const a = slope;
  const b = basePrice;
  const c = -targetMarketCap;

  const discriminant = (b * b) - (4 * a * c);
  const targetSupply = (-b + Math.sqrt(discriminant)) / (2 * a);

  const remainingSupply = targetSupply - currentSupply;
  const currentPrice = basePrice + (slope * currentSupply);
  const targetPrice = basePrice + (slope * targetSupply);

  return {
    currentSupply,
    targetSupply,
    remainingSupply,
    currentPrice,
    targetPrice,
    currentMarketCap: currentPrice * currentSupply,
    targetMarketCap,
    progress: (currentSupply / targetSupply) * 100,
  };
}

// 注册技能
skillRegistry.register(bondingCurveSkill);
