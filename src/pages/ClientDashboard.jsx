import { useEffect, useMemo, useState } from 'react'
import axiosInstance from '../api/axiosConfig.jsx'
import { isDemoMode } from '../utils/demoAuth.js'
import {
  demoBranches,
  demoClientProfile,
  demoCounters,
  demoQueue
} from '../utils/demoData.js'
import './ClientDashboard.css'

const defaultClientProfile = {
  clientId: null,
  clientName: 'Client',
  clientType: 'Default',
  logoUrl: '',
  logoText: 'CL',
  logoColor: '#3c56cc'
}

const presetServicesByType = {
  Hospital: ['General Consultation', 'Billing Counter', 'Pharmacy Counter', 'Lab Sample Collection', 'Radiology Desk'],
  Clinic: ['Doctor Consultation', 'Billing', 'Vaccination Desk', 'Follow-up Support'],
  Diagnostic: ['Blood Test Collection', 'Scan Booking', 'Report Support Desk'],
  Default: ['General Service Counter', 'Billing Counter', 'Help Desk']
}

function getListPayload(responseData) {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.content)) return responseData.content
  if (Array.isArray(responseData?.items)) return responseData.items
  return []
}

function getId(item) {
  return String(item?.id ?? item?.counterId ?? item?.branchId ?? item?.clientId ?? '')
}

function getClientTypeName(profile) {
  return profile?.clientType || profile?.type || 'Default'
}

function getClientDisplayName(profile) {
  return profile?.clientName || profile?.name || 'Client'
}

function getClientBrandingById() {
  return null
}

