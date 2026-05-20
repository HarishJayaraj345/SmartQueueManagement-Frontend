import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '../api/axiosConfig.jsx'
import {
  connectQueueSocket,
  disconnectQueueSocket,
  subscribeQueue,
  unsubscribeQueue
} from '../websocket/queueSocket'
import './UserDashboard.css'

function getEntityId(entity) {
  return String(entity?.id ?? entity?.clientId ?? entity?.branchId ?? entity?.serviceId ?? '')
}

function getEntityName(entity) {
  return entity?.name ?? entity?.branchName ?? entity?.serviceName ?? entity?.clientName ?? ''
}

function getListPayload(responseData) {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.content)) return responseData.content
  if (Array.isArray(responseData?.items)) return responseData.items
  return []
}

function createProofCode(token) {
  const base = `${token?.tokenNumber || 'NA'}-${token?.branchName || 'BRANCH'}-${token?.serviceName || 'SERVICE'}`
  const compact = base.replace(/\s+/g, '').toUpperCase()
  return `QSM-${compact.slice(0, 16)}`
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleString()
}

function formatClockTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatWaitTime(waitData) {
  if (!waitData) return '-'

  if (typeof waitData.estimatedWaitTime === 'string') return waitData.estimatedWaitTime
  if (typeof waitData.waitTime === 'string') return waitData.waitTime

  const minutes = waitData.estimatedWaitMinutes ?? waitData.estimatedWait
  if (typeof minutes === 'number') return `${minutes} mins`

  return '-'
}

function normalizeStatus(status) {
  if (status === 'COMPLETED') return 'EXPIRED'
  return status || '-'
}

function normalizeTokenForUserView(token) {
  const normalized = {
    ...token,
    status: normalizeStatus(token?.status),
    bookedAt: token?.bookedAt || token?.createdAt || new Date().toISOString()
  }
  return {
    ...normalized,
    proofCode: normalized?.proofCode || createProofCode(normalized)
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'WAITING':
      return 'status-waiting'
    case 'SERVING':
      return 'status-serving'
    case 'EXPIRED':
      return 'status-expired'
    default:
      return 'status-default'
  }
}

