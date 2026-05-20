/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const AUTH_TOKEN_KEY = 'qsmart_auth_token'

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '')

  const setToken = useCallback((value) => {
    const next = value || ''
    setTokenState(next)
    if (next) {
      localStorage.setItem(AUTH_TOKEN_KEY, next)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }, [])

  const clearToken = useCallback(() => setToken(''), [setToken])

  const value = useMemo(() => ({ token, setToken, clearToken }), [token, setToken, clearToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
