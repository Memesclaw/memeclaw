import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import { TaxReward } from '../types';

/**
 * 税收奖励配置
 */
export interface TaxRewardConfig {
  enabled: boolean;
  contractAddress: string;
  rpcUrl: string;
  privateKey?: string;
  taxRate: number; // 基点 (100 = 1%)
}

/**
 * 代币合约 ABI（简化版）
 */
const TOKEN_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function taxCollector() view returns (address)',
  'function collectTax() returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 amount)',
  'event TaxCollected(address indexed collector, uint256 amount)',
];

/**
 * 税收奖励管理器
 */
export class TaxRewardManager {
  private config: TaxRewardConfig;
  private provider: JsonRpcProvider | null = null;
  private wallet: Wallet | null = null;
  private contract: Contract | null = null;
  private rewards: TaxReward[] = [];

  constructor(config: TaxRewardConfig) {
    this.config = config;
    this.init();
  }

  /**
   * 初始化
   */
  private async init(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.provider = new JsonRpcProvider(this.config.rpcUrl);

      if (this.config.privateKey) {
        this.wallet = new Wallet(this.config.privateKey, this.provider);
        this.contract = new Contract(
          this.config.contractAddress,
          TOKEN_ABI,
          this.wallet
        );
      }
    } catch (error) {
      console.error('Failed to initialize TaxRewardManager:', error);
    }
  }

  /**
   * 计算税收
   */
  public calculateTax(amount: bigint): bigint {
    return (amount * BigInt(this.config.taxRate)) / BigInt(10000);
  }

  /**
   * 记录技能贡献奖励
   */
  public async recordSkillReward(
    skillId: string,
    contributor: string,
    amount: string
  ): Promise<TaxReward> {
    const reward: TaxReward = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      skillId,
      contributor,
      amount,
      timestamp: Date.now(),
    };

    this.rewards.push(reward);
    return reward;
  }

  /**
   * 分发奖励
   */
  public async distributeReward(reward: TaxReward): Promise<string | null> {
    if (!this.wallet || !this.contract) {
      console.warn('Wallet or contract not initialized');
      return null;
    }

    try {
      const tx = await this.contract.transfer(
        reward.contributor,
        ethers.parseUnits(reward.amount, 18)
      );

      await tx.wait();

      // 更新奖励记录
      const storedReward = this.rewards.find(r => r.id === reward.id);
      if (storedReward) {
        storedReward.txHash = tx.hash;
      }

      return tx.hash;
    } catch (error) {
      console.error('Failed to distribute reward:', error);
      return null;
    }
  }

  /**
   * 获取所有奖励记录
   */
  public getRewards(): TaxReward[] {
    return [...this.rewards];
  }

  /**
   * 获取技能奖励统计
   */
  public getSkillRewardStats(skillId: string): {
    totalRewards: number;
    totalAmount: bigint;
    lastReward: TaxReward | null;
  } {
    const skillRewards = this.rewards.filter(r => r.skillId === skillId);

    let totalAmount = BigInt(0);
    for (const reward of skillRewards) {
      totalAmount += BigInt(reward.amount);
    }

    return {
      totalRewards: skillRewards.length,
      totalAmount,
      lastReward: skillRewards.length > 0 ? skillRewards[skillRewards.length - 1] : null,
    };
  }

  /**
   * 获取贡献者奖励统计
   */
  public getContributorStats(contributor: string): {
    totalRewards: number;
    totalAmount: bigint;
    skills: string[];
  } {
    const contributorRewards = this.rewards.filter(r => r.contributor === contributor);

    let totalAmount = BigInt(0);
    const skills = new Set<string>();

    for (const reward of contributorRewards) {
      totalAmount += BigInt(reward.amount);
      skills.add(reward.skillId);
    }

    return {
      totalRewards: contributorRewards.length,
      totalAmount,
      skills: Array.from(skills),
    };
  }

  /**
   * 检查代币余额
   */
  public async checkBalance(address: string): Promise<string> {
    if (!this.provider || !this.contract) {
      return '0';
    }

    try {
      const balance = await this.contract.balanceOf(address);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      console.error('Failed to check balance:', error);
      return '0';
    }
  }
}

/**
 * 创建税收奖励管理器
 */
export function createTaxRewardManager(config: TaxRewardConfig): TaxRewardManager {
  return new TaxRewardManager(config);
}
