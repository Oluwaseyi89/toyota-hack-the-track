// export function Header() {
//     return (
//       <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center space-x-4">
//             <h1 className="text-xl font-bold">Road Sense Racing</h1>
//             <div className="flex items-center space-x-2 text-sm">
//               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//               <span className="text-green-400">Live</span>
//             </div>
//           </div>
          
//           <div className="flex items-center space-x-4">
//             <div className="text-sm text-gray-300">
//               Session: <span className="font-semibold">Practice 1</span>
//             </div>
//             <div className="text-sm text-gray-300">
//               Track: <span className="font-semibold">Circuit de Barcelona-Catalunya</span>
//             </div>
//           </div>
//         </div>
//       </header>
//     )
//   }









'use client'
import { useAuth } from '../../app/AuthProvider'

export function Header() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout()
    }
  }

  const getRoleDisplay = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'RACE_ENGINEER': 'Race Engineer',
      'STRATEGIST': 'Strategist', 
      'TEAM_MANAGER': 'Team Manager',
      'DATA_ANALYST': 'Data Analyst',
      'VIEWER': 'Viewer'
    }
    return roleMap[role] || role
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Branding & Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white">Road Sense Racing</h1>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">Live</span>
            </div>
          </div>
          
          {/* User Role Badge */}
          {user && (
            <div className="hidden md:flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-medium">
                {getRoleDisplay(user.role)}
              </span>
              {user.permissions.can_modify_strategy && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                  Strategy Access
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center Section - Session Info */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="text-sm text-gray-300">
            Session: <span className="font-semibold text-white">Practice 1</span>
          </div>
          <div className="text-sm text-gray-300">
            Track: <span className="font-semibold text-white">Circuit de Barcelona-Catalunya</span>
          </div>
        </div>

        {/* Right Section - User Info & Controls */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user.role}
                  </p>
                </div>
                
                {/* User Avatar */}
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200"
                title="Logout"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </>
          ) : (
            /* Login Prompt */
            <div className="text-sm text-gray-400">
              Not signed in
            </div>
          )}
        </div>
      </div>

      {/* Mobile Session Info */}
      <div className="lg:hidden mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-gray-300">
            Session: <span className="font-semibold text-white">Practice 1</span>
          </div>
          <div className="text-gray-300">
            Track: <span className="font-semibold text-white">Barcelona</span>
          </div>
        </div>
      </div>
    </header>
  )
}