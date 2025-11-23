import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // Get current user info from Django backend
    const response = await fetch(`${API_BASE_URL}/api/accounts/auth/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
        'User-Agent': request.headers.get('User-Agent') || '',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      throw new Error(`Accounts backend responded with status: ${response.status}`)
    }

    const userData = await response.json()
    
    // Transform to frontend format
    const transformedData = {
      user: {
        id: userData.user?.id,
        username: userData.user?.username,
        email: userData.user?.email,
        firstName: userData.user?.first_name,
        lastName: userData.user?.last_name,
        preferredVehicle: userData.user?.preferred_vehicle,
        dateJoined: userData.user?.date_joined,
        lastLogin: userData.user?.last_login
      },
      permissions: userData.permissions || {
        can_access_live_data: true,
        can_modify_strategy: true,
        can_acknowledge_alerts: true
      },
      session: userData.session || {},
      isAuthenticated: true
    }

    return NextResponse.json(transformedData)

  } catch (error) {
    console.error('Accounts API error:', error)
    
    // Only return mock data in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        user: {
          id: 1,
          username: 'demo_engineer',
          email: 'engineer@toyotagr.com',
          firstName: 'Race',
          lastName: 'Engineer',
          preferredVehicle: 42,
          dateJoined: '2024-01-15T00:00:00Z',
          lastLogin: new Date().toISOString()
        },
        permissions: {
          can_access_live_data: true,
          can_modify_strategy: true,
          can_acknowledge_alerts: true
        },
        isAuthenticated: true
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch user data from authentication service' },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...payload } = body

    let backendUrl: string
    let method: string = 'POST'

    switch (action) {
      case 'login':
        backendUrl = '/api/accounts/auth/login/'
        break
      case 'logout':
        backendUrl = '/api/accounts/auth/logout/'
        break
      case 'register':
        backendUrl = '/api/accounts/auth/register/'
        break
      case 'change-password':
        backendUrl = '/api/accounts/auth/change-password/'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid authentication action' },
          { status: 400 }
        )
    }

    const response = await fetch(`${API_BASE_URL}${backendUrl}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      // Forward backend authentication errors
      const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }))
      return NextResponse.json(
        errorData,
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Handle login success - set cookies if needed
    if (action === 'login' && result.user) {
      const response = NextResponse.json(result)
      // You can set additional cookies here if needed
      return response
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Accounts POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process authentication request' },
      { status: 500 }
    )
  }
}

// Handle user profile updates
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Update user preferences or profile
    const response = await fetch(`${API_BASE_URL}/api/accounts/users/me/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Profile update failed with status: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}