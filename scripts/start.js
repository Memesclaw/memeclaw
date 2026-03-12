#!/usr/bin/env node
/**
 * MemeClaw CLI - 命令行启动工具
 * 使用: node scripts/start.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🦞 Starting MemeClaw...\n');

// 启动 Gateway
const gateway = spawn('node', ['dist/main.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

gateway.on('error', (err) => {
  console.error('Failed to start Gateway:', err);
  process.exit(1);
});

console.log('✅ MemeClaw Gateway running on ws://127.0.0.1:18789');
console.log('   HTTP API: http://127.0.0.1:18789');
console.log('   Health check: http://127.0.0.1:18789/health\n');
console.log('Press Ctrl+C to stop\n');

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 Stopping MemeClaw...');
  gateway.kill();
  process.exit(0);
});

gateway.on('exit', (code) => {
  console.log(`Gateway exited with code ${code}`);
  process.exit(code);
});
