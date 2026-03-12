import { Link } from 'react-router-dom'
import { MessageSquare, Wrench, Database, Coins, Clock, Brain } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Coins,
      title: 'BNB Chain 集成',
      description: '完整的 BNB Chain 支持，查询余额、交易历史、代币信息',
      link: '/chat',
      color: 'from-yellow-500 to-amber-500',
    },
    {
      icon: MessageSquare,
      title: '智能对话',
      description: '24/7 全天候 AI 助手，基于 Claude 强大的语言能力',
      link: '/chat',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Wrench,
      title: '技能系统',
      description: '35+ 内置技能，支持学习新技能，持续扩展',
      link: '/skills',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Database,
      title: '长期记忆',
      description: '持久化记忆系统，记住你的偏好和重要信息',
      link: '/chat',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Clock,
      title: '定时任务',
      description: '创建提醒和定时任务，自动执行',
      link: '/chat',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Brain,
      title: '自我迭代',
      description: '可学习新技能，不断优化和改进',
      link: '/settings',
      color: 'from-indigo-500 to-purple-500',
    },
  ]

  const tools = [
    { name: 'bnb_balance', desc: '查询 BNB 余额' },
    { name: 'bnb_price', desc: '获取 BNB 价格' },
    { name: 'bnb_history', desc: '交易历史' },
    { name: 'memory_save', desc: '保存记忆' },
    { name: 'cron_create', desc: '创建提醒' },
    { name: 'bnb_token_search', desc: '搜索代币' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="w-28 h-28 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-yellow-500/30 animate-pulse-slow">
            <span className="text-6xl">🦞</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              MemeClaw
            </span>
          </h1>
          <p className="text-2xl text-amber-400 font-semibold mb-4">
            BNB Chain AI Agent
          </p>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            基于 OpenClaw 架构的全天候 AI 智能体
            <br />
            56+ 工具 • 35+ 技能 • 可学习新技能
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all shadow-lg shadow-yellow-500/30 text-lg"
            >
              <MessageSquare className="w-6 h-6" />
              开始使用
            </Link>
            <a
              href="https://github.com/memeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all border border-slate-700 text-lg"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">56+</div>
              <div className="text-slate-400">内置工具</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-400 mb-2">35+</div>
              <div className="text-slate-400">技能库</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
              <div className="text-slate-400">全天候运行</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-300 mb-2">∞</div>
              <div className="text-slate-400">学习能力</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          核心功能
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link
                key={index}
                to={feature.link}
                className="group bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-yellow-500 transition-all hover:shadow-lg hover:shadow-yellow-500/10"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400">
                  {feature.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tools Section */}
      <div className="bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            工具示例
          </h2>
          <p className="text-center text-slate-400 mb-12">
            支持的工具覆盖 BNB Chain、记忆、定时任务等多个领域
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tools.map((tool, index) => (
              <div key={index} className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                <code className="text-yellow-400 text-sm">{tool.name}</code>
                <p className="text-slate-500 text-xs mt-2">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          架构设计
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <h3 className="text-xl font-semibold text-yellow-400 mb-4">📁 OpenClaw 架构</h3>
            <p className="text-slate-400 mb-4">
              基于 OpenClaw 的成熟架构，支持多渠道接入、插件系统和技能扩展。
            </p>
            <ul className="space-y-2 text-slate-400">
              <li>• 多渠道：Telegram、Discord、WebSocket</li>
              <li>• 插件系统：可扩展的工具和技能</li>
              <li>• 会话管理：持久化会话历史</li>
            </ul>
          </div>
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <h3 className="text-xl font-semibold text-amber-400 mb-4">🔗 BNB Chain 集成</h3>
            <p className="text-slate-400 mb-4">
              从 Solana 迁移到 BNB Chain，使用 PancakeSwap 替代 Jupiter。
            </p>
            <ul className="space-y-2 text-slate-400">
              <li>• BSC RPC：查询余额和交易</li>
              <li>• PancakeSwap：代币交换和价格</li>
              <li>• BscScan API：交易历史和持仓</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border-y border-yellow-500/20">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好了吗？
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            开始使用 MemeClaw，体验强大的 BNB Chain AI Agent
          </p>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all shadow-lg shadow-yellow-500/30 text-lg"
          >
            <MessageSquare className="w-6 h-6" />
            立即开始
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <span className="text-3xl">🦞</span>
              <span className="text-white font-semibold">MemeClaw</span>
            </div>
            <p className="text-slate-500 text-sm">
              BNB Chain AI Agent • 基于 OpenClaw 架构
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
