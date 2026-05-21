import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosConfig.jsx'
import { createDemoSession, isDemoMode } from '../utils/demoAuth.js'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const demoMode = isDemoMode()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function getRoleRoute(selectedRole) {
    if (selectedRole === 'ADMIN') return '/admin'
    if (selectedRole === 'CLIENT') return '/client'
    return '/user'
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (demoMode) {
        createDemoSession({
          email: email || 'demo@qsmart.app',
          name: (email || 'demo').split('@')[0] || 'Demo User',
          role: 'USER'
        })
        navigate('/dashboard')
        return
      }

      const response = await axiosInstance.post('/api/auth/login', { email, password })
      const { token, role } = response.data || {}

      if (!token) {
        throw new Error('Login response did not include token')
      }

      const effectiveRole = role || 'USER'

      localStorage.setItem('qsmart_auth_token', token)
      localStorage.setItem('qsmart_role', effectiveRole)
      localStorage.setItem('qsmart_user_email', email)

      navigate(getRoleRoute(effectiveRole))
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-stage">
      <div className="login-frame">
        <div className="auth-visual login-visual-panel">
          <div className="login-brand-block">
            <h2>QSmart</h2>
            <p className="login-visual-tagline">Smart Queue Management System</p>
          </div>
          <img className="auth-image login-preview-image" src="/queue-preview.svg" alt="Queue dashboard preview" />
          <p className="login-visual-copy">Stay organized, reduce waiting time and provide better service experience.</p>
        </div>

          <div className="auth-card login-auth-card">
          <h2>Welcome Back!</h2>
          <p className="page-subtitle login-subtitle">
            {demoMode ? 'Live demo mode - no username or password required' : 'Login to your account'}
          </p>

          <form className="auth-form login-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required={!demoMode}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required={!demoMode}
              />
            </label>

            {error ? <p className="login-error-text">{error}</p> : null}

            <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          </form>

          <p className="auth-switch login-switch">
            Do not have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default Login
