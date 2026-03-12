import { getConfig } from './config';
import { Gateway } from './gateway';
import { Agent, createAgent } from './agent';
import { skillLoader } from './skills';

export { getConfig, ConfigManager, DEFAULT_CONFIG } from './config';
export { Gateway } from './gateway';
export { Agent, createAgent } from './agent';
export * from './types';
export * from './api';
export * from './skills';

/**
 * MemeClaw 主类
 */
export class MemeClaw {
  private gateway: Gateway | null = null;
  private agent: Agent | null = null;
  private started: boolean = false;

  /**
   * 启动 MemeClaw
   */
  async start(): Promise<void> {
    if (this.started) {
      console.log('MemeClaw is already running');
      return;
    }

    const config = getConfig();

    // 加载技能
    const skillsConfig = config.get('skills');
    if (skillsConfig.autoLoad) {
      for (const skillPath of skillsConfig.skillPaths) {
        const loaded = await skillLoader.loadFromDir(skillPath);
        console.log(`Loaded ${loaded} skills from ${skillPath}`);
      }
    }

    // 启动 Gateway
    const gatewayConfig = config.get('gateway');
    this.gateway = new Gateway(gatewayConfig);
    await this.gateway.start();

    // 创建 Agent
    const agentConfig = config.get('agent');
    this.agent = createAgent(agentConfig);

    this.started = true;
    console.log('🦞 MemeClaw is ready!');
  }

  /**
   * 停止 MemeClaw
   */
  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    if (this.gateway) {
      await this.gateway.stop();
    }

    this.started = false;
    console.log('MemeClaw stopped');
  }

  /**
   * 获取 Gateway
   */
  getGateway(): Gateway | null {
    return this.gateway;
  }

  /**
   * 获取 Agent
   */
  getAgent(): Agent | null {
    return this.agent;
  }

  /**
   * 是否已启动
   */
  isRunning(): boolean {
    return this.started;
  }
}

/**
 * 创建 MemeClaw 实例
 */
export function createMemeClaw(): MemeClaw {
  return new MemeClaw();
}
