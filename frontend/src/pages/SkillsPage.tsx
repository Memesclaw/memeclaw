import { useState } from 'react'
import { Search, Book, ToggleLeft, ToggleRight, Code, TrendingUp, BarChart2, Coins, Wallet, Sun } from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  tools: string[]
}

const skills: Skill[] = [
  {
    id: 'bnb-wallet',
    name: 'BNB Wallet',
    description: 'Query BNB balance, transaction history, and token holdings',
    category: 'bnb',
    enabled: true,
    tools: ['bnb_balance', 'bnb_history', 'bnb_holdings'],
  },
  {
    id: 'bnb-swap',
    name: 'PancakeSwap',
    description: 'Token swap, price quotes, and liquidity info',
    category: 'bnb',
    enabled: true,
    tools: ['bnb_price', 'bnb_token_search', 'bnb_common_tokens'],
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Get weather information for any city worldwide',
    category: 'utility',
    enabled: true,
    tools: ['get_weather'],
  },
  {
    id: 'crypto-prices',
    name: 'Crypto Prices',
    description: 'Query cryptocurrency prices and market data',
    category: 'crypto',
    enabled: true,
    tools: ['get_crypto_price', 'bnb_price'],
  },
  {
    id: 'memory',
    name: 'Long-term Memory',
    description: 'Save and search important information across sessions',
    category: 'system',
    enabled: true,
    tools: ['memory_save', 'memory_search', 'daily_note'],
  },
  {
    id: 'cron',
    name: 'Scheduled Tasks',
    description: 'Create reminders and scheduled automations',
    category: 'system',
    enabled: true,
    tools: ['cron_create', 'cron_list', 'cron_cancel'],
  },
]

const categoryIcons: Record<string, any> = {
  bnb: Wallet,
  crypto: Coins,
  utility: Sun,
  system: Code,
  trading: TrendingUp,
  analysis: BarChart2,
}

const categoryColors: Record<string, string> = {
  bnb: 'from-yellow-500 to-amber-600',
  crypto: 'from-blue-500 to-cyan-500',
  utility: 'from-green-500 to-emerald-500',
  system: 'from-purple-500 to-pink-500',
}

export default function SkillsPage() {
  const [skillList, setSkillList] = useState<Skill[]>(skills)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredSkills = skillList.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(skillList.map(s => s.category))]

  const toggleSkill = (id: string) => {
    setSkillList(prev => prev.map(skill =>
      skill.id === id ? { ...skill, enabled: !skill.enabled } : skill
    ))
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Skills</h1>
          <p className="text-slate-400">Manage MemeClaw's capabilities. {skillList.filter(s => s.enabled).length} of {skillList.length} skills active</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full bg-slate-800 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-700"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
              selectedCategory === null
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition-colors capitalize font-medium ${
                selectedCategory === category
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="grid gap-4">
          {filteredSkills.map(skill => {
            const Icon = categoryIcons[skill.category] || Book
            const colorClass = categoryColors[skill.category] || 'from-slate-500 to-slate-600'
            return (
              <div
                key={skill.id}
                className={`bg-slate-800 rounded-xl p-5 border transition-all ${
                  skill.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{skill.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded capitalize">
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{skill.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {skill.tools.map(tool => (
                        <code key={tool} className="text-xs bg-slate-900 text-amber-400 px-2 py-1 rounded">
                          {tool}
                        </code>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSkill(skill.id)}
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                      skill.enabled
                        ? 'text-green-500 hover:bg-green-500/20'
                        : 'text-slate-500 hover:bg-slate-700'
                    }`}
                    title={skill.enabled ? 'Disable' : 'Enable'}
                  >
                    {skill.enabled ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-12">
            <Book className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No matching skills found</p>
          </div>
        )}

        {/* Add Skill */}
        <div className="mt-8 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
          <h3 className="font-semibold text-white mb-2">Add New Skills</h3>
          <p className="text-sm text-slate-400 mb-4">
            MemeClaw can learn new skills. Create a SKILL.md file and place it in the skills directory.
          </p>
          <div className="bg-slate-900 rounded-lg p-4 mb-4">
            <code className="text-sm text-slate-300">
              ~/.memeclaw/skills/my-skill/SKILL.md
            </code>
          </div>
          <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors font-medium">
            Learn How to Create Skills
          </button>
        </div>
      </div>
    </div>
  )
}
