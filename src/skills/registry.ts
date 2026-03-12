import { Skill, SkillResult } from '../types';

/**
 * 技能注册表 - 管理所有可用技能
 */
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * 注册技能
   */
  public register(skill: Skill): void {
    this.skills.set(skill.id, skill);

    if (!this.categories.has(skill.category)) {
      this.categories.set(skill.category, new Set());
    }
    this.categories.get(skill.category)!.add(skill.id);
  }

  /**
   * 注销技能
   */
  public unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    this.skills.delete(skillId);
    this.categories.get(skill.category)?.delete(skillId);

    return true;
  }

  /**
   * 获取技能
   */
  public get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 获取所有技能
   */
  public getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按分类获取技能
   */
  public getByCategory(category: string): Skill[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.skills.get(id)!).filter(Boolean);
  }

  /**
   * 搜索技能
   */
  public search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 执行技能
   */
  public async execute(skillId: string, input: any, context: any): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`,
      };
    }

    if (!skill.enabled) {
      return {
        success: false,
        error: `Skill is disabled: ${skillId}`,
      };
    }

    try {
      const result = await skill.handler(input, context);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 启用/禁用技能
   */
  public setEnabled(skillId: string, enabled: boolean): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    skill.enabled = enabled;
    return true;
  }
}

// 全局技能注册表实例
export const skillRegistry = new SkillRegistry();
