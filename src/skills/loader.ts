import fs from 'fs';
import path from 'path';
import os from 'os';
import { skillRegistry } from './registry';
import { Skill } from '../types';

// 技能分类类型
type SkillCategory = 'memecoin' | 'tokenomics' | 'trading' | 'analysis' | 'custom' | 'system';

/**
 * 获取用户技能目录
 */
export function getSkillsDir(): string {
  const homeDir = os.homedir();
  const skillsDir = path.join(homeDir, '.memeclaw', 'skills');

  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  return skillsDir;
}

/**
 * 解析 Markdown 技能文件
 */
function parseMarkdownSkill(content: string, filename: string): Skill | null {
  // 解析 frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const prompt = frontmatterMatch[2].trim();

  // 解析 frontmatter 字段
  const fields: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2];
    }
  }

  const id = filename.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // 确保 category 是有效的类型
  const validCategories: SkillCategory[] = ['memecoin', 'tokenomics', 'trading', 'analysis', 'custom', 'system'];
  let category: SkillCategory = 'custom';

  if (fields.category && validCategories.includes(fields.category as SkillCategory)) {
    category = fields.category as SkillCategory;
  }

  return {
    id: fields.id || id,
    name: fields.name || id,
    description: fields.description || '',
    category,
    enabled: true,
    handler: async (input, context) => {
      // Markdown 技能使用 prompt 模式
      // 返回 prompt 让 Agent 使用
      return {
        type: 'prompt',
        prompt: prompt,
        input,
        context,
      };
    },
    prompt, // 存储 prompt 供 Agent 使用
  };
}

/**
 * 技能加载器 - 动态加载技能
 */
export class SkillLoader {
  private loadedPaths: Set<string> = new Set();

  /**
   * 从目录加载技能
   */
  public async loadFromDir(dirPath: string): Promise<number> {
    if (!fs.existsSync(dirPath)) {
      console.warn(`Skill directory not found: ${dirPath}`);
      return 0;
    }

    const files = fs.readdirSync(dirPath);
    let loaded = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);

      // 跳过已加载的文件
      if (this.loadedPaths.has(filePath)) {
        continue;
      }

      try {
        // 检查是否是目录（目录式技能：SKILL.md）
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          const skillFile = path.join(filePath, 'SKILL.md');
          if (fs.existsSync(skillFile) && !this.loadedPaths.has(skillFile)) {
            if (this.loadFromMarkdown(skillFile)) {
              loaded++;
            }
          }
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
          await this.loadFromScript(filePath);
          loaded++;
        } else if (file.endsWith('.md')) {
          if (this.loadFromMarkdown(filePath)) {
            loaded++;
          }
        } else if (file.endsWith('.json')) {
          loaded += this.loadFromJSON(filePath);
        }
      } catch (error) {
        console.error(`Failed to load skill from ${filePath}:`, error);
      }
    }

    return loaded;
  }

  /**
   * 从脚本文件加载技能
   */
  private async loadFromScript(filePath: string): Promise<void> {
    if (this.loadedPaths.has(filePath)) {
      return;
    }

    const module = await import(filePath);
    const skill = module.default || module.skill;

    if (skill && skill.id && skill.handler) {
      skillRegistry.register(skill);
      this.loadedPaths.add(filePath);
    }
  }

  /**
   * 从 Markdown 文件加载技能
   */
  public loadFromMarkdown(filePath: string): boolean {
    if (this.loadedPaths.has(filePath)) {
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    const skill = parseMarkdownSkill(content, filename);

    if (skill) {
      skillRegistry.register(skill);
      this.loadedPaths.add(filePath);
      return true;
    }

    return false;
  }

  /**
   * 从 JSON 配置加载技能
   */
  public loadFromJSON(jsonPath: string): number {
    if (!fs.existsSync(jsonPath) || this.loadedPaths.has(jsonPath)) {
      return 0;
    }

    const content = fs.readFileSync(jsonPath, 'utf-8');
    const skills: Skill[] = JSON.parse(content);

    let loaded = 0;
    for (const skillDef of skills) {
      try {
        const skill: Skill = {
          ...skillDef,
          handler: async (input, context) => {
            return { message: `Skill ${skillDef.name} executed`, input };
          },
        };
        skillRegistry.register(skill);
        loaded++;
      } catch (error) {
        console.error(`Failed to load skill from JSON:`, error);
      }
    }

    this.loadedPaths.add(jsonPath);
    return loaded;
  }

  /**
   * 加载用户技能目录
   */
  public async loadUserSkills(): Promise<number> {
    const skillsDir = getSkillsDir();
    return this.loadFromDir(skillsDir);
  }

  /**
   * 获取已加载的路径
   */
  public getLoadedPaths(): string[] {
    return Array.from(this.loadedPaths);
  }
}

/**
 * 学习新技能 - 保存到用户技能目录
 */
export function learnSkill(skill: {
  id: string;
  name: string;
  description: string;
  category?: string;
  prompt: string;
}): { success: boolean; path?: string; error?: string } {
  const skillsDir = getSkillsDir();

  // 清理 ID
  const safeId = skill.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const filePath = path.join(skillsDir, `${safeId}.md`);

  // 检查是否已存在
  if (fs.existsSync(filePath)) {
    return { success: false, error: `Skill "${safeId}" already exists` };
  }

  // 生成 Markdown 内容
  const content = `---
id: ${safeId}
name: ${skill.name}
description: ${skill.description}
category: ${skill.category || 'custom'}
---

${skill.prompt}
`;

  try {
    fs.writeFileSync(filePath, content, 'utf-8');

    // 立即加载新技能
    const loader = new SkillLoader();
    loader.loadFromMarkdown(filePath);

    return { success: true, path: filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 删除技能
 */
export function forgetSkill(skillId: string): { success: boolean; error?: string } {
  const skillsDir = getSkillsDir();
  const filePath = path.join(skillsDir, `${skillId}.md`);

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `Skill "${skillId}" not found` };
  }

  try {
    fs.unlinkSync(filePath);

    // 从注册表移除
    skillRegistry.unregister(skillId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 列出用户技能
 */
export function listUserSkills(): Array<{ id: string; name: string; description: string; path: string }> {
  const skillsDir = getSkillsDir();
  const skills: Array<{ id: string; name: string; description: string; path: string }> = [];

  if (!fs.existsSync(skillsDir)) {
    return skills;
  }

  const files = fs.readdirSync(skillsDir);

  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(skillsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseMarkdownSkill(content, file);

      if (parsed) {
        skills.push({
          id: parsed.id,
          name: parsed.name,
          description: parsed.description,
          path: filePath,
        });
      }
    }
  }

  return skills;
}

// 全局加载器实例
export const skillLoader = new SkillLoader();
