import { useNavigate } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('qsmart_auth_token')
  const role = localStorage.getItem('qsmart_role') || 'GUEST'

  if (!token) {
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
        <p>Role: {role}</p>
      </div>
      <button type="button" onClick={handleLogout}>Logout</button>
    </nav>
  )
}

export default Navbar
