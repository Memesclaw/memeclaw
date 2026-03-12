import { useState } from 'react'
import { Key, Check, Copy, AlertCircle, Book } from 'lucide-react'

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'api'>('guide')

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const configExample = `{
  "api": {
    "mode": "relay",
    "endpoint": "https://your-api-endpoint.com",
    "key": "sk-your-api-key-here",
    "model": "claude-opus-4-6"
  },
  "gateway": {
    "port": 18789,
    "host": "127.0.0.1",
    "wsPath": "/ws"
  },
  "telegram": {
    "enabled": true,
    "botToken": "your-telegram-bot-token"
  }
}`

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Setup & Configuration</h1>
          <p className="text-slate-400">Get MemeClaw running in a few simple steps</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'guide'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Book className="w-4 h-4" />
            Installation Guide
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'api'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Key className="w-4 h-4" />
            API Configuration
          </button>
        </div>

        {/* Installation Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                <h2 className="text-xl font-semibold text-white">Clone & Install</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <code className="text-green-400 text-sm">
                    git clone https://github.com/memeclaw/memeclaw.git<br/>
                    cd memeclaw<br/>
                    npm install
                  </code>
                </div>
                <p className="text-slate-400 text-sm">Install all dependencies including frontend packages</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                <h2 className="text-xl font-semibold text-white">Configure API</h2>
              </div>
              <div className="space-y-4">
                <p className="text-slate-300">Edit <code className="text-amber-400">~/.memeclaw/config.json</code> with your API settings:</p>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300">{configExample}</pre>
                </div>
                <button
                  onClick={() => copyToClipboard(configExample, 'config')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  {copied === 'config' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied === 'config' ? 'Copied!' : 'Copy Config'}
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">3</div>
                <h2 className="text-xl font-semibold text-white">Start Services</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <code className="text-green-400 text-sm">
                    # Start Gateway (Backend)<br/>
                    npm run gateway<br/><br/>
                    # Start Frontend (New Terminal)<br/>
                    cd frontend<br/>
                    npm run dev
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="text-amber-400 font-semibold mb-1">Gateway</div>
                    <div className="text-slate-400 text-sm">http://127.0.0.1:18789</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="text-amber-400 font-semibold mb-1">Frontend</div>
                    <div className="text-slate-400 text-sm">http://127.0.0.1:5173</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 - Telegram */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">4</div>
                <h2 className="text-xl font-semibold text-white">Telegram Bot (Optional)</h2>
              </div>
              <div className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>Create a bot via <a href="https://t.me/BotFather" target="_blank" className="text-amber-400 hover:underline">@BotFather</a></li>
                  <li>Copy the bot token and add it to config.json under <code className="text-amber-400">telegram.botToken</code></li>
                  <li>Set <code className="text-amber-400">telegram.enabled: true</code></li>
                </ol>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="text-amber-400 font-semibold mb-2">Need Help?</h3>
                  <p className="text-slate-300 text-sm">
                    Check the <a href="https://github.com/memeclaw/memeclaw" target="_blank" className="text-amber-400 hover:underline">GitHub Repository</a> for more documentation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Configuration */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* API Providers */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Supported API Providers</h2>
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-amber-400 font-semibold">Claude API (Recommended)</h3>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Official</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">Direct access to Anthropic's Claude models</p>
                  <code className="text-xs text-slate-500">mode: "direct" | endpoint: https://api.anthropic.com</code>
                </div>

                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-blue-400 font-semibold">OpenAI Compatible</h3>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Compatible</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">Use any OpenAI-compatible API (Azure, local LLMs, etc.)</p>
                  <code className="text-xs text-slate-500">mode: "relay" | provider: "openai"</code>
                </div>

                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-purple-400 font-semibold">Custom Endpoint</h3>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Flexible</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">Use any OpenAI-compatible relay or self-hosted service</p>
                  <code className="text-xs text-slate-500">mode: "custom" | endpoint: "your-api-url"</code>
                </div>
              </div>
            </div>

            {/* Quick Config */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">API Endpoint</label>
                  <input
                    type="text"
                    placeholder="https://api.example.com"
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Edit config.json file directly for changes to take effect</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
