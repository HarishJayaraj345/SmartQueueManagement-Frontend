const DEMO_EMAIL = 'demo@qsmart.app'
const DEMO_NAME = 'Demo User'
const DEMO_TOKEN = 'qsmart-demo-token'
const DEMO_ROLE = 'USER'

export function isDemoMode() {
  return true
}

export function createDemoSession({
  email = DEMO_EMAIL,
  name = DEMO_NAME,
  role = DEMO_ROLE
} = {}) {
  localStorage.setItem('qsmart_auth_token', DEMO_TOKEN)
  localStorage.setItem('qsmart_role', role)
  localStorage.setItem('qsmart_user_email', email)
  localStorage.setItem('qsmart_user_name', name)
}
