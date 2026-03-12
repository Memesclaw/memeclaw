/**
 * BNB Chain 工具系统
 * 基于 BSC RPC 和 PancakeSwap API
 */

import { ethers } from 'ethers';

// BSC 配置
const BSC_CONFIG = {
  mainnet: {
    rpc: 'https://bsc-dataseed.binance.org',
    chainId: 56,
    explorer: 'https://bscscan.com',
    wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  testnet: {
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    explorer: 'https://testnet.bscscan.com',
  }
};

// PancakeSwap 配置
const PANCAKE_CONFIG = {
  router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
  api: 'https://api.pancakeswap.finance',
};

// 常用代币地址
const TOKENS: Record<string, string> = {
  BNB: '0x0000000000000000000000000000000000000000',
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC3219D7a1000D05406',
};

// BEP-20 ABI（最小化）
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

// 获取 Provider
function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BSC_CONFIG.mainnet.rpc);
}

/**
 * 查询 BNB 余额
 */
export async function getBNBBalance(address: string): Promise<{ success: boolean; balance?: string; error?: string }> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    const balanceInBNB = ethers.formatEther(balance);

    return {
      success: true,
      balance: balanceInBNB,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 查询 BEP-20 代币余额
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<{ success: boolean; balance?: string; symbol?: string; error?: string }> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const [balance, symbol, decimals] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.symbol(),
      contract.decimals(),
    ]);

    const formattedBalance = ethers.formatUnits(balance, decimals);

    return {
      success: true,
      balance: formattedBalance,
      symbol,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取代币信息
 */
export async function getTokenInfo(
  tokenAddress: string
): Promise<{ success: boolean; info?: { name: string; symbol: string; decimals: number; totalSupply: string }; error?: string }> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
    ]);

    return {
      success: true,
      info: {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取 BNB 价格（从 CoinGecko）
 */
export async function getBNBPrice(): Promise<{ success: boolean; price?: number; error?: string }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd',
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API 错误: ${response.status}`);
    }

    const data = await response.json() as any;
    const price = data?.binancecoin?.usd;

    if (!price) {
      throw new Error('无法获取价格');
    }

    return { success: true, price };
  } catch (error: any) {
    // 备用：使用 Binance API
    try {
      const response = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT',
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error('备用 API 也失败');
      }

      const data = await response.json() as any;
      const price = parseFloat(data.price);

      return { success: true, price };
    } catch (backupError: any) {
      return { success: false, error: `获取价格失败: ${error.message}` };
    }
  }
}

/**
 * 获取 Gas 价格
 */
export async function getGasPrice(): Promise<{ success: boolean; gasPrice?: string; error?: string }> {
  try {
    const provider = getProvider();
    const gasPrice = await provider.getFeeData();

    return {
      success: true,
      gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei') + ' Gwei',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取交易历史（从 BscScan API）
 */
export async function getTransactionHistory(
  address: string,
  limit: number = 10
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    // 注意：需要 BscScan API Key 才能使用
    // 这里使用免费端点，限制较多
    const response = await fetch(
      `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&page=1&offset=${limit}&sort=desc`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      throw new Error(`BscScan API 错误: ${response.status}`);
    }

    const data = await response.json() as any;

    if (data.status !== '1') {
      throw new Error(data.message || '获取交易历史失败');
    }

    const transactions = (data.result || []).slice(0, limit).map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value) + ' BNB',
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      blockNumber: tx.blockNumber,
    }));

    return { success: true, transactions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 验证地址
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * 获取常用代币列表
 */
export function getCommonTokens(): { symbol: string; address: string }[] {
  return Object.entries(TOKENS)
    .filter(([symbol]) => symbol !== 'BNB')
    .map(([symbol, address]) => ({ symbol, address }));
}

/**
 * 搜索代币（从 CoinGecko）
 */
export async function searchToken(
  query: string
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API 错误: ${response.status}`);
    }

    const data = await response.json() as any;

    // 过滤 BSC 链上的代币
    const results = (data.coins || [])
      .filter((coin: any) => coin.platforms?.['binance-smart-chain'])
      .slice(0, 10)
      .map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        thumb: coin.thumb,
        bscAddress: coin.platforms?.['binance-smart-chain'],
      }));

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取钱包持仓（从 BscScan）
 */
export async function getWalletHoldings(
  address: string
): Promise<{ success: boolean; holdings?: any[]; error?: string }> {
  try {
    // BscScan API 获取 BEP-20 代币持仓
    const response = await fetch(
      `https://api.bscscan.com/api?module=account&action=tokentx&address=${address}&page=1&offset=100&sort=desc`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      throw new Error(`BscScan API 错误: ${response.status}`);
    }

    const data = await response.json() as any;

    // 去重并汇总
    const tokenMap = new Map<string, any>();

    for (const tx of data.result || []) {
      const tokenSymbol = tx.tokenSymbol;
      if (!tokenMap.has(tokenSymbol)) {
        tokenMap.set(tokenSymbol, {
          symbol: tokenSymbol,
          name: tx.tokenName,
          contractAddress: tx.contractAddress,
        });
      }
    }

    const holdings = Array.from(tokenMap.values()).slice(0, 20);

    return { success: true, holdings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 工具定义（用于 Claude API）
export const BNB_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'bnb_balance',
      description: '查询 BNB Chain 地址的 BNB 余额',
      parameters: {
        type: 'object' as const,
        properties: {
          address: {
            type: 'string',
            description: 'BNB Chain 钱包地址（0x开头）',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_token_balance',
      description: '查询指定 BEP-20 代币的余额',
      parameters: {
        type: 'object' as const,
        properties: {
          tokenAddress: {
            type: 'string',
            description: '代币合约地址',
          },
          walletAddress: {
            type: 'string',
            description: '钱包地址',
          },
        },
        required: ['tokenAddress', 'walletAddress'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_price',
      description: '获取 BNB 当前价格（USD）',
      parameters: {
        type: 'object' as const,
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_gas',
      description: '获取当前 Gas 价格',
      parameters: {
        type: 'object' as const,
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_token_info',
      description: '获取代币信息（名称、符号、精度、总量）',
      parameters: {
        type: 'object' as const,
        properties: {
          address: {
            type: 'string',
            description: '代币合约地址',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_history',
      description: '获取地址的交易历史',
      parameters: {
        type: 'object' as const,
        properties: {
          address: {
            type: 'string',
            description: '钱包地址',
          },
          limit: {
            type: 'number',
            description: '返回数量（默认10）',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_token_search',
      description: '搜索代币信息',
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: '代币名称或符号',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_holdings',
      description: '获取钱包的代币持仓列表',
      parameters: {
        type: 'object' as const,
        properties: {
          address: {
            type: 'string',
            description: '钱包地址',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bnb_common_tokens',
      description: '获取常用代币列表（USDT, USDC, CAKE 等）',
      parameters: {
        type: 'object' as const,
        properties: {},
      },
    },
  },
];

/**
 * 执行 BNB 工具调用
 */
export async function executeBnbTool(name: string, args: any): Promise<{ success: boolean; result?: any; error?: string }> {
  switch (name) {
    case 'bnb_balance':
      return await getBNBBalance(args.address);

    case 'bnb_token_balance':
      return await getTokenBalance(args.tokenAddress, args.walletAddress);

    case 'bnb_price':
      return await getBNBPrice();

    case 'bnb_gas':
      return await getGasPrice();

    case 'bnb_token_info':
      return await getTokenInfo(args.address);

    case 'bnb_history':
      return await getTransactionHistory(args.address, args.limit);

    case 'bnb_token_search':
      return await searchToken(args.query);

    case 'bnb_holdings':
      return await getWalletHoldings(args.address);

    case 'bnb_common_tokens':
      return { success: true, result: getCommonTokens() };

    default:
      return { success: false, error: `未知工具: ${name}` };
  }
}
