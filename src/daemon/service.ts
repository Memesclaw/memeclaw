import os from 'os';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 平台检测
 */
export function getPlatform(): 'windows' | 'linux' | 'macos' {
  const platform = os.platform();
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  return 'linux';
}

/**
 * 服务管理接口
 */
export interface ServiceManager {
  install(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<boolean>;
  uninstall(): Promise<void>;
}

/**
 * Windows 计划任务服务管理
 * 参考 OpenClaw: src/daemon/schtasks.ts
 */
export class WindowsServiceManager implements ServiceManager {
  private taskName = 'MemeClawGateway';
  private getDataDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.memeclaw');
  }

  async install(): Promise<void> {
    const dataDir = this.getDataDir();
    const cmdPath = path.join(dataDir, 'gateway.cmd');

    // 创建启动脚本
    const scriptContent = `@echo off
cd /d "${dataDir}"
node dist/main.js
`;
    require('fs').mkdirSync(dataDir, { recursive: true });
    require('fs').writeFileSync(cmdPath, scriptContent);

    // 创建计划任务（开机自启）
    await execAsync(
      `schtasks /create /tn "${this.taskName}" /tr "${cmdPath}" /sc onlog /rl highest /f`
    );

    console.log('✅ Windows 服务已安装');
  }

  async start(): Promise<void> {
    await execAsync(`schtasks /run /tn "${this.taskName}"`);
    console.log('✅ 服务已启动');
  }

  async stop(): Promise<void> {
    // Windows 计划任务不支持直接停止，需要结束进程
    await execAsync(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq MemeClaw*"`);
    console.log('✅ 服务已停止');
  }

  async status(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`schtasks /query /tn "${this.taskName}"`);
      return stdout.includes('Ready');
    } catch {
      return false;
    }
  }

  async uninstall(): Promise<void> {
    await execAsync(`schtasks /delete /tn "${this.taskName}" /f`);
    console.log('✅ 服务已卸载');
  }
}

/**
 * Linux systemd 服务管理
 * 参考 OpenClaw: src/daemon/systemd.ts
 */
export class LinuxServiceManager implements ServiceManager {
  private serviceName = 'memeclaw';
  private getDataDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.memeclaw');
  }

  async install(): Promise<void> {
    const dataDir = this.getDataDir();
    const servicePath = path.join(os.homedir(), '.config/systemd/user');
    const serviceFile = path.join(servicePath, `${this.serviceName}.service`);

    // 创建服务文件
    const serviceContent = `[Unit]
Description=MemeClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${dataDir}
ExecStart=${process.execPath} ${path.join(dataDir, 'dist/main.js')}
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
`;

    require('fs').mkdirSync(servicePath, { recursive: true });
    require('fs').writeFileSync(serviceFile, serviceContent);

    // 重新加载 systemd 并启用服务
    await execAsync('systemctl --user daemon-reload');
    await execAsync(`systemctl --user enable ${this.serviceName}`);

    console.log('✅ Systemd 服务已安装');
  }

  async start(): Promise<void> {
    await execAsync(`systemctl --user start ${this.serviceName}`);
    console.log('✅ 服务已启动');
  }

  async stop(): Promise<void> {
    await execAsync(`systemctl --user stop ${this.serviceName}`);
    console.log('✅ 服务已停止');
  }

  async status(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`systemctl --user is-active ${this.serviceName}`);
      return stdout.trim() === 'active';
    } catch {
      return false;
    }
  }

  async uninstall(): Promise<void> {
    await execAsync(`systemctl --user disable ${this.serviceName}`);
    await execAsync(`systemctl --user stop ${this.serviceName}`);

    const serviceFile = path.join(os.homedir(), '.config/systemd/user', `${this.serviceName}.service`);
    require('fs').unlinkSync(serviceFile);

    await execAsync('systemctl --user daemon-reload');
    console.log('✅ 服务已卸载');
  }
}

/**
 * macOS LaunchAgent 服务管理
 * 参考 OpenClaw: src/daemon/launchd.ts
 */
export class MacOSServiceManager implements ServiceManager {
  private label = 'ai.memeclaw.gateway';
  private getDataDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.memeclaw');
  }

  async install(): Promise<void> {
    const dataDir = this.getDataDir();
    const plistPath = path.join(os.homedir(), 'Library/LaunchAgents');
    const plistFile = path.join(plistPath, `${this.label}.plist`);

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${this.label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${path.join(dataDir, 'dist/main.js')}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${dataDir}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(dataDir, 'gateway.log')}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(dataDir, 'gateway.error.log')}</string>
</dict>
</plist>
`;

    require('fs').mkdirSync(plistPath, { recursive: true });
    require('fs').writeFileSync(plistFile, plistContent);

    // 加载 LaunchAgent
    await execAsync(`launchctl load ${plistFile}`);

    console.log('✅ LaunchAgent 已安装');
  }

  async start(): Promise<void> {
    const plistFile = path.join(os.homedir(), 'Library/LaunchAgents', `${this.label}.plist`);
    await execAsync(`launchctl start ${this.label}`);
    console.log('✅ 服务已启动');
  }

  async stop(): Promise<void> {
    await execAsync(`launchctl stop ${this.label}`);
    console.log('✅ 服务已停止');
  }

  async status(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`launchctl list | grep ${this.label}`);
      return stdout.includes(this.label);
    } catch {
      return false;
    }
  }

  async uninstall(): Promise<void> {
    const plistFile = path.join(os.homedir(), 'Library/LaunchAgents', `${this.label}.plist`);
    await execAsync(`launchctl unload ${plistFile}`);
    require('fs').unlinkSync(plistFile);
    console.log('✅ 服务已卸载');
  }
}

/**
 * 创建服务管理器（跨平台）
 */
export function createServiceManager(): ServiceManager {
  const platform = getPlatform();

  switch (platform) {
    case 'windows':
      return new WindowsServiceManager();
    case 'linux':
      return new LinuxServiceManager();
    case 'macos':
      return new MacOSServiceManager();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
