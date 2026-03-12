<div align="center">

<img width="200" height="200" alt="MemeClaw" src="https://raw.githubusercontent.com/Memesclaw/memeclaw/main/docs/logo.png" />

# MemeClaw

**Your 24/7 MEME Coin AI Companion**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/Memesclaw/memeclaw.svg)](https://github.com/Memesclaw/memeclaw/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Memesclaw/memeclaw.svg)](https://github.com/Memesclaw/memeclaw/issues)

**[English](#english) | [中文](#中文)**

*When the market teaches you a lesson, MemeClaw stays with you.*

</div>

---

## 中文

### 目录

- [简介](#简介)
- [真实对话示例](#真实对话示例)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [部署指南](#部署指南)
- [常见问题](#常见问题)

---

### 简介

MemeClaw 是一款专为 MEME/加密货币爱好者设计的 AI 助手。它具备永久记忆、技能学习、多平台支持等特性，**24/7 陪伴你的币圈之旅**。

> 💡 你可以给它起名字，它会记住你是谁，了解你的投资偏好。

---

### 真实对话示例

<details>
<summary><b>🦞 点击展开：用户与小蓝的真实对话</b></summary>

**User:** 以后叫小蓝

**🦞 小蓝:** 好嘞！从现在起，我就是 **小蓝** 了！🦞💙

一只叫小蓝的智能龙虾...听起来还挺可爱的嘛！

有什么需要帮忙的，尽管找 **小蓝**！我随时在线！✨

---

**User:** 我最近打土狗都亏钱，怎么办啊小蓝

**🦞 小蓝:** 哎呀，兄弟...抱抱！🫂 冲土狗亏钱这事儿，说实话，**99% 的人都经历过**，你绝对不是一个人！

#### 为什么冲土狗总是亏？

| 陷阱 | 说明 |
|------|------|
| 🍯 Honeypot | 能买不能卖，买了就归零 |
| 📉 高税收 | 买卖被收 20%-50% 税 |
| 🐋 鲸鱼砸盘 | 大户提前埋伏，拉高就跑 |
| 🎭 假热度 | 机器人刷交易量，看起来很火 |
| ⏰ 进晚了 | Bonding Curve 快满了才冲，接盘侠是你 |

#### 小蓝的防亏建议：

1. **冲之前先检查！** - 用工具检测 honeypot
2. **控制仓位！** - 土狗 = 赌博，只投亏得起的钱
3. **快进快出！** - 土狗生命周期短，赚到就跑
4. **别追高！** - Bonding Curve 快满的时候别冲
5. **学会止损！** - 亏了就认，别死扛

**把最近亏的那个代币地址发给我，让小蓝帮你复盘一下？** 🦞💡

---

**User:** 给我做个计划可以吗

**🦞 小蓝:** 没问题！我来给你制定一个 **科学冲土狗计划**！

#### 冲前检查清单（必做！）

| 检查项 | 怎么查 |
|------|--------|
| ✅ Honeypot 检测 | 用 Honeypot.is 扫一遍 |
| ✅ 合约是否开源 | BSCScan 查合约 |
| ✅ 持币分布 | 前10名地址占比（>30% 小心） |
| ✅ 税收 | 超过 15% 谨慎 |
| ✅ 社群热度 | Twitter、Telegram 有真实讨论吗？ |

#### 进场策略

- 🕐 **时机**: 代币上线 5-15 分钟内进
- 📊 **Bonding Curve**: 进度 < 70% 才考虑
- 🎯 **止盈点**: 涨 50% 先卖一半，涨 100% 全跑
- 🛑 **止损点**: 亏 30% 认赔离场

**从现在起，每次你想冲土狗，都可以发地址给我分析！** 🦞💪

</details>

---

### 功能特性

| 功能 | 描述 |
|:---:|:---|
| 🧠 **永久记忆** | 记住你的名字、偏好和对话历史 |
| 🎯 **技能学习** | 自动学习新能力，如"筛选牛币" |
| 🤖 **Telegram Bot** | 24/7 在线，随时聊天 |
| 📊 **多平台支持** | 支持 Four.meme、Pump.fun 等 |
| 🔄 **定时任务** | 价格提醒、监控、复盘自动化 |
| 🌐 **Web 界面** | 本地 Web 控制台 |

---

### 快速开始

```bash
# 克隆项目
git clone https://github.com/Memesclaw/memeclaw.git
cd memeclaw

# 安装依赖
npm install

# 编译项目
npm run build

# 自动配置
npm run onboard

# 启动服务
npm start
```

启动后访问：
- **Web 界面**: http://127.0.0.1:18789
- **Telegram Bot**: `@your_bot_username`

---

### 配置说明

```bash
# 自动配置向导
npm run onboard

# 或手动创建配置文件
mkdir ~/.memeclaw
```

配置文件示例 (`~/.memeclaw/config.json`):
```json
{
  "api": {
    "mode": "relay",
    "endpoint": "https://your-api.com",
    "key": "sk-xxx",
    "model": "claude-opus-4-6"
  },
  "telegram": {
    "enabled": true,
    "botToken": "your-bot-token"
  }
}
```

---

### 部署指南

<details>
<summary><b>Windows 部署</b></summary>

```bash
# 使用 PM2（推荐）
npm install pm2 -g
pm2 start dist/main.js --name memeclaw
pm2 startup
pm2 save

# 或使用 Windows 服务
node dist/daemon.js install
node dist/daemon.js start
```
</details>

<details>
<summary><b>Linux 部署</b></summary>

```bash
# 使用 PM2
pm2 start dist/main.js --name memeclaw
pm2 startup systemd
pm2 save
```
</details>

<details>
<summary><b>Docker 部署</b></summary>

```bash
docker-compose up -d
```
</details>

---

### 常见问题

<details>
<summary><b>如何获取 Telegram Bot Token？</b></summary>

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称
4. 获取 Token 并填入配置文件
</details>

---

## English

### Table of Contents

- [Introduction](#introduction)
- [Real Conversation Example](#real-conversation-example)
- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)

---

### Introduction

MemeClaw is an AI assistant designed for MEME/cryptocurrency enthusiasts. It features persistent memory, skill learning, and multi-platform support, **accompanying you 24/7 on your crypto journey**.

> 💡 You can give it a name, and it will remember who you are and your investment preferences.

---

### Features

| Feature | Description |
|:---:|:---|
| 🧠 **Persistent Memory** | Remembers your name, preferences and conversation history |
| 🎯 **Skill Learning** | Automatically learns new capabilities |
| 🤖 **Telegram Bot** | 24/7 online, chat anytime |
| 📊 **Multi-platform** | Supports Four.meme, Pump.fun, etc. |
| 🔄 **Scheduled Tasks** | Price alerts, monitoring, automated reviews |
| 🌐 **Web Interface** | Local web console |

---

### Quick Start

```bash
# Clone the project
git clone https://github.com/Memesclaw/memeclaw.git
cd memeclaw

# Install dependencies
npm install

# Build
npm run build

# Setup configuration
npm run onboard

# Start service
npm start
```

---

### Configuration

```bash
# Auto configuration wizard
npm run onboard
```

Config example (`~/.memeclaw/config.json`):
```json
{
  "api": {
    "mode": "relay",
    "endpoint": "https://your-api.com",
    "key": "sk-xxx",
    "model": "claude-opus-4-6"
  },
  "telegram": {
    "enabled": true,
    "botToken": "your-bot-token"
  }
}
```

---

### Deployment

<details>
<summary><b>Windows</b></summary>

```bash
npm install pm2 -g
pm2 start dist/main.js --name memeclaw
pm2 startup
pm2 save
```
</details>

<details>
<summary><b>Linux</b></summary>

```bash
pm2 start dist/main.js --name memeclaw
pm2 startup systemd
pm2 save
```
</details>

<details>
<summary><b>Docker</b></summary>

```bash
docker-compose up -d
```
</details>

---

<div align="center">

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**MemeClaw** - Your 24/7 MEME companion

*When the market teaches you a lesson, MemeClaw stays with you.*

</div>
