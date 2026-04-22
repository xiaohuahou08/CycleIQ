import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import axios from 'axios'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

type User = {
  email: string
}

type LoginResponse = {
  access_token?: string
  token?: string
  jwt?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
const TOKEN_KEY = 'cycleiq_token'

const api = axios.create({
  baseURL: API_BASE_URL,
})

const getStoredToken = () =>
  localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

function extractToken(data: LoginResponse): string | null {
  return data.access_token ?? data.token ?? data.jwt ?? null
}

function persistToken(token: string, rememberMe: boolean) {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)

  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token)
    return
  }

  sessionStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function ProtectedRoute({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean
  children: ReactNode
}) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean
  children: ReactNode
}) {
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/api/auth/register', { email, password })
      navigate('/login', { replace: true })
    } catch (submissionError) {
      if (axios.isAxiosError(submissionError)) {
        setError(submissionError.response?.data?.message ?? 'Registration failed.')
      } else {
        setError('Registration failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Register</h1>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
        <p className="switch-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  )
}

function LoginPage({ onLogin }: { onLogin: (token: string, rememberMe: boolean) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      })
      const token = extractToken(response.data)
      if (!token) {
        setError(
          'Authentication failed: No token received from server. Please contact support if this persists.',
        )
        return
      }

      await onLogin(token, rememberMe)
    } catch (submissionError) {
      if (axios.isAxiosError(submissionError)) {
        setError(submissionError.response?.data?.message ?? 'Invalid email or password.')
      } else {
        setError('Login failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Login</h1>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Remember me
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
        <p className="switch-link">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </main>
  )
}

function HomePage({ email, onLogout }: { email: string; onLogout: () => Promise<void> }) {
  return (
    <main className="home-page">
      <header className="top-bar">
        <div className="user-info">{email}</div>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </header>
      <section className="home-content">
        <h1>Welcome to CycleIQ</h1>
      </section>
    </main>
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const loadCurrentUser = useCallback(async () => {
    const response = await api.get<User>('/api/auth/me')
    setUser(response.data)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // ignore logout API errors and clear local auth anyway
    }

    clearToken()
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    const bootstrapAuth = async () => {
      const currentToken = getStoredToken()
      if (!currentToken) {
        setIsBootstrapping(false)
        return
      }

      try {
        await loadCurrentUser()
      } catch {
        clearToken()
        setToken(null)
      } finally {
        setIsBootstrapping(false)
      }
    }

    void bootstrapAuth()
  }, [loadCurrentUser])

  const handleLogin = useCallback(
    async (nextToken: string, rememberMe: boolean) => {
      persistToken(nextToken, rememberMe)
      setToken(nextToken)
      try {
        await loadCurrentUser()
      } catch {
        clearToken()
        setToken(null)
        throw new Error('Unable to fetch current user')
      }
      navigate('/', { replace: true })
    },
    [loadCurrentUser, navigate],
  )

  if (isBootstrapping) {
    return <main className="page">Loading...</main>
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={Boolean(token)}>
            <HomePage email={user?.email ?? ''} onLogout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute isAuthenticated={Boolean(token)}>
            <LoginPage onLogin={handleLogin} />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute isAuthenticated={Boolean(token)}>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