function UserDashboard() {
  const userEmail = localStorage.getItem('qsmart_user_email') || 'john@example.com'
  const userName = localStorage.getItem('qsmart_user_name') || userEmail.split('@')[0] || 'User'
  const [activeTab, setActiveTab] = useState('dashboard')
  const [clients, setClients] = useState([])
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')

  const [estimatedWait, setEstimatedWait] = useState({ estimatedWaitTime: '15-20 mins' })
  const [bookedTokens, setBookedTokens] = useState([])
  const [liveQueueEvent, setLiveQueueEvent] = useState(null)
  const [liveQueueRows, setLiveQueueRows] = useState([])
  const [liveLastUpdated, setLiveLastUpdated] = useState(null)
  const [liveLoading, setLiveLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [proofToken, setProofToken] = useState(null)
  const [proofMessage, setProofMessage] = useState('')

  async function loadMyTokens(showErrorOnFailure = true) {
    try {
      const response = await axiosInstance.get('/api/user/tokens')
      const payload = getListPayload(response.data)
      const normalizedTokens = payload
        .map(normalizeTokenForUserView)
        .sort((a, b) => {
          const aTime = new Date(a?.bookedAt || a?.createdAt || 0).getTime()
          const bTime = new Date(b?.bookedAt || b?.createdAt || 0).getTime()
          return bTime - aTime
        })
      setBookedTokens(normalizedTokens)
    } catch (err) {
      if (showErrorOnFailure) {
        setError(err?.response?.data?.message || 'Unable to load your booked tokens.')
      }
    }
  }

  async function fetchBranchesByClient(clientId) {
    try {
      const response = await axiosInstance.get(`/api/public/clients/${clientId}/branches`)
      const payload = getListPayload(response.data)
      return payload
    } catch {
      return []
    }
  }

  async function fetchServicesByBranch(branchId) {
    try {
      const response = await axiosInstance.get(`/api/public/branches/${branchId}/services`)
      const payload = getListPayload(response.data)
      return payload
    } catch {
      return []
    }
  }

  async function loadEstimatedWait(branchId, serviceId) {
    if (!branchId || !serviceId) {
      setEstimatedWait(null)
      return
    }

    try {
      const response = await axiosInstance.get(`/api/public/branches/${branchId}/services/${serviceId}/estimated-wait`)
      setEstimatedWait(response.data || { estimatedWaitTime: '15-20 mins' })
    } catch {
      setEstimatedWait(null)
    }
  }

  const loadLiveQueueSnapshot = useCallback(async (
    branchId = selectedBranchId,
    serviceList = services
  ) => {
    if (!branchId || !serviceList.length) {
      setLiveQueueRows([])
      setLiveLastUpdated(null)
      return
    }

    try {
      setLiveLoading(true)
      const rows = await Promise.all(serviceList.map(async (service) => {
        const serviceId = getEntityId(service)
        try {
          const [statusResponse, waitResponse] = await Promise.all([
            axiosInstance.get(`/api/public/branches/${branchId}/services/${serviceId}/live-status`),
            axiosInstance.get(`/api/public/branches/${branchId}/services/${serviceId}/estimated-wait`)
          ])

          return {
            service,
            liveStatus: statusResponse.data || {},
            estimatedWait: waitResponse.data || {}
          }
        } catch {
          return {
            service,
            liveStatus: { statusMessage: 'Unavailable', waitingCount: 0 },
            estimatedWait: null
          }
        }
      }))

      setLiveQueueRows(rows)
      setLiveLastUpdated(new Date().toISOString())
    } finally {
      setLiveLoading(false)
    }
  }, [selectedBranchId, services])

  async function initializeBookingOptions() {
    try {
      setLoading(true)
      setError('')

      const clientResponse = await axiosInstance.get('/api/public/clients')
      const clientPayload = getListPayload(clientResponse.data)
      const availableClients = clientPayload
      setClients(availableClients)

      const firstClientId = getEntityId(availableClients[0])
      setSelectedClientId(firstClientId)

      if (!firstClientId) {
        setBranches([])
        setServices([])
        setSelectedBranchId('')
        setSelectedServiceId('')
        return
      }

      const availableBranches = await fetchBranchesByClient(firstClientId)
      setBranches(availableBranches)

      const firstBranchId = getEntityId(availableBranches[0])
      setSelectedBranchId(firstBranchId)

      if (!firstBranchId) {
        setServices([])
        setSelectedServiceId('')
        return
      }

      const availableServices = await fetchServicesByBranch(firstBranchId)
      setServices(availableServices)

      const firstServiceId = getEntityId(availableServices[0])
      setSelectedServiceId(firstServiceId)

      await loadEstimatedWait(firstBranchId, firstServiceId)
    } catch (err) {
      setClients([])
      setBranches([])
      setServices([])
      setSelectedClientId('')
      setSelectedBranchId('')
      setSelectedServiceId('')
      setEstimatedWait(null)
      setError(err?.response?.data?.message || 'Unable to load clients/branches/services.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      initializeBookingOptions()
      loadMyTokens(false)
    })

    connectQueueSocket(
      () => {},
      () => {}
    )

    return () => {
      disconnectQueueSocket()
    }
  }, [])

  useEffect(() => {
    if (!selectedBranchId || !selectedServiceId) {
      unsubscribeQueue()
      return
    }

    subscribeQueue(selectedBranchId, selectedServiceId, (eventData) => {
      setLiveQueueEvent(eventData)
      setLiveQueueRows((currentRows) => currentRows.map((row) => {
        if (getEntityId(row.service) !== String(selectedServiceId)) return row

        return {
          ...row,
          liveStatus: {
            ...row.liveStatus,
            currentServingToken: eventData.currentServingToken ?? row.liveStatus?.currentServingToken,
            waitingCount: eventData.waitingCount ?? row.liveStatus?.waitingCount,
            statusMessage: eventData.status || eventData.message || row.liveStatus?.statusMessage
          }
        }
      }))
      setLiveLastUpdated(new Date().toISOString())
    })

    return () => {
      unsubscribeQueue()
    }
  }, [selectedBranchId, selectedServiceId])

  useEffect(() => {
    if (activeTab !== 'live') return

    let cancelled = false
    const refreshSnapshot = () => {
      Promise.resolve().then(() => {
        if (!cancelled) {
          loadLiveQueueSnapshot()
        }
      })
    }

    refreshSnapshot()
    const refreshTimer = window.setInterval(() => {
      refreshSnapshot()
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
    }
  }, [activeTab, loadLiveQueueSnapshot])

  async function handleClientChange(event) {
    const clientId = event.target.value
    setSelectedClientId(clientId)
    setSelectedBranchId('')
    setSelectedServiceId('')
    setServices([])
    setEstimatedWait(null)
    setLiveQueueEvent(null)

    if (!clientId) {
      setBranches([])
      return
    }

    try {
      setLoading(true)
      setError('')
      const availableBranches = await fetchBranchesByClient(clientId)
      setBranches(availableBranches)

      const firstBranchId = getEntityId(availableBranches[0])
      setSelectedBranchId(firstBranchId)

      if (!firstBranchId) {
        setServices([])
        return
      }

      const availableServices = await fetchServicesByBranch(firstBranchId)
      setServices(availableServices)

      const firstServiceId = getEntityId(availableServices[0])
      setSelectedServiceId(firstServiceId)
      await loadEstimatedWait(firstBranchId, firstServiceId)
    } catch (err) {
      setBranches([])
      setServices([])
      setSelectedBranchId('')
      setSelectedServiceId('')
      setError(err?.response?.data?.message || 'Unable to load branches for selected client.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBranchChange(event) {
    const branchId = event.target.value
    setSelectedBranchId(branchId)
    setSelectedServiceId('')
    setEstimatedWait(null)
    setLiveQueueEvent(null)

    if (!branchId) {
      setServices([])
      return
    }

    try {
      setLoading(true)
      setError('')
      const availableServices = await fetchServicesByBranch(branchId)
      setServices(availableServices)
      const firstServiceId = getEntityId(availableServices[0])
      setSelectedServiceId(firstServiceId)
      await loadEstimatedWait(branchId, firstServiceId)
    } catch (err) {
      setServices([])
      setSelectedServiceId('')
      setError(err?.response?.data?.message || 'Unable to load services for selected branch.')
    } finally {
      setLoading(false)
    }
  }

  async function handleServiceChange(event) {
    const serviceId = event.target.value
    setSelectedServiceId(serviceId)
    setEstimatedWait(null)
    setLiveQueueEvent(null)

    if (!serviceId || !selectedBranchId) return

    try {
      setLoading(true)
      setError('')
      await loadEstimatedWait(selectedBranchId, serviceId)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load estimated wait time.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBookToken() {
    if (!selectedBranchId || !selectedServiceId) {
      setError('Please select branch and service before booking.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const response = await axiosInstance.post('/api/user/tokens', {
        branchId: selectedBranchId,
        serviceId: selectedServiceId
      })
      const selectedClient = clients.find((client) => getEntityId(client) === String(selectedClientId))
      const selectedBranch = branches.find((branch) => getEntityId(branch) === String(selectedBranchId))
      const selectedService = services.find((service) => getEntityId(service) === String(selectedServiceId))
      const nextToken = normalizeTokenForUserView({
        ...response.data,
        clientName: response.data?.clientName || getEntityName(selectedClient) || '-',
        branchName: response.data?.branchName || getEntityName(selectedBranch) || '-',
        serviceName: response.data?.serviceName || getEntityName(selectedService) || '-',
        bookedAt: response.data?.bookedAt || new Date().toISOString()
      })
      setBookedTokens((prev) => [nextToken, ...prev])
      setProofToken(nextToken)
      setProofMessage('Ticket proof is ready. Show this at the branch counter.')
      await loadMyTokens(false)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to book token right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function openProof(token) {
    const normalizedToken = normalizeTokenForUserView(token)
    setProofToken(normalizedToken)
    setProofMessage('')
  }

  function downloadProof(token) {
    if (!token) return
    const lines = [
      'QSmart Ticket Proof',
      `Token Number: ${token.tokenNumber || '-'}`,
      `Client: ${token.clientName || '-'}`,
      `Branch: ${token.branchName || '-'}`,
      `Service: ${token.serviceName || '-'}`,
      `Status: ${token.status || '-'}`,
      `Booked At: ${formatDateTime(token.bookedAt)}`,
      `Proof Code: ${token.proofCode || '-'}`,
      '',
      'Present this proof at your selected branch counter.'
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qsmart-ticket-${token.tokenNumber || 'proof'}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  function renderTicketProofCard(token) {
    if (!token) return null

    return (
      <div className="token-card proof-card">
        <h3>Ticket Proof</h3>
        <p className="page-subtitle">Show this proof at the branch when your turn arrives.</p>
        <p><strong>Token Number:</strong> {token.tokenNumber || '-'}</p>
        <p><strong>Client:</strong> {token.clientName || '-'}</p>
        <p><strong>Branch:</strong> {token.branchName || '-'}</p>
        <p><strong>Service:</strong> {token.serviceName || '-'}</p>
        <p><strong>Status:</strong> {token.status || '-'}</p>
        <p><strong>Booked At:</strong> {formatDateTime(token.bookedAt)}</p>
        <div className="proof-code">{token.proofCode || '-'}</div>
        <div className="proof-actions">
          <button type="button" onClick={() => downloadProof(token)}>Download Proof</button>
          <button type="button" className="alt-btn" onClick={() => window.print()}>Print</button>
        </div>
        <div className="proof-steps">
          <p><strong>How to use:</strong></p>
          <p>1. Open this ticket proof from Book Token or My Tokens.</p>
          <p>2. Show token number and proof code at the selected branch.</p>
          <p>3. Keep this screen open until your status becomes expired.</p>
        </div>
      </div>
    )
  }

  const latestBookedToken = bookedTokens[0] || null
  const selectedClient = clients.find((client) => getEntityId(client) === String(selectedClientId))
  const selectedBranch = branches.find((branch) => getEntityId(branch) === String(selectedBranchId))
  const selectedService = services.find((service) => getEntityId(service) === String(selectedServiceId))
  const canReviewAvailability = Boolean(selectedClientId && selectedBranchId)
  const canBookNow = Boolean(selectedClientId && selectedBranchId && selectedServiceId)
  const nextStepMessage = !selectedClientId
    ? 'Start by selecting a client.'
    : !selectedBranchId
      ? 'Great, now choose the branch you want to visit.'
      : !selectedServiceId
        ? 'Check available services and select one to continue.'
        : 'Everything is ready. You can book your token now.'

  function getBookingSteps() {
    return [
      {
        id: 'select-client',
        label: 'Select Client',
        description: selectedClient ? getEntityName(selectedClient) : 'Choose where you want service.',
        done: Boolean(selectedClientId),
        active: !selectedClientId
      },
      {
        id: 'select-branch',
        label: 'Choose Branch',
        description: selectedBranch ? getEntityName(selectedBranch) : 'Pick a branch near you.',
        done: Boolean(selectedBranchId),
        active: Boolean(selectedClientId && !selectedBranchId)
      },
      {
        id: 'view-services',
        label: 'View Availability',
        description: selectedService ? getEntityName(selectedService) : 'See services and current wait time.',
        done: Boolean(selectedServiceId),
        active: Boolean(selectedBranchId && !selectedServiceId)
      },
      {
        id: 'book-or-skip',
        label: 'Book or Skip',
        description: canBookNow ? 'Ready to book your token now.' : 'Decide after checking availability.',
        done: Boolean(latestBookedToken && canBookNow),
        active: Boolean(canBookNow)
      }
    ]
  }

  function renderDashboard() {
    const bookingSteps = getBookingSteps()

    return (
      <>
        <section className="welcome-panel">
          <div>
            <p className="welcome-tag">User Dashboard</p>
            <h2>Welcome back, {userName}!</h2>
            <p className="page-subtitle">You can book a token in 4 quick steps. {nextStepMessage}</p>
          </div>
          <button type="button" onClick={() => setActiveTab('book')}>Start Booking</button>
        </section>

        <div className="stats-grid">
          <div className="stat-card"><p>Active Token</p><h3>{latestBookedToken?.tokenNumber || '-'}</h3><span>{latestBookedToken?.serviceName || 'No active token yet'}</span></div>
          <div className="stat-card"><p>Queue Position</p><h3>{liveQueueEvent?.waitingCount ?? '-'}</h3><span>People ahead of you</span></div>
          <div className="stat-card"><p>Estimated Wait</p><h3>{formatWaitTime(estimatedWait) || 'Select a service'}</h3><span>Live estimate</span></div>
          <div className="stat-card"><p>Current Status</p><h3>{latestBookedToken?.status || 'NOT BOOKED'}</h3><span>Booking progress</span></div>
        </div>

        <section className="token-card stepper-panel">
          <h3>Book Token in 4 Steps</h3>
          <p className="page-subtitle">Follow this sequence to avoid confusion.</p>
          <div className="booking-steps">
            {bookingSteps.map((step, index) => (
              <div
                key={step.id}
                className={`booking-step ${step.active ? 'active' : ''} ${step.done ? 'done' : ''}`}
                aria-current={step.active ? 'step' : undefined}
              >
                <div className="step-index">{index + 1}</div>
                <div>
                  <p className="step-title">{step.label}</p>
                  <p className="step-desc">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="quick-actions">
          <button type="button" className="quick-action-card" onClick={() => setActiveTab('book')}>
            <h4>Book Token</h4>
            <p>Select client, branch, and service to create a new token.</p>
          </button>
          <button type="button" className="quick-action-card" onClick={() => setActiveTab('tokens')}>
            <h4>My Tokens</h4>
            <p>Track your current and previous token statuses in one place.</p>
          </button>
          <button type="button" className="quick-action-card" onClick={() => setActiveTab('live')}>
            <h4>Live Queue</h4>
            <p>Check the latest queue movement before visiting the branch.</p>
          </button>
        </section>

        {latestBookedToken ? (
          <section className="token-card">
            <h3>Latest Ticket Proof</h3>
            <p className="page-subtitle">Already booked? Open proof in one tap before going to the branch.</p>
            <button type="button" onClick={() => openProof(latestBookedToken)}>Show Latest Proof</button>
          </section>
        ) : null}
      </>
    )
  }

  function renderBookToken() {
    return (
      <>
        <h2>Book New Token</h2>
        <p className="page-subtitle">Step 1: Client. Step 2: Branch. Step 3: Service. Step 4: Book if it works for you.</p>

        <div className="book-layout">
          <div>
            <div className="field-group">
              <label>1. Select Client</label>
              <select value={selectedClientId} onChange={handleClientChange}>
                <option value="">
                  {clients.length ? 'Select client' : 'No clients available'}
                </option>
                {clients.map((client) => <option key={getEntityId(client)} value={getEntityId(client)}>{getEntityName(client)}</option>)}
              </select>
            </div>

            <div className="field-group">
              <label>2. Choose Client Branch</label>
              <select value={selectedBranchId} onChange={handleBranchChange} disabled={!selectedClientId}>
                <option value="">
                  {!selectedClientId
                    ? 'Select client first'
                    : branches.length
                      ? 'Select branch'
                      : 'No branches available for this client'}
                </option>
                {branches.map((branch) => <option key={getEntityId(branch)} value={getEntityId(branch)}>{getEntityName(branch)}</option>)}
              </select>
            </div>

            <div className="field-group">
              <label>3. View and Select Service</label>
              <select value={selectedServiceId} onChange={handleServiceChange} disabled={!selectedBranchId}>
                <option value="">
                  {!selectedBranchId
                    ? 'Select branch first'
                    : services.length
                      ? 'Select service'
                      : 'No services available for this branch'}
                </option>
                {services.map((service) => <option key={getEntityId(service)} value={getEntityId(service)}>{getEntityName(service)}</option>)}
              </select>
            </div>

            <button type="button" className="book-btn" onClick={handleBookToken} disabled={loading || !canBookNow}>4. Book Token</button>
            {!canBookNow ? <p className="helper-copy">Complete all 3 selections to enable booking.</p> : null}
          </div>

          <div className="info-panel">
            <h3>Availability Summary</h3>
            <p><strong>Client:</strong> {getEntityName(selectedClient) || 'Not selected'}</p>
            <p><strong>Branch:</strong> {getEntityName(selectedBranch) || 'Not selected'}</p>
            <p><strong>Service:</strong> {getEntityName(selectedService) || 'Not selected'}</p>
            <div className="value-box">Estimated wait: {formatWaitTime(estimatedWait) !== '-' ? formatWaitTime(estimatedWait) : (canReviewAvailability ? 'Choose a service' : 'Select branch first')}</div>
            <p className="helper-copy">You can decide to continue booking or stop here after checking availability.</p>
          </div>
        </div>

        {proofMessage ? <p className="status-message success-text">{proofMessage}</p> : null}
        {renderTicketProofCard(proofToken)}
      </>
    )
  }

  function renderMyTokens() {
    const rows = [...bookedTokens]

    return (
      <div className="table-card">
        <h2>My Tokens</h2>
        <table className="common-table">
          <thead><tr><th>Token No.</th><th>Branch</th><th>Service</th><th>Status</th><th>Proof</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((item, index) => (
              <tr key={`${item.tokenNumber}-${index}`}>
                <td>{item.tokenNumber || '-'}</td>
                <td>{item.branchName || '-'}</td>
                <td>{item.serviceName || '-'}</td>
                <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status || '-'}</span></td>
                <td><button type="button" className="table-action-btn" onClick={() => openProof(item)}>Show Proof</button></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>No tokens booked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        {renderTicketProofCard(proofToken)}
      </div>
    )
  }

  function renderLiveQueue() {
    const totalWaiting = liveQueueRows.reduce((sum, row) => sum + Number(row.liveStatus?.waitingCount || 0), 0)
    const nowServing = liveQueueRows.filter((row) => row.liveStatus?.currentServingToken).length
    const busiestRow = liveQueueRows.reduce((busiest, row) => {
      const currentCount = Number(row.liveStatus?.waitingCount || 0)
      const busiestCount = Number(busiest?.liveStatus?.waitingCount || 0)
      return currentCount > busiestCount ? row : busiest
    }, liveQueueRows[0])
    const maxWaiting = Math.max(1, ...liveQueueRows.map((row) => Number(row.liveStatus?.waitingCount || 0)))

    return (
      <>
        <div className="live-heading">
          <div>
            <h2>Live Queue Status</h2>
            <p className="page-subtitle">{getEntityName(selectedBranch) || 'Select a branch'} queue snapshot</p>
          </div>
          <button type="button" className="alt-btn live-refresh-btn" onClick={() => loadLiveQueueSnapshot()} disabled={liveLoading || !selectedBranchId}>
            {liveLoading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        <div className="live-toolbar">
          <div className="field-group">
            <label>Client</label>
            <select value={selectedClientId} onChange={handleClientChange}>
              <option value="">{clients.length ? 'Select client' : 'No clients available'}</option>
              {clients.map((client) => <option key={getEntityId(client)} value={getEntityId(client)}>{getEntityName(client)}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Branch</label>
            <select value={selectedBranchId} onChange={handleBranchChange} disabled={!selectedClientId}>
              <option value="">{branches.length ? 'Select branch' : 'No branches available'}</option>
              {branches.map((branch) => <option key={getEntityId(branch)} value={getEntityId(branch)}>{getEntityName(branch)}</option>)}
            </select>
          </div>
        </div>

        <div className="live-summary-grid">
          <div className="live-summary-card"><p>Total Waiting</p><strong>{totalWaiting}</strong><span>Across this branch</span></div>
          <div className="live-summary-card"><p>Now Serving</p><strong>{nowServing}</strong><span>Active service lines</span></div>
          <div className="live-summary-card"><p>Busiest Service</p><strong>{busiestRow ? getEntityName(busiestRow.service) : '-'}</strong><span>{busiestRow ? `${busiestRow.liveStatus?.waitingCount || 0} waiting` : 'No queue yet'}</span></div>
          <div className="live-summary-card"><p>Last Update</p><strong>{formatClockTime(liveLastUpdated)}</strong><span>Auto refresh every 10s</span></div>
        </div>

        <div className="queue-list live-queue-board">
          {liveQueueRows.length ? liveQueueRows.map((row) => {
            const serviceId = getEntityId(row.service)
            const waitingCount = Number(row.liveStatus?.waitingCount || 0)
            const loadPercent = Math.min(100, Math.round((waitingCount / maxWaiting) * 100))
            const statusMessage = row.liveStatus?.statusMessage || (waitingCount > 0 ? 'Waiting' : 'No active token')

            return (
              <div className="queue-row live-queue-row" key={serviceId}>
                <div className="queue-service-main">
                  <strong>{getEntityName(row.service)}</strong>
                  <p>{statusMessage}</p>
                  <div className="queue-load-track" aria-hidden="true">
                    <span style={{ width: `${loadPercent}%` }} />
                  </div>
                </div>
                <div className="queue-metric">
                  <span>Serving</span>
                  <strong>{row.liveStatus?.currentServingToken || '-'}</strong>
                </div>
                <div className="queue-metric">
                  <span>Waiting</span>
                  <strong>{waitingCount}</strong>
                </div>
                <div className="queue-metric">
                  <span>Wait</span>
                  <strong>{formatWaitTime(row.estimatedWait)}</strong>
                </div>
                <button
                  type="button"
                  className="queue-book-btn"
                  onClick={() => {
                    setSelectedServiceId(serviceId)
                    setActiveTab('book')
                  }}
                >
                  Book
                </button>
              </div>
            )
          }) : (
            <div className="empty-live-state">
              <strong>No queue data available</strong>
              <p>Select a client and branch to view live service lines.</p>
            </div>
          )}
        </div>

        {liveQueueEvent ? (
          <div className="token-card live-update-card">
            <h3>Latest Queue Update</h3>
            <div className="live-update-grid">
              <p><strong>Token Number:</strong> {liveQueueEvent.tokenNumber || '-'}</p>
              <p><strong>Status:</strong> {liveQueueEvent.status || '-'}</p>
              <p><strong>Current Serving:</strong> {liveQueueEvent.currentServingToken || '-'}</p>
              <p><strong>Waiting:</strong> {liveQueueEvent.waitingCount ?? '-'}</p>
            </div>
            <p>{liveQueueEvent.message || '-'}</p>
          </div>
        ) : null}
      </>
    )
  }

  function renderProfile() {
    return (
      <div className="token-card profile-panel">
        <h2>My Profile</h2>
        <label>Full Name<input value={userName} readOnly /></label>
        <label>Email<input value={userEmail} readOnly /></label>
        <label>Phone<input value="9876543210" readOnly /></label>
      </div>
    )
  }

  return (
    <section className="dashboard-page">
      <aside className="dash-sidebar">
        <h3>QSmart</h3>
        <ul>
          <li><button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button></li>
          <li><button className={activeTab === 'book' ? 'active' : ''} onClick={() => setActiveTab('book')}>Book Token</button></li>
          <li><button className={activeTab === 'tokens' ? 'active' : ''} onClick={() => setActiveTab('tokens')}>My Tokens</button></li>
          <li><button className={activeTab === 'live' ? 'active' : ''} onClick={() => setActiveTab('live')}>Live Queue</button></li>
          <li><button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Profile</button></li>
        </ul>
      </aside>

      <div className="dash-main">
        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'book' ? renderBookToken() : null}
        {activeTab === 'tokens' ? renderMyTokens() : null}
        {activeTab === 'live' ? renderLiveQueue() : null}
        {activeTab === 'profile' ? renderProfile() : null}

        {loading ? <p className="status-message">Loading data, please wait...</p> : null}
        {error ? <p className="status-message error-text">{error}</p> : null}

        {latestBookedToken && activeTab === 'book' ? (
          <div className="token-card">
            <h3>Booked Token Details</h3>
            <p><strong>Token Number:</strong> {latestBookedToken.tokenNumber || '-'}</p>
            <p><strong>Client:</strong> {latestBookedToken.clientName || '-'}</p>
            <p><strong>Branch:</strong> {latestBookedToken.branchName || '-'}</p>
            <p><strong>Service:</strong> {latestBookedToken.serviceName || '-'}</p>
            <p><strong>Status:</strong> {latestBookedToken.status || '-'}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default UserDashboard
