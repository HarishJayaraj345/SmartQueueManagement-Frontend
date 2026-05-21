import { NavLink, useNavigate } from 'react-router-dom'
import { isDemoMode } from '../utils/demoAuth.js'

function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('qsmart_auth_token')
  const role = localStorage.getItem('qsmart_role') || 'GUEST'
  const demoMode = isDemoMode()

  if (!token && !demoMode) {
    return null
  }

  function handleLogout() {
    localStorage.removeItem('qsmart_auth_token')
    localStorage.removeItem('qsmart_role')
    localStorage.removeItem('qsmart_user_email')
    localStorage.removeItem('qsmart_user_name')
    navigate('/login')
  }

  return (
    <nav className="app-navbar">
      <div>
        <h1>QSmart</h1>
        <p>{demoMode ? `Live Demo: ${role}` : `Role: ${role}`}</p>
      </div>
      {demoMode ? (
        <div className="app-nav-links" aria-label="Demo pages">
          <NavLink to="/dashboard">User</NavLink>
          <NavLink to="/client">Client</NavLink>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </div>
      ) : null}
      <button type="button" onClick={handleLogout}>Logout</button>
    </nav>
  )
}

export default Navbar
