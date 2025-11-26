'use client';

import { 
  useSettingsData, 
  useAuthStatus, 
  useRootStore 
} from '@/store';

import { useEffect, useRef, useState } from 'react';

export default function SettingsView() {
  const isInitializedRef = useRef(false);
  const [activeSection, setActiveSection] = useState<'preferences' | 'system' | 'account'>('preferences');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  /** ----------------------------
   *  SELECTORS FROM UNIFIED STORE
   *  ---------------------------- */
  const { user } = useAuthStatus();

  const {
    preferences,
    system,
    isLoading,
    error,
  } = useSettingsData();

  /** -----------------------------------
   *  ACTIONS MUST BE SELECTED INDIVIDUALLY
   *  ----------------------------------- */
  const setPreferences = useRootStore((s) => s.setPreferences);
  const setSystemSettings = useRootStore((s) => s.setSystemSettings);
  const resetToDefaults = useRootStore((s) => s.resetToDefaults);
  const saveSettings = useRootStore((s) => s.saveSettings);
  const loadSettings = useRootStore((s) => s.loadSettings);

  /** --------------------------------------------------
   *   INITIALIZATION
   *  --------------------------------------------------*/
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    loadSettings();
  }, []);

  /** ----------------------------
   *  HANDLERS
   *  ---------------------------- */
  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    const result = await saveSettings();
    setSaveStatus(result.success ? 'saved' : 'error');
    
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    setSaveStatus('idle');
  };

  /** ----------------------------
   *  LOADING UI
   *  ---------------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-300 mt-2">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Settings Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-gray-300 mt-1">
              Manage your preferences and system configuration
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset Defaults
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                saveStatus === 'saving' 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="text-red-300 text-sm">{error}</div>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="text-red-300 text-sm">Failed to save settings. Please try again.</div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 border border-gray-700 w-fit">
          {[
            { id: 'preferences', label: 'Preferences', icon: '⚙️' },
            { id: 'system', label: 'System', icon: '🔧' },
            { id: 'account', label: 'Account', icon: '👤' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-300 ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{section.icon}</span>
              <span className="font-medium">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Settings Forms */}
        <div className="xl:col-span-2 space-y-6">
          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Display Preferences</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Theme</label>
                      <select 
                        value={preferences.theme}
                        onChange={(e) => setPreferences({ theme: e.target.value as any })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Units</label>
                      <select 
                        value={preferences.units}
                        onChange={(e) => setPreferences({ units: e.target.value as any })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="metric">Metric (km/h)</option>
                        <option value="imperial">Imperial (mph)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">
                      Data Refresh Rate: {preferences.refreshRate}s
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={preferences.refreshRate}
                      onChange={(e) => setPreferences({ refreshRate: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1s</span>
                      <span>15s</span>
                      <span>30s</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Dashboard Layout</label>
                    <select 
                      value={preferences.dashboardLayout}
                      onChange={(e) => setPreferences({ dashboardLayout: e.target.value as any })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="compact">Compact</option>
                      <option value="detailed">Detailed</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                  {Object.entries(preferences.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-gray-300 capitalize">{key} Notifications</label>
                      <input 
                        type="checkbox" 
                        checked={value as boolean}
                        onChange={(e) => setPreferences({
                          notifications: { ...preferences.notifications, [key]: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* System Section */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">System Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">API Endpoint</label>
                    <input 
                      type="text" 
                      value={system.apiEndpoint}
                      onChange={(e) => setSystemSettings({ apiEndpoint: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Data Retention (days)</label>
                      <input 
                        type="number" 
                        value={system.dataRetention}
                        onChange={(e) => setSystemSettings({ dataRetention: parseInt(e.target.value) })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'autoRefresh' as const, label: 'Auto Refresh Data' },
                      { key: 'simulationMode' as const, label: 'Simulation Mode' },
                      { key: 'debugMode' as const, label: 'Debug Mode' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-gray-300">{label}</label>
                        <input 
                          type="checkbox" 
                          checked={system[key]}
                          onChange={(e) => setSystemSettings({ [key]: e.target.checked })}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">First Name</label>
                      <input 
                        type="text" 
                        value={user?.first_name || ''}
                        disabled
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Last Name</label>
                      <input 
                        type="text" 
                        value={user?.last_name || ''}
                        disabled
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Email</label>
                    <input 
                      type="email" 
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Role</label>
                    <input 
                      type="text" 
                      value={user?.role ? user.role.toLowerCase().replace('_', ' ') : ''}
                      disabled
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed capitalize"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white text-lg font-semibold mb-4">Security</h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="text-gray-300 font-medium">Change Password</div>
                    <div className="text-gray-400 text-sm">Update your account password</div>
                  </button>
                  
                  <button className="w-full text-left p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="text-gray-300 font-medium">Two-Factor Authentication</div>
                    <div className="text-gray-400 text-sm">Enable 2FA for extra security</div>
                  </button>
                  
                  <button className="w-full text-left p-3 bg-red-900/30 rounded-lg hover:bg-red-900/40 transition-colors border border-red-800">
                    <div className="text-red-300 font-medium">Delete Account</div>
                    <div className="text-red-400 text-sm">Permanently delete your account and data</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="text-gray-300 font-medium">Export Data</div>
                <div className="text-gray-400 text-sm">Download your race data</div>
              </button>
              
              <button className="w-full text-left p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="text-gray-300 font-medium">Clear Cache</div>
                <div className="text-gray-400 text-sm">Remove temporary data</div>
              </button>
              
              <button className="w-full text-left p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="text-gray-300 font-medium">API Documentation</div>
                <div className="text-gray-400 text-sm">View API reference</div>
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-white text-lg font-semibold mb-4">Current Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Theme</span>
                <span className="text-white capitalize">{preferences.theme}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Units</span>
                <span className="text-white capitalize">{preferences.units}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Refresh Rate</span>
                <span className="text-white">{preferences.refreshRate}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auto Refresh</span>
                <span className="text-white">{system.autoRefresh ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}