#!/usr/bin/env node
/**
 * MemeClaw 启动脚本
 * 首次运行时自动启动配置向导
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.memeclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// 检查配置是否存在且有效
function isConfigured() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const key = config && config.api && config.api.key;

    if (!key) return false;

    // 检查占位符
    const placeholders = ['your-api-key', 'sk-your', 'sk-test', 'placeholder'];
    return !placeholders.some(function(p) {
      return key.toLowerCase().includes(p.toLowerCase());
    });
  } catch (e) {
    return false;
  }
}

// 主函数
function main() {
  console.log('\n🦞 MemeClaw\n');

  if (!isConfigured()) {
    console.log('检测到首次运行，正在启动配置向导...\n');

    try {
      // 运行配置向导
      execSync('node dist/commands/index.js init', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.error('配置向导失败');
      process.exit(1);
    }
  }

  // 启动 Gateway
  console.log('\n正在启动 Gateway...\n');

  const gateway = spawn('node', ['dist/gateway/index.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env
  });

  gateway.on('error', function(error) {
    console.error('启动失败:', error);
    process.exit(1);
  });

  gateway.on('exit', function(code) {
    process.exit(code || 0);
  });

  // 处理退出信号
  process.on('SIGINT', function() {
    gateway.kill('SIGINT');
  });

  process.on('SIGTERM', function() {
    gateway.kill('SIGTERM');
  });
}

main();
