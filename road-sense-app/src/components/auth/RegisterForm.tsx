'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'VIEWER'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'register',
          username: formData.username,
          password: formData.password,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role
        }),
      })

      if (response.ok) {
        // Auto-login after registration
        const loginResponse = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'login', 
            username: formData.username, 
            password: formData.password 
          }),
        })

        if (loginResponse.ok) {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Road Sense Racing
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                name="firstName"
                type="text"
                required
                className="border text-black border-gray-300 px-3 py-2 rounded-md"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
              />
              <input
                name="lastName"
                type="text"
                required
                className="border text-black border-gray-300 px-3 py-2 rounded-md"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            <input
              name="username"
              type="text"
              required
              className="w-full border text-black border-gray-300 px-3 py-2 rounded-md"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
            />
            <input
              name="email"
              type="email"
              required
              className="w-full border text-black border-gray-300 px-3 py-2 rounded-md"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
            />
            <select
              name="role"
              className="w-full border text-black border-gray-300 px-3 py-2 rounded-md"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="VIEWER">Viewer</option>
              <option value="DATA_ANALYST">Data Analyst</option>
              <option value="STRATEGIST">Strategist</option>
              <option value="RACE_ENGINEER">Race Engineer</option>
            </select>
            <input
              name="password"
              type="password"
              required
              className="w-full border text-black border-gray-300 px-3 py-2 rounded-md"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
            <input
              name="confirmPassword"
              type="password"
              required
              className="w-full border text-black border-gray-300 px-3 py-2 rounded-md"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}