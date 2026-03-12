---
name: bnb-wallet
description: "查询和管理 BNB Chain 钱包"
version: "1.0.0"
emoji: "💎"
category: "bnb"
requires:
  bins: []
  env: []
allowed-tools:
  - bnb_balance
  - bnb_token_balance
  - bnb_history
  - bnb_holdings
---

# BNB 钱包管理技能

## 功能

这个技能允许你查询 BNB Chain 钱包的信息：

- **BNB 余额查询**: 查询钱包中的 BNB 余额
- **代币余额查询**: 查询 BEP-20 代币余额
- **交易历史**: 查看最近的交易记录
- **持仓列表**: 获取钱包中的所有代币持仓

## 使用示例

- "查询我的 BNB 余额"
- "0x1234... 这个地址有多少 BNB？"
- "显示我最近的交易记录"
- "查看我的代币持仓"

## 支持的工具

- `bnb_balance`: 查询 BNB 余额
- `bnb_token_balance`: 查询 BEP-20 代币余额
- `bnb_history`: 获取交易历史
- `bnb_holdings`: 获取持仓列表
