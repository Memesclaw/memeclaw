/**
 * 技能加载器 - OpenClaw 格式
 * 支持 YAML frontmatter + Markdown 格式的技能定义
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// 技能定义
export interface Skill {
  name: string;
  description: string;
  version: string;
  emoji: string;
  category: string;
  requires: {
    bins: string[];
    env: string[];
  };
  allowedTools: string[];
  content: string; // Markdown 内容
  source: string; // 来源文件路径
}

// 解析 SKILL.md 文件
export function parseSkillFile(filePath: string): Skill | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 提取 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.warn(`技能文件缺少 frontmatter: ${filePath}`);
      return null;
    }

    // 简单解析 YAML（对于基本结构足够）
    const yaml = frontmatterMatch[1];
    const metadata: any = {};

    // 解析键值对
    const lines = yaml.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // 处理不同类型的值
        if (key === 'requires') {
          // requires 是嵌套对象，跳过
          continue;
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // 数组
          metadata[key] = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
        } else if (value === 'true' || value === 'false') {
          metadata[key] = value === 'true';
        } else {
          metadata[key] = value.replace(/['"]/g, '');
        }
      }
    }

    // 提取 Markdown 内容（移除 frontmatter）
    const markdown = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    // 解析 requires 部分（手动处理）
    const requiresMatch = yaml.match(/requires:\s*\n([\s\S]*?)(?=\n\w+:|---)/);
    const requires: { bins: string[]; env: string[] } = { bins: [], env: [] };
    if (requiresMatch) {
      const reqLines = requiresMatch[1].split('\n');
      for (const reqLine of reqLines) {
        const binMatch = reqLine.match(/bins:\s*\[(.+)\]/);
        const envMatch = reqLine.match(/env:\s*\[(.+)\]/);
        if (binMatch) {
          requires.bins = binMatch[1].split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
        }
        if (envMatch) {
          requires.env = envMatch[1].split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
        }
      }
    }

    // 解析 allowed-tools
    const toolsMatch = yaml.match(/allowed-tools:\s*\n([\s\S]*?)(?=\n---|\n\w+:)/);
    const allowedTools: string[] = [];
    if (toolsMatch) {
      const toolLines = toolsMatch[1].split('\n');
      for (const toolLine of toolLines) {
        const toolMatch = toolLine.match(/-\s*(\w+)/);
        if (toolMatch) {
          allowedTools.push(toolMatch[1]);
        }
      }
    }

    return {
      name: metadata.name || path.basename(path.dirname(filePath)),
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      emoji: metadata.emoji || '🔧',
      category: metadata.category || 'general',
      requires,
      allowedTools,
      content: markdown,
      source: filePath,
    };
  } catch (error: any) {
    console.error(`解析技能文件失败 ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 扫描技能目录
 */
export function scanSkillDirectory(dir: string): Skill[] {
  const skills: Skill[] = [];

  if (!fs.existsSync(dir)) {
    return skills;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 目录式技能：检查 SKILL.md
      const skillFile = path.join(fullPath, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const skill = parseSkillFile(skillFile);
        if (skill) {
          skills.push(skill);
        }
      }
    } else if (entry.name.endsWith('.md')) {
      // 平面式技能：直接解析 .md 文件
      const skill = parseSkillFile(fullPath);
      if (skill) {
        skills.push(skill);
      }
    }
  }

  return skills;
}

/**
 * 加载所有技能
 */
export function loadAllSkills(): Skill[] {
  const skills: Skill[] = [];

  // 技能搜索路径（按优先级）
  const skillPaths = [
    path.join(os.homedir(), '.memeclaw', 'skills'),
    path.join(process.cwd(), 'skills'),
  ];

  for (const skillPath of skillPaths) {
    const found = scanSkillDirectory(skillPath);
    skills.push(...found);
  }

  return skills;
}

/**
 * 检查技能需求是否满足
 */
export function checkSkillRequirements(skill: Skill): { satisfied: boolean; missing: string[] } {
  const missing: string[] = [];

  // 检查 bins
  for (const bin of skill.requires.bins) {
    try {
      // 简单检查命令是否存在
      require.resolve(bin);
    } catch {
      missing.push(`bin: ${bin}`);
    }
  }

  // 检查 env
  for (const envVar of skill.requires.env) {
    if (!process.env[envVar]) {
      missing.push(`env: ${envVar}`);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}

/**
 * 获取可用技能（需求已满足）
 */
export function getAvailableSkills(): Skill[] {
  const allSkills = loadAllSkills();
  return allSkills.filter(skill => checkSkillRequirements(skill).satisfied);
}

/**
 * 根据消息匹配技能
 */
export function matchSkills(message: string): Skill[] {
  const lowerMessage = message.toLowerCase();
  const available = getAvailableSkills();
  const matched: Skill[] = [];

  for (const skill of available) {
    // 检查描述中是否有关键词匹配
    const keywords = skill.description.toLowerCase().split(/\s+/);
    for (const keyword of keywords) {
      if (keyword.length > 2 && lowerMessage.includes(keyword)) {
        matched.push(skill);
        break;
      }
    }
  }

  return matched;
}

/**
 * 构建技能提示（用于注入到系统提示）
 */
export function buildSkillsPrompt(skills?: Skill[]): string {
  const skillList = skills || getAvailableSkills();

  if (skillList.length === 0) {
    return '暂无可用技能。';
  }

  const sections: string[] = skillList.map(skill => {
    const tools = skill.allowedTools.length > 0
      ? `\n  工具: ${skill.allowedTools.join(', ')}`
      : '';

    return `- **${skill.emoji} ${skill.name}**: ${skill.description}${tools}`;
  });

  return `## 可用技能\n\n${sections.join('\n')}`;
}

/**
 * 导出技能到 JSON
 */
export function exportSkillsToJson(skills: Skill[], outputPath: string): void {
  const data = JSON.stringify(skills, null, 2);
  fs.writeFileSync(outputPath, data, 'utf-8');
}

/**
 * 从 JSON 导入技能
 */
export function importSkillsFromJson(jsonPath: string): Skill[] {
  const content = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content);
}
