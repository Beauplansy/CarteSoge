import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProtectedRoute from '../../components/common/ProtectedRoute'
import { AuthProvider } from '../../contexts/AuthContext'
import { InactivityProvider } from '../../contexts/InactivityContext'

// Mock useAuth hook
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn()
  }
})

// Mock useInactivity hook
vi.mock('../../contexts/InactivityContext', async () => {
  const actual = await vi.importActual('../../contexts/InactivityContext')
  return {
    ...actual,
    useInactivity: vi.fn()
  }
})

// Mock LoadingSpinner
vi.mock('../../components/common/LoadingSpinner', () => ({
  default: () => <div data-testid="loading">Loading...</div>
}))

import { useAuth } from '../../contexts/AuthContext'
import { useInactivity } from '../../contexts/InactivityContext'

const MockComponent = () => <div data-testid="protected-content">Protected Content</div>

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading spinner while loading', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: true,
      user: null,
      hasPermission: vi.fn(),
      can: vi.fn(),
      checkTokenValidity: vi.fn(() => true)
    })

    useInactivity.mockReturnValue({
      isInactive: false
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should redirect to login when not authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      hasPermission: vi.fn(),
      can: vi.fn(),
      checkTokenValidity: vi.fn(() => false)
    })

    useInactivity.mockReturnValue({
      isInactive: false
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is inactive', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, username: 'testuser', role: 'officer' },
      hasPermission: vi.fn(() => true),
      can: vi.fn(() => true),
      checkTokenValidity: vi.fn(() => true)
    })

    useInactivity.mockReturnValue({
      isInactive: true
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should redirect to login when token is invalid', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, username: 'testuser', role: 'officer' },
      hasPermission: vi.fn(() => true),
      can: vi.fn(() => true),
      checkTokenValidity: vi.fn(() => false)
    })

    useInactivity.mockReturnValue({
      isInactive: false
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should render children when authenticated and active', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, username: 'testuser', role: 'officer' },
      hasPermission: vi.fn(() => true),
      can: vi.fn(() => true),
      checkTokenValidity: vi.fn(() => true)
    })

    useInactivity.mockReturnValue({
      isInactive: false
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should check role permission when requiredRole is provided', () => {
    const hasPermissionMock = vi.fn(() => false)

    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, username: 'testuser', role: 'officer' },
      hasPermission: hasPermissionMock,
      can: vi.fn(() => true),
      checkTokenValidity: vi.fn(() => true)
    })

    useInactivity.mockReturnValue({
      isInactive: false
    })

    render(
      <BrowserRouter>
        <ProtectedRoute requiredRole="manager">
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(hasPermissionMock).toHaveBeenCalledWith('manager')
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should check permission when requiredPermission is provided', () => {
    const canMock = vi.fn(() => false)

    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, username: 'testuser', role: 'officer' },
      hasPermission: vi.fn(() => true),
      can: canMock,
      checkTokenValidity: vi.fn(() => true)
    })

    useInactivity.mockReturnValue({
      isInactive: false
    })

    render(
      <BrowserRouter>
        <ProtectedRoute requiredPermission="delete_application">
          <MockComponent />
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(canMock).toHaveBeenCalledWith('delete_application')
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })
})
