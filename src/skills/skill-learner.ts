/**
 * 技能学习器 - 让 MemeClaw 通过对话学习新技能
 */

import { Skill } from '../types';
import { learnSkill, forgetSkill, listUserSkills } from './loader';
import { skillRegistry } from './registry';

// 技能学习器 - 内置技能
export const skillLearnerSkill: Skill = {
  id: 'skill-learner',
  name: '技能学习器',
  description: '学习新技能、管理用户技能。通过对话学习新技能并保存',
  category: 'system',
  enabled: true,
  handler: async (input, context) => {
    const action = input?.action || input?.command;

    switch (action) {
      case 'learn':
      case 'learn-skill':
      case '学习':
        return learnNewSkill(input);

      case 'forget':
      case 'delete':
      case '删除':
        return deleteSkill(input);

      case 'list':
      case 'ls':
      case '列表':
        return listSkills();

      case 'help':
      case '帮助':
        return showHelp();

      default:
        return {
          success: true,
          message: `技能学习器

可用命令:
  - learn: 学习新技能
  - forget: 删除技能
  - list: 列出用户技能
  - help: 显示帮助

示例:
  /skill:skill-learner {"action":"learn","id":"my-skill","name":"我的技能","description":"描述","prompt":"你是..."}`
        };
    }
  },
};

/**
 * 学习新技能
 */
async function learnNewSkill(input: any) {
  const { id, name, description, category, prompt, url } = input;

  if (!id || !name || !prompt) {
    return {
      success: false,
      error: `缺少必要参数。需要: id, name, prompt

参数说明:
  id: 技能ID (如: my-skill)
  name: 技能名称 (如: 我的技能)
  description: 技能描述 (可选)
  category: 分类 (默认: custom)
  prompt: 技能提示词
  url: 从URL学习 (可选)

示例:
  /skill:skill-learner {
    "action":"learn",
    "id":"price-tracker",
    "name":"价格追踪器",
    "description":"追踪加密货币价格",
    "prompt":"你是价格追踪专家，帮助用户查询代币价格..."
  }`
    };
  }

  const result = learnSkill({
    id,
    name,
    description: description || '',
    category: category || 'custom',
    prompt,
  });

  if (result.success) {
    return {
      success: true,
      message: `✅ 技能已学习!

技能ID: ${id}
名称: ${name}
保存位置: ${result.path}

现在可以直接使用:
  /skill:${id} <参数>

或者在对话中我会自动识别并调用此技能。`
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * 删除技能
 */
async function deleteSkill(input: any) {
  const { id } = input;

  if (!id) {
    return {
      success: false,
      error: '请指定要删除的技能ID',
    };
  }

  const result = forgetSkill(id);

  if (result.success) {
    return {
      success: true,
      message: `✅ 技能 "${id}" 已删除`,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * 列出用户技能
 */
async function listSkills() {
  const skills = listUserSkills();

  if (skills.length === 0) {
    return {
      success: true,
      message: `📚 用户技能列表

暂无用户技能。使用 "learn" 命令学习新技能!`,
    };
  }

  const lines = ['📚 用户技能列表\n', ''];
  for (const skill of skills) {
    lines.push(`📌 ${skill.name} (${skill.id})`);
    lines.push(`   ${skill.description}`);
    lines.push(`   使用: /skill:${skill.id}`);
    lines.push('');
  }

  return {
    success: true,
    message: lines.join('\n'),
  };
}

/**
 * 显示帮助
 */
async function showHelp() {
  return {
    success: true,
    message: `🦞 技能学习器 - 帮助

通过对话让 MemeClaw 学习新技能!

**学习新技能**
/skill:skill-learner {
  "action": "learn",
  "id": "my-skill",
  "name": "我的技能",
  "description": "技能描述",
  "prompt": "你是...请..."
}

**列出技能**
/skill:skill-learner {"action": "list"}

**删除技能**
/skill:skill-learner {"action": "forget", "id": "skill-id"}

**技能格式**
技能使用 Markdown 格式存储，包含:
- frontmatter: id, name, description, category
- prompt: 实际的技能指令

技能会保存到 ~/.memeclaw/skills/ 目录`,
  };
}

// 自动注册
skillRegistry.register(skillLearnerSkill);
