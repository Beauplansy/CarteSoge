import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import * as authAPI from '../services/api'

// Mock authAPI
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn()
  },
  configureApiErrorHandler: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Test component
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, hasPermission, can } = useAuth()
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
      <div data-testid="username">{user?.username || 'No user'}</div>
      <button onClick={() => login('testuser', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
      <div data-testid="has-manager">{hasPermission('manager') ? 'Manager' : 'Not manager'}</div>
      <div data-testid="can-create">{can('create_application') ? 'Can create' : 'Cannot create'}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('should initialize with no user authenticated', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated')
    expect(screen.getByTestId('username')).toHaveTextContent('No user')
  })

  it('should restore user from localStorage on mount', () => {
    const mockUser = { id: 1, username: 'testuser', role: 'officer' }
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test'
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'userData') return JSON.stringify(mockUser)
      if (key === 'accessToken') return mockToken
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('username')).toHaveTextContent('testuser')
  })

  it('should check token validity using JWT exp claim', () => {
    // Token with exp in the future (2099)
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQwNzA5MDgwMDB9.test'
    const mockUser = { id: 1, username: 'testuser', role: 'officer' }

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'userData') return JSON.stringify(mockUser)
      if (key === 'accessToken') return validToken
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
  })

  it('should handle hasPermission with role hierarchy', () => {
    const managerUser = { id: 1, username: 'manager', role: 'manager' }
    const officerUser = { id: 2, username: 'officer', role: 'officer' }
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test'

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'userData') return JSON.stringify(managerUser)
      if (key === 'accessToken') return mockToken
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Manager should have manager permission
    expect(screen.getByTestId('has-manager')).toHaveTextContent('Manager')
  })

  it('should handle can() method for permissions', () => {
    const secretaryUser = { id: 1, username: 'secretary', role: 'secretary' }
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test'

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'userData') return JSON.stringify(secretaryUser)
      if (key === 'accessToken') return mockToken
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Secretary can create applications
    expect(screen.getByTestId('can-create')).toHaveTextContent('Can create')
  })

  it('should handle login error', async () => {
    authAPI.login.mockRejectedValueOnce({
      response: {
        data: { detail: 'Invalid credentials' }
      }
    })

    const TestLoginComponent = () => {
      const { login } = useAuth()
      const [error, setError] = React.useState('')

      const handleLogin = async () => {
        const result = await login('wrong', 'credentials')
        if (!result.success) {
          setError(result.error)
        }
      }

      return (
        <div>
          <button onClick={handleLogin}>Login</button>
          <div data-testid="error">{error}</div>
        </div>
      )
    }

    const { rerender } = render(
      <AuthProvider>
        <TestLoginComponent />
      </AuthProvider>
    )

    const loginBtn = screen.getByText('Login')
    await userEvent.click(loginBtn)

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials')
    })
  })

  it('should clear localStorage on logout', async () => {
    const mockUser = { id: 1, username: 'testuser', role: 'officer' }
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test'

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'userData') return JSON.stringify(mockUser)
      if (key === 'accessToken') return mockToken
      return null
    })

    authAPI.logout.mockResolvedValueOnce({})

    const TestLogoutComponent = () => {
      const { logout, isAuthenticated } = useAuth()

      return (
        <div>
          <button onClick={logout}>Logout</button>
          <div data-testid="status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestLogoutComponent />
      </AuthProvider>
    )

    const logoutBtn = screen.getByText('Logout')
    await userEvent.click(logoutBtn)

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userData')
    })
  })
})
