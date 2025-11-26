'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// Define the available views
export type DashboardView = 'dashboard' | 'telemetry' | 'strategy' | 'analysis' | 'settings'

const navigation: { name: string; view: DashboardView; icon: string }[] = [
  { name: 'Dashboard', view: 'dashboard', icon: '📊' },
  { name: 'Telemetry', view: 'telemetry', icon: '⚡' },
  { name: 'Strategy', view: 'strategy', icon: '🎯' },
  { name: 'Analysis', view: 'analysis', icon: '📈' },
  { name: 'Settings', view: 'settings', icon: '⚙️' },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') as DashboardView || 'dashboard'

  const createHref = (view: DashboardView) => {
    if (view === 'dashboard') {
      return '/dashboard'
    }
    return `/dashboard?view=${view}`
  }

  return (
    <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header with collapse button */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-2 text-left hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
          >
            {isCollapsed ? '→' : '← Collapse'}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = currentView === item.view
            return (
              <Link
                key={item.view}
                href={createHref(item.view)}
                className={`flex items-center space-x-3 w-full px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium text-left">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>
        
        {/* Footer with user info */}
        <div className="p-4 border-t border-gray-700">
          <div className={`flex items-center space-x-3 ${
            isCollapsed ? 'justify-center' : ''
          }`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">RS</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Race Engineer</p>
                <p className="text-sm text-gray-400 truncate">Connected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
