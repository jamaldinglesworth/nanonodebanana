import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '../lib/constants'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface Settings {
  geminiApiKey: string
  falApiKey: string
  autoSave: boolean
  autoSaveInterval: number
  theme: 'dark' | 'light'
  curvedConnections: boolean
  showMinimap: boolean
  snapToGrid: boolean
  gridSize: number
}

const DEFAULT_SETTINGS: Settings = {
  geminiApiKey: '',
  falApiKey: '',
  autoSave: true,
  autoSaveInterval: 60,
  theme: 'dark',
  curvedConnections: true,
  showMinimap: false,
  snapToGrid: true,
  gridSize: 10,
}


/**
 * Settings dialog for configuring the workflow editor.
 * Manages API keys, editor preferences, and appearance.
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<'api' | 'editor' | 'appearance'>('api')
  const [saved, setSaved] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch {
        console.warn('Failed to parse stored settings')
      }
    }
  }, [])

  // Handle save
  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [settings])

  // Handle reset
  const handleReset = useCallback(() => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS)
      localStorage.removeItem(STORAGE_KEYS.SETTINGS)
    }
  }, [])

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-zinc-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-zinc-50">Settings</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {[
            { id: 'api', label: 'API Keys' },
            { id: 'editor', label: 'Editor' },
            { id: 'appearance', label: 'Appearance' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={e => updateSetting('geminiApiKey', e.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Required for Gemini-based image generation. Get one at{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Fal.ai API Key
                </label>
                <input
                  type="password"
                  value={settings.falApiKey}
                  onChange={e => updateSetting('falApiKey', e.target.value)}
                  placeholder="fal_..."
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Required for Flux and video generation. Get one at{' '}
                  <a
                    href="https://fal.ai/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Fal.ai Dashboard
                  </a>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Auto-save</p>
                  <p className="text-xs text-zinc-500">Automatically save workflow periodically</p>
                </div>
                <button
                  onClick={() => updateSetting('autoSave', !settings.autoSave)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.autoSave ? 'bg-blue-600' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      settings.autoSave ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {settings.autoSave && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Auto-save interval (seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={settings.autoSaveInterval}
                    onChange={e => updateSetting('autoSaveInterval', parseInt(e.target.value) || 60)}
                    className="w-24 rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Snap to grid</p>
                  <p className="text-xs text-zinc-500">Align nodes to grid when moving</p>
                </div>
                <button
                  onClick={() => updateSetting('snapToGrid', !settings.snapToGrid)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.snapToGrid ? 'bg-blue-600' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      settings.snapToGrid ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {settings.snapToGrid && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Grid size (pixels)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={settings.gridSize}
                    onChange={e => updateSetting('gridSize', parseInt(e.target.value) || 10)}
                    className="w-24 rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Curved connections</p>
                  <p className="text-xs text-zinc-500">Use bezier curves for node connections</p>
                </div>
                <button
                  onClick={() => updateSetting('curvedConnections', !settings.curvedConnections)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.curvedConnections ? 'bg-blue-600' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      settings.curvedConnections ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Show minimap</p>
                  <p className="text-xs text-zinc-500">Display a navigation minimap</p>
                </div>
                <button
                  onClick={() => updateSetting('showMinimap', !settings.showMinimap)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.showMinimap ? 'bg-blue-600' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      settings.showMinimap ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={e => updateSetting('theme', e.target.value as 'dark' | 'light')}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light (coming soon)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-700 px-4 py-3">
          <button
            onClick={handleReset}
            className="text-sm text-zinc-400 hover:text-zinc-300"
          >
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-sm text-green-400">Saved!</span>
            )}
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to access settings from anywhere in the app.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch {
        console.warn('Failed to parse stored settings')
      }
    }

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        } catch {
          console.warn('Failed to parse settings from storage event')
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return settings
}
