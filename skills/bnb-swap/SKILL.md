---
name: bnb-swap
description: "使用 PancakeSwap 进行代币交换"
version: "1.0.0"
emoji: "🥞"
category: "defi"
requires:
  bins: []
  env: []
allowed-tools:
  - bnb_price
  - bnb_token_info
  - bnb_token_search
  - bnb_common_tokens
---

# PancakeSwap 交换技能

## 功能

这个技能帮助你使用 PancakeSwap 进行代币交换：

- **价格查询**: 查询代币价格
- **代币信息**: 获取代币详细信息
- **代币搜索**: 搜索 BSC 链上的代币
- **常用代币**: 获取常用代币列表

## 使用示例

- "BNB 现在多少钱？"
- "查询 CAKE 代币信息"
- "搜索 USDT 代币"
- "有哪些常用的 BSC 代币？"

## 支持的工具

- `bnb_price`: 查询 BNB 价格
- `bnb_token_info`: 获取代币信息
- `bnb_token_search`: 搜索代币
- `bnb_common_tokens`: 获取常用代币列表
