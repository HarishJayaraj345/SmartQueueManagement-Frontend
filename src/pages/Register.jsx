import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosConfig.jsx'
import { createDemoSession, isDemoMode } from '../utils/demoAuth.js'

function Register() {
  const navigate = useNavigate()
  const demoMode = isDemoMode()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
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
          name: name || 'Demo User',
          role: 'USER'
        })
        navigate('/dashboard')
        return
      }

      const response = await axiosInstance.post('/api/auth/register', {
        fullName: name,
        email,
        phoneNumber,
        password
      })

      const { token, role } = response.data || {}

      if (!token) {
        throw new Error('Register response did not include token')
      }

      const effectiveRole = role || 'USER'

      localStorage.setItem('qsmart_auth_token', token)
      localStorage.setItem('qsmart_role', effectiveRole)
      localStorage.setItem('qsmart_user_email', email)
      localStorage.setItem('qsmart_user_name', name)

      navigate(getRoleRoute(effectiveRole))
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Registration failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-visual">
        <h2>QSmart</h2>
        <p>Smart Queue Management System</p>
        <img className="auth-image" src="/queue-preview.svg" alt="" />
        <p>Create your account and manage tokens from one clean dashboard.</p>
      </div>

      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="page-subtitle">
          {demoMode ? 'Live demo mode - click Create Account to enter' : 'Register to continue'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              required={!demoMode}
            />
          </label>

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
            Phone Number
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="Enter 10-digit phone number"
              pattern="[0-9]{10}"
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

          {error && <p style={{ color: '#b00020', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Back to login</Link>
        </p>
      </div>
    </section>
  )
}

export default Register