function getJwtPayload(token) {
  if (!token) return null
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function resolveClientIdFromSession() {
  const token = localStorage.getItem('qsmart_auth_token')
  const payload = getJwtPayload(token)
  return payload?.clientId || payload?.client_id || null
}

function getLogoText(profile) {
  if (profile?.logoText) return profile.logoText
  const source = getClientDisplayName(profile)
  const parts = source.split(' ').filter(Boolean)
  if (!parts.length) return 'CL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function getBranchDisplayName(branch) {
  return branch?.name || branch?.branchName || `Branch ${branch?.id || branch?.branchId || ''}`
}

function getCounterDisplayName(counter) {
  return counter?.name || counter?.counterName || counter?.serviceName || `Counter ${counter?.id || counter?.counterId || ''}`
}

function getBookedUserDisplayName(token) {
  return token?.userFullName || token?.customerName || (token?.userId ? `User #${token.userId}` : '-')
}

function ClientDashboard() {
  const demoMode = isDemoMode()
  const sessionClientId = resolveClientIdFromSession()
  const sessionBrand = getClientBrandingById(sessionClientId)
  const [activeTab, setActiveTab] = useState('control')
  const [clientProfile, setClientProfile] = useState(() => ({
    ...defaultClientProfile,
    clientId: sessionClientId || defaultClientProfile.clientId,
    clientName: sessionBrand?.name || defaultClientProfile.clientName,
    clientType: sessionBrand?.type || defaultClientProfile.clientType,
    logoText: sessionBrand?.logoText || defaultClientProfile.logoText,
    logoColor: sessionBrand?.logoColor || defaultClientProfile.logoColor
  }))
  const [branches, setBranches] = useState([])
  const [counters, setCounters] = useState([])
  const [selectedCounterId, setSelectedCounterId] = useState('')
  const [queueList, setQueueList] = useState([])
  const [currentToken, setCurrentToken] = useState(null)

  const [branchForm, setBranchForm] = useState({ name: '', city: '', status: 'ACTIVE' })
  const [counterForm, setCounterForm] = useState({ branchId: '', serviceName: '', counterName: '', type: 'Service' })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const clientType = getClientTypeName(clientProfile)
  const clientName = getClientDisplayName(clientProfile)

  const presetServices = useMemo(() => {
    return presetServicesByType[clientType] || presetServicesByType.Default
  }, [clientType])

  async function loadClientProfile() {
    if (demoMode) {
      setClientProfile(demoClientProfile)
      return
    }

    try {
      const response = await axiosInstance.get('/api/client/profile')
      const payload = response.data || {}
      const resolvedClientId = payload.clientId || payload.id || sessionClientId
      const detectedBranding = getClientBrandingById(resolvedClientId)
      setClientProfile({
        clientId: resolvedClientId || defaultClientProfile.clientId,
        clientName: payload.clientName || payload.name || detectedBranding?.name || defaultClientProfile.clientName,
        clientType: payload.clientType || payload.type || detectedBranding?.type || defaultClientProfile.clientType,
        logoUrl: payload.logoUrl || '',
        logoText: payload.logoText || detectedBranding?.logoText || defaultClientProfile.logoText,
        logoColor: payload.logoColor || detectedBranding?.logoColor || defaultClientProfile.logoColor
      })
    } catch (err) {
      if (sessionBrand) {
        setClientProfile((prev) => ({
          ...prev,
          clientId: sessionClientId,
          clientName: sessionBrand.name,
          clientType: sessionBrand.type,
          logoText: sessionBrand.logoText,
          logoColor: sessionBrand.logoColor
        }))
      } else {
        setClientProfile(defaultClientProfile)
        setError(err?.response?.data?.message || 'Unable to load client profile.')
      }
    }
  }

  async function loadBranches() {
    if (demoMode) {
      setBranches(demoBranches.filter((branch) => String(branch.clientId) === String(demoClientProfile.clientId)))
      return
    }

    try {
      const response = await axiosInstance.get('/api/client/branches')
      const payload = getListPayload(response.data)
      setBranches(payload)

      const firstBranchClientId = sessionClientId || payload[0]?.clientId
      if (firstBranchClientId) {
        const detectedBranding = getClientBrandingById(firstBranchClientId)
        if (detectedBranding) {
          setClientProfile((prev) => ({
            ...prev,
            clientId: firstBranchClientId,
            clientName: prev.clientName || detectedBranding.name,
            clientType: prev.clientType || detectedBranding.type,
            logoText: prev.logoText || detectedBranding.logoText,
            logoColor: prev.logoColor || detectedBranding.logoColor
          }))
        }
      }
    } catch (err) {
      setBranches([])
      setError(err?.response?.data?.message || 'Unable to load branches.')
    }
  }

  async function loadCounters() {
    if (demoMode) {
      setCounters(demoCounters)
      setSelectedCounterId(getId(demoCounters[0]))
      return
    }

    try {
      const response = await axiosInstance.get('/api/client/counters')
      const payload = getListPayload(response.data)
      setCounters(payload)
      setSelectedCounterId(payload.length ? getId(payload[0]) : '')
      if (!payload.length) {
        setError('No counters found for this client. Please create counters first.')
      }
    } catch (err) {
      setCounters([])
      setSelectedCounterId('')
      setError(err?.response?.data?.message || 'Unable to load counters for this client.')
    }
  }

  async function loadQueue(counterId) {
    if (!counterId) {
      setQueueList([])
      return
    }

    if (demoMode) {
      setQueueList(demoQueue)
      setCurrentToken(demoQueue.find((item) => item.status === 'SERVING') || null)
      return
    }

    try {
      const response = await axiosInstance.get(`/api/client/counters/${counterId}/queue`)
      const payload = getListPayload(response.data)
      setQueueList(payload)
      const servingToken = payload.find((item) => item?.status === 'SERVING') || null
      setCurrentToken(servingToken)
    } catch (err) {
      setQueueList([])
      setCurrentToken(null)
      setError(err?.response?.data?.message || 'Unable to load queue for selected counter.')
    }
  }

  async function bootstrapDashboard() {
    try {
      setLoading(true)
      setError('')
      setMessage('')
      await Promise.all([loadClientProfile(), loadBranches(), loadCounters()])

      if (demoMode) {
        return
      }

      try {
        const publicClientsResponse = await axiosInstance.get('/api/public/clients')
        const publicClients = getListPayload(publicClientsResponse.data)
        setClientProfile((prev) => {
          const matched = publicClients.find((item) => String(item?.id ?? item?.clientId ?? '') === String(prev.clientId || ''))
          if (!matched) return prev
          return {
            ...prev,
            clientName: matched?.name || matched?.clientName || prev.clientName
          }
        })
      } catch {
        // Optional enrichment only.
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      bootstrapDashboard()
    })
  }, [])

  useEffect(() => {
    if (selectedCounterId) {
      Promise.resolve().then(() => {
        loadQueue(selectedCounterId)
      })
    }
  }, [selectedCounterId])

  async function handleCounterChange(event) {
    setSelectedCounterId(event.target.value)
    setCurrentToken(null)
    setMessage('')
    setError('')
  }

  async function handleNextToken() {
    if (!selectedCounterId) {
      setError('Please select a counter first.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      if (demoMode) {
        const nextToken = queueList.find((item) => item.status === 'WAITING')
        if (!nextToken) {
          setError('No waiting tokens in the demo queue.')
          return
        }

        const updatedQueue = queueList.map((item) => {
          if (item.id === nextToken.id) return { ...item, status: 'SERVING' }
          if (item.status === 'SERVING') return { ...item, status: 'COMPLETED' }
          return item
        })
        setQueueList(updatedQueue)
        setCurrentToken({ ...nextToken, status: 'SERVING' })
        setMessage('Demo: next token called successfully.')
        return
      }

      const response = await axiosInstance.post(`/api/client/counters/${selectedCounterId}/next-token`)
      setCurrentToken(response.data || null)
      setMessage('Next token called successfully.')
      await loadQueue(selectedCounterId)
    } catch (err) {
      const apiMessage = err?.response?.data?.message || 'Unable to call next token right now.'
      setMessage('')
      setError(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteToken() {
    if (!selectedCounterId) {
      setError('Please select a counter first.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      if (demoMode) {
        if (!currentToken) {
          setError('No active token to complete in the demo queue.')
          return
        }

        const updatedQueue = queueList.map((item) => (
          item.id === currentToken.id ? { ...item, status: 'COMPLETED' } : item
        ))
        setQueueList(updatedQueue)
        setCurrentToken(null)
        setMessage('Demo: current token completed successfully.')
        return
      }

      const response = await axiosInstance.post(`/api/client/counters/${selectedCounterId}/complete-token`)
      setCurrentToken(response.data || null)
      setMessage('Current token completed successfully.')
      await loadQueue(selectedCounterId)
    } catch (err) {
      const apiMessage = err?.response?.data?.message || 'Unable to complete token right now.'
      setMessage('')
      setError(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateBranch(event) {
    event.preventDefault()
    if (!branchForm.name.trim()) {
      setError('Branch name is required.')
      return
    }

    const payload = {
      name: branchForm.name.trim(),
      city: branchForm.city.trim(),
      status: branchForm.status
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      if (demoMode) {
        const nextBranch = {
          id: `demo-branch-${Date.now()}`,
          branchId: `demo-branch-${Date.now()}`,
          clientId: demoClientProfile.clientId,
          name: payload.name,
          branchName: payload.name,
          city: payload.city || '-',
          status: payload.status,
          counters: 0
        }
        setBranches((prev) => [nextBranch, ...prev])
        setBranchForm({ name: '', city: '', status: 'ACTIVE' })
        setMessage('Demo: branch added to the front-end view.')
        return
      }

      const response = await axiosInstance.post('/api/client/branches', payload)
      const created = response.data || {}
      const nextBranch = {
        id: created.id || Date.now(),
        name: created.name || payload.name,
        city: created.city || payload.city || '-',
        status: created.status || payload.status,
        counters: created.counters || 0
      }
      setBranches((prev) => [nextBranch, ...prev])
      setBranchForm({ name: '', city: '', status: 'ACTIVE' })
      setMessage('Branch created successfully.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create branch.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCounter(event) {
    event.preventDefault()
    if (!counterForm.branchId) {
      setError('Please choose a branch for the counter.')
      return
    }

    if (!counterForm.serviceName) {
      setError('Please choose a preset service.')
      return
    }

    const selectedBranch = branches.find((branch) => getId(branch) === String(counterForm.branchId))
    const payload = {
      branchId: counterForm.branchId,
      serviceName: counterForm.serviceName,
      counterName: counterForm.counterName.trim() || counterForm.serviceName,
      type: counterForm.type
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      if (demoMode) {
        const nextCounter = {
          id: `demo-counter-${Date.now()}`,
          counterId: `demo-counter-${Date.now()}`,
          name: payload.counterName,
          counterName: payload.counterName,
          serviceName: payload.serviceName,
          type: payload.type,
          branchId: payload.branchId,
          branchName: getBranchDisplayName(selectedBranch),
          status: 'ACTIVE'
        }
        setCounters((prev) => [nextCounter, ...prev])
        setSelectedCounterId(getId(nextCounter))
        setCounterForm({ branchId: '', serviceName: '', counterName: '', type: 'Service' })
        setMessage('Demo: counter added to the front-end view.')
        return
      }

      const response = await axiosInstance.post('/api/client/counters', payload)
      const created = response.data || {}
      const nextCounter = {
        id: created.id || Date.now(),
        name: created.name || payload.counterName,
        serviceName: created.serviceName || payload.serviceName,
        type: created.type || payload.type,
        branchId: created.branchId || payload.branchId,
        branchName: created.branchName || getBranchDisplayName(selectedBranch),
        status: created.status || 'ACTIVE'
      }
      setCounters((prev) => [nextCounter, ...prev])
      setSelectedCounterId(getId(nextCounter))
      setCounterForm({ branchId: '', serviceName: '', counterName: '', type: 'Service' })
      setMessage('Counter created successfully.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create counter.')
    } finally {
      setLoading(false)
    }
  }

  function renderQueueTable() {
    const rows = queueList

    return (
      <table className="common-table">
        <thead><tr><th>Token</th><th>Status</th><th>Booked User</th><th>Phone</th><th>Time</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((item, index) => (
            <tr key={item.id || item.tokenId || index}>
              <td>{item.tokenNumber || item.number || '-'}</td>
              <td><span className="badge">{item.status || 'WAITING'}</span></td>
              <td>{getBookedUserDisplayName(item)}</td>
              <td>{item.userPhoneNumber || '-'}</td>
              <td>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : (item.time || '-')}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5}>No queue data available for this counter.</td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  function renderControl() {
    return (
      <>
        <section className="client-hero">
          <div className="client-brand">
            {clientProfile.logoUrl ? (
              <img src={clientProfile.logoUrl} alt={`${clientName} logo`} className="client-logo" />
            ) : (
              <div className="client-logo client-logo-fallback" style={{ background: clientProfile.logoColor || '#3c56cc' }}>
                {getLogoText(clientProfile)}
              </div>
            )}
            <div>
              <p className="client-type">{clientType} Dashboard</p>
              <h2>{clientName}</h2>
              <p className="page-subtitle">Personalized queue control for your branches and counters.</p>
            </div>
          </div>
        </section>

        <div className="control-grid">
          <div className="token-card">
            <div className="field-group">
              <label>Select Counter</label>
              <select value={selectedCounterId} onChange={handleCounterChange}>
                <option value="">Choose counter</option>
                {counters.map((counter) => (
                  <option key={getId(counter)} value={getId(counter)}>
                    {getCounterDisplayName(counter)} ({counter.branchName || 'No branch'})
                  </option>
                ))}
              </select>
            </div>

            <h3>Current Token</h3>
            <div className="current-token">{currentToken?.tokenNumber || '-'}</div>
            <p>{getBookedUserDisplayName(currentToken) !== '-' ? getBookedUserDisplayName(currentToken) : 'No active customer'}</p>
            <button type="button" className="success-button" onClick={handleNextToken} disabled={loading}>Call Next</button>
            <button type="button" onClick={handleCompleteToken} disabled={loading}>Complete Token</button>
          </div>

          <div className="table-card">
            <h3>Recent Tokens</h3>
            {renderQueueTable()}
          </div>
        </div>
      </>
    )
  }

  function renderSetup() {
    return (
      <>
        <h2>Branch and Counter Setup</h2>
        <p className="page-subtitle">Create branches and counters with preset services for {clientType}.</p>

        <div className="setup-grid">
          <form className="token-card" onSubmit={handleCreateBranch}>
            <h3>Create Branch</h3>
            <div className="field-group">
              <label>Branch Name</label>
              <input
                type="text"
                value={branchForm.name}
                onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Eg: North Branch"
              />
            </div>
            <div className="field-group">
              <label>City</label>
              <input
                type="text"
                value={branchForm.city}
                onChange={(event) => setBranchForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="Eg: Chennai"
              />
            </div>
            <div className="field-group">
              <label>Status</label>
              <select
                value={branchForm.status}
                onChange={(event) => setBranchForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <button type="submit" disabled={loading}>Create Branch</button>
          </form>

          <form className="token-card" onSubmit={handleCreateCounter}>
            <h3>Create Counter</h3>
            <div className="field-group">
              <label>Branch</label>
              <select
                value={counterForm.branchId}
                onChange={(event) => setCounterForm((prev) => ({ ...prev, branchId: event.target.value }))}
              >
                <option value="">Choose branch</option>
                {branches.map((branch) => (
                  <option key={getId(branch)} value={getId(branch)}>{getBranchDisplayName(branch)}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label>Preset Service ({clientType})</label>
              <select
                value={counterForm.serviceName}
                onChange={(event) => setCounterForm((prev) => ({ ...prev, serviceName: event.target.value }))}
              >
                <option value="">Choose service</option>
                {presetServices.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label>Counter Name (Optional)</label>
              <input
                type="text"
                value={counterForm.counterName}
                onChange={(event) => setCounterForm((prev) => ({ ...prev, counterName: event.target.value }))}
                placeholder="Default: selected service"
              />
            </div>
            <div className="field-group">
              <label>Counter Type</label>
              <select
                value={counterForm.type}
                onChange={(event) => setCounterForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="Service">Service</option>
                <option value="Billing">Billing</option>
                <option value="Support">Support</option>
              </select>
            </div>
            <button type="submit" disabled={loading}>Create Counter</button>
          </form>
        </div>
      </>
    )
  }

  function renderBranchOverview() {
    return (
      <>
        <h2>All Branch Overview</h2>
        <p className="page-subtitle">View status and counter coverage across all branches.</p>

        <div className="table-card">
          <table className="common-table">
            <thead><tr><th>Branch</th><th>City</th><th>Status</th><th>Counters</th></tr></thead>
            <tbody>
              {branches.map((branch, index) => {
                const branchId = getId(branch)
                const mappedCounters = counters.filter((counter) => String(counter.branchId || '') === branchId)
                return (
                  <tr key={`${branchId}-${index}`}>
                    <td>{getBranchDisplayName(branch)}</td>
                    <td>{branch.city || '-'}</td>
                    <td><span className="badge">{branch.status || 'ACTIVE'}</span></td>
                    <td>{branch.counters ?? mappedCounters.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  function renderReports() {
    const waiting = queueList.filter((item) => item.status === 'WAITING').length
    const serving = queueList.filter((item) => item.status === 'SERVING').length
    const completed = queueList.filter((item) => item.status === 'COMPLETED').length

    return (
      <>
        <h2>Reports</h2>
        <div className="stats-grid">
          <div className="stat-card"><p>Total Branches</p><h3>{branches.length}</h3></div>
          <div className="stat-card"><p>Total Counters</p><h3>{counters.length}</h3></div>
          <div className="stat-card"><p>Waiting</p><h3>{waiting}</h3></div>
          <div className="stat-card"><p>Serving / Completed</p><h3>{serving} / {completed}</h3></div>
        </div>
        <div className="table-card">
          <h3>Queue Report</h3>
          {renderQueueTable()}
        </div>
      </>
    )
  }

  return (
    <section className="dashboard-page">
      <aside className="dash-sidebar">
        <h3>Client Panel</h3>
        <ul>
          <li><button className={activeTab === 'control' ? 'active' : ''} onClick={() => setActiveTab('control')}>Counter Control</button></li>
          <li><button className={activeTab === 'setup' ? 'active' : ''} onClick={() => setActiveTab('setup')}>Branch Setup</button></li>
          <li><button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Branch Overview</button></li>
          <li><button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>Reports</button></li>
        </ul>
      </aside>

      <div className="dash-main">
        {activeTab === 'control' ? renderControl() : null}
        {activeTab === 'setup' ? renderSetup() : null}
        {activeTab === 'overview' ? renderBranchOverview() : null}
        {activeTab === 'reports' ? renderReports() : null}

        {loading ? <p className="status-message">Loading data, please wait...</p> : null}
        {error ? <p className="status-message error-text">{error}</p> : null}
        {message ? <p className="status-message success-text">{message}</p> : null}
      </div>
    </section>
  )
}

export default ClientDashboard
