import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Road Sense Racing Analytics
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Real-time strategy and performance insights
        </p>
        <Link 
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Enter Dashboard
        </Link>
      </div>
    </div>
  )
}