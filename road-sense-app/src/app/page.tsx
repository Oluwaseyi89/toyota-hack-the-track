// import Link from 'next/link'

// export default function HomePage() {
//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="text-center">
//         <h1 className="text-4xl font-bold mb-4">
//           Road Sense Racing Analytics
//         </h1>
//         <p className="text-xl text-gray-300 mb-8">
//           Real-time strategy and performance insights
//         </p>
//         <Link 
//           href="/dashboard"
//           className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
//         >
//           Enter Dashboard
//         </Link>
//       </div>
//     </div>
//   )
// }








import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
      <div className="text-center text-white">
        {/* Logo/Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Road Sense Racing
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Real-time racing analytics and strategy platform
          </p>
          <p className="text-lg text-gray-400">
            Powered by Toyota GR Racing Data
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-2xl mb-3">🏎️</div>
            <h3 className="font-semibold mb-2">Live Telemetry</h3>
            <p className="text-gray-300 text-sm">
              Real-time vehicle data, tire temperatures, and performance metrics
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">ML Predictions</h3>
            <p className="text-gray-300 text-sm">
              AI-powered tire degradation and pit strategy recommendations
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-2xl mb-3">🚨</div>
            <h3 className="font-semibold mb-2">Smart Alerts</h3>
            <p className="text-gray-300 text-sm">
              Proactive strategy opportunities and critical condition warnings
            </p>
          </div>
        </div>

        {/* Authentication Buttons */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link 
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Sign In to Dashboard
          </Link>
          <Link 
            href="/register"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Create Account
          </Link>
        </div>

        {/* Demo/Hackathon Info */}
        <div className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg max-w-2xl mx-auto">
          <h3 className="font-semibold text-yellow-400 mb-2">Toyota GR Hack the Track</h3>
          <p className="text-gray-300 text-sm">
            Experience real racing data analytics with predictive strategy models. 
            Perfect pit windows, tire management, and race engineering insights.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 flex justify-center space-x-8 text-sm text-gray-400">
          <div>🏁 Real-time Analytics</div>
          <div>🤖 ML-Powered Predictions</div>
          <div>📱 Responsive Design</div>
        </div>
      </div>
    </div>
  )
}