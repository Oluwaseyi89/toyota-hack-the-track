'use client'
import { useState, useEffect } from 'react'
import { User } from '@/types/user'

// interface User {
//   id: number
//   username: string
//   email: string
//   firstName: string
//   lastName: string
//   role: string
//   permissions: {
//     can_access_live_data: boolean
//     can_modify_strategy: boolean
//     can_acknowledge_alerts: boolean
//   }
// }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
      window.location.href = '/'
    }
  }

  return { user, isLoading, logout, checkAuth }
}