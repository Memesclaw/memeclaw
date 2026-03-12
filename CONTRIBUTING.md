# Contributing to MemeClaw

感谢你对 MemeClaw 感兴趣！

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请 [创建 Issue](https://github.com/Memesclaw/memeclaw/issues/new) 并包含：

- 详细的复现步骤
- 预期行为 vs 实际行为
- 截图（如果有帮助）
- 你的环境（Node 版本、操作系统等）

### 提出新功能

欢迎提出新功能建议！请 [创建 Issue](https://github.com/Memesclaw/memeclaw/issues/new) 描述：

- 功能描述
- 使用场景
- 可能的实现方式（可选）

### 提交代码

1. **Fork 本仓库**

2. **克隆你的 Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/memeclaw.git
   cd memeclaw
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

5. **进行修改并测试**
   ```bash
   npm run build
   npm run lint
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `refactor:` 代码重构
   - `chore:` 其他改动

7. **推送到 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   - 去 GitHub 你的 Fork 页面
   - 点击 "Compare & pull request"
   - 填写 PR 描述

### 添加新技能

MemeClaw 支持技能扩展。添加新技能：

1. 在 `skills/` 目录下创建新文件夹
2. 添加 `SKILL.md` 文件，包含：
   - 技能名称和描述
   - API 文档
   - 使用示例
3. 提交 PR

## 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 添加必要的注释
- 保持代码简洁

## 许可证

提交代码即表示你同意你的贡献将以 [MIT License](LICENSE) 授权。

## 社区贡献

如果你觉得这个项目有帮助，欢迎通过以下地址支持：

**EVM: `0x528abb7048cdcdbf81a7892e7f6619509b2b9624`**

---

再次感谢你的贡献！

有问题？加入我们的社区讨论或创建 Issue。
