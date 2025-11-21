export function Header() {
    return (
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Road Sense Racing</h1>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">Live</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Session: <span className="font-semibold">Practice 1</span>
            </div>
            <div className="text-sm text-gray-300">
              Track: <span className="font-semibold">Circuit de Barcelona-Catalunya</span>
            </div>
          </div>
        </div>
      </header>
    )
  }