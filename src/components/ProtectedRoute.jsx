import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem('qsmart_auth_token')
  const role = localStorage.getItem('qsmart_role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute