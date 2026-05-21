import { useEffect, useMemo, useState } from 'react'
import axiosInstance from '../api/axiosConfig.jsx'
import { isDemoMode } from '../utils/demoAuth.js'
import {
  demoBranchPerformance,
  demoBranches,
  demoClients,
  demoDatabaseSnapshot,
  demoOverview,
  demoPeakHours,
  demoServiceAnalytics,
  demoSummary
} from '../utils/demoData.js'
import './AdminDashboard.css'

const emptyOverview = {
  totalWaitingTokens: 0,
  totalServingTokens: 0,
  totalCompletedTokens: 0,
  totalCancelledTokens: 0
}

const databaseTables = [
  { key: 'users', title: 'Users', columns: ['id', 'fullName', 'email', 'phoneNumber', 'role', 'clientName', 'createdAt'] },
  { key: 'clients', title: 'Clients', columns: ['id', 'clientName', 'clientType', 'contactEmail', 'contactPhone', 'headOfficeCity', 'createdAt'] },
  { key: 'branches', title: 'Branches', columns: ['id', 'branchName', 'location', 'seatingCapacity', 'workingHours', 'clientName', 'createdAt'] },
  { key: 'services', title: 'Services', columns: ['id', 'serviceName', 'description', 'estimatedTime', 'branchName', 'clientName', 'createdAt'] },
  { key: 'counters', title: 'Counters', columns: ['id', 'counterName', 'counterNumber', 'isActive', 'branchName', 'serviceName', 'createdAt'] },
  { key: 'queueTokens', title: 'Queue Tokens', columns: ['id', 'tokenNumber', 'status', 'userEmail', 'serviceName', 'counterId', 'createdAt', 'completedAt'] },
  { key: 'queueRules', title: 'Queue Rules', columns: ['id', 'ruleKey', 'ruleValue', 'branchName'] },
  { key: 'addresses', title: 'Addresses', columns: ['id', 'addressLine', 'city', 'state', 'country', 'pincode'] }
]

function getListPayload(responseData) {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.content)) return responseData.content
  if (Array.isArray(responseData?.items)) return responseData.items
  return []
}

function getClientName(client) {
  return client?.clientName || client?.name || '-'
}

function getClientType(client) {
  return client?.clientType || client?.type || 'GENERAL'
}

function getClientEmail(client) {
  return client?.email || client?.contactEmail || '-'
}

function getClientPhone(client) {
  return client?.phoneNumber || client?.contactPhone || '-'
}

function getBranchClientId(branch) {
  return String(branch?.clientId || branch?.client?.id || '')
}

function getBranchName(branch) {
  return branch?.name || branch?.branchName || '-'
}

function getBranchCity(branch) {
  return branch?.city || branch?.location || '-'
}

function getSummaryMessage(summary) {
  const overview = summary?.overview
  if (!overview) {
    return summary?.message || 'No summary available'
  }
  return `Waiting: ${overview.totalWaitingTokens ?? 0}, Serving: ${overview.totalServingTokens ?? 0}, Completed: ${overview.totalCompletedTokens ?? 0}, Cancelled: ${overview.totalCancelledTokens ?? 0}`
}

function toMetricNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function getHourSortValue(hourValue) {
  if (hourValue == null) return Number.MAX_SAFE_INTEGER
  const hourText = String(hourValue).trim()
  if (!hourText) return Number.MAX_SAFE_INTEGER

  const directHour = Number.parseInt(hourText, 10)
  if (Number.isFinite(directHour)) return directHour

  const clockMatch = hourText.match(/^(\d{1,2})/)
  if (clockMatch) return Number.parseInt(clockMatch[1], 10)

  return Number.MAX_SAFE_INTEGER
}

function getHealthTone(score) {
  if (score == null) return { label: 'No Activity Yet', className: 'warning' }
  if (score >= 85) return { label: 'Stable Operations', className: 'healthy' }
  if (score >= 70) return { label: 'Moderate Load', className: 'warning' }
  return { label: 'Needs Attention', className: 'critical' }
}

function AdminDashboard() {
  const demoMode = isDemoMode()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [overview, setOverview] = useState(emptyOverview)
  const [branchPerformance, setBranchPerformance] = useState([])
  const [serviceAnalytics, setServiceAnalytics] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [summary, setSummary] = useState({ message: '' })
  const [databaseSnapshot, setDatabaseSnapshot] = useState({ counts: {} })

  const [clients, setClients] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [clientForm, setClientForm] = useState({
    clientName: '',
    clientType: 'HOSPITAL',
    headOfficeCity: '',
    email: '',
    phoneNumber: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedClient = useMemo(() => {
    return clients.find((item) => String(item.id || item.clientId || '') === String(selectedClientId || '')) || null
  }, [clients, selectedClientId])

  const branchMetricsById = useMemo(() => {
    const metricsMap = new Map()
    branchPerformance.forEach((item, index) => {
      metricsMap.set(String(item.branchId || item.id || index), item)
    })
    return metricsMap
  }, [branchPerformance])

  const enrichedBranches = useMemo(() => {
    return branches.map((branch, index) => {
      const key = String(branch.id || branch.branchId || index)
      const metrics = branchMetricsById.get(key) || {}
      return {
        ...branch,
        ...metrics,
        counters: toMetricNumber(metrics.activeCounters ?? branch.counters),
        waiting: toMetricNumber(metrics.waitingTokens ?? branch.waiting),
        averageWaitTime: metrics.averageServiceTime ?? branch.averageWaitTime,
        completedToday: metrics.totalTokensProcessed ?? branch.completedToday
      }
    })
  }, [branches, branchMetricsById])

  const selectedClientBranches = useMemo(() => {
    return enrichedBranches.filter((item) => getBranchClientId(item) === String(selectedClientId || ''))
  }, [enrichedBranches, selectedClientId])

  const processOverview = useMemo(() => {
    const waiting = selectedClientBranches.reduce((sum, branch) => sum + Number(branch.waiting || 0), 0)
    const serving = selectedClientBranches.reduce((sum, branch) => sum + Number(branch.serving || 0), 0)
    const completedToday = selectedClientBranches.reduce((sum, branch) => sum + Number(branch.completedToday || 0), 0)
    const activeCounters = selectedClientBranches.reduce((sum, branch) => sum + Number(branch.counters || 0), 0)

    return {
      branches: selectedClientBranches.length,
      waiting,
      serving,
      completedToday,
      activeCounters
    }
  }, [selectedClientBranches])

  const adminSnapshot = useMemo(() => {
    const waiting = toMetricNumber(overview?.totalWaitingTokens)
    const serving = toMetricNumber(overview?.totalServingTokens)
    const completed = toMetricNumber(overview?.totalCompletedTokens)
    const cancelled = toMetricNumber(overview?.totalCancelledTokens)
    const totalFlow = waiting + serving + completed + cancelled

    const waitingPenalty = totalFlow ? (waiting / totalFlow) * 45 : 0
    const cancellationPenalty = totalFlow ? (cancelled / totalFlow) * 35 : 0
    const score = totalFlow ? Math.max(0, Math.min(100, Math.round(100 - waitingPenalty - cancellationPenalty))) : null

    const activeBranches = enrichedBranches.filter((branch) => String(branch.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length
    const criticalBranches = enrichedBranches.filter((branch) => {
      const status = String(branch.status || 'ACTIVE').toUpperCase()
      return toMetricNumber(branch.waiting) >= 20 || toMetricNumber(branch.averageWaitTime) >= 30 || status !== 'ACTIVE'
    }).length

    const averageBranchWait = enrichedBranches.length
      ? Math.round(enrichedBranches.reduce((sum, branch) => sum + toMetricNumber(branch.averageWaitTime), 0) / enrichedBranches.length)
      : 0

    return {
      waiting,
      serving,
      completed,
      cancelled,
      activeBranches,
      criticalBranches,
      averageBranchWait,
      score,
      scoreText: score == null ? 'N/A' : score,
      tone: getHealthTone(score)
    }
  }, [overview, enrichedBranches])

  const peakHoursTrend = useMemo(() => {
    const rows = peakHours.map((item, index) => ({
      key: `${item.hour || 'hour'}-${index}`,
      hour: item.hour || '-',
      tokenCount: toMetricNumber(item.tokenCount)
    }))

    return rows
      .sort((a, b) => getHourSortValue(a.hour) - getHourSortValue(b.hour))
      .slice(0, 12)
  }, [peakHours])

  const topServiceRows = useMemo(() => {
    return [...serviceAnalytics]
      .map((item, index) => ({
        key: String(item.serviceId || index),
        name: item.serviceName || `Service ${index + 1}`,
        totalTokens: toMetricNumber(item.totalTokens),
        avgWait: item.averageServiceTime ?? item.averageWaitTime ?? '-'
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 6)
  }, [serviceAnalytics])

  const attentionBranches = useMemo(() => {
    return enrichedBranches
      .map((branch, index) => {
        const waiting = toMetricNumber(branch.waiting)
        const avgWait = toMetricNumber(branch.averageWaitTime)
        const status = String(branch.status || 'ACTIVE').toUpperCase()
        const severity = waiting * 2 + avgWait + (status !== 'ACTIVE' ? 50 : 0)

        return {
          key: String(branch.id || branch.branchId || index),
          branch,
          branchName: getBranchName(branch),
          city: getBranchCity(branch),
          waiting,
          avgWait,
          status,
          severity
        }
      })
      .filter((item) => item.waiting >= 10 || item.avgWait >= 15 || item.status !== 'ACTIVE')
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5)
  }, [enrichedBranches])

  const branchLeaderboard = useMemo(() => {
    return enrichedBranches
      .map((branch, index) => {
        const waiting = toMetricNumber(branch.waiting)
        const avgWait = toMetricNumber(branch.averageWaitTime)
        const completedToday = toMetricNumber(branch.completedToday)
        const serving = toMetricNumber(branch.serving)
        const counters = toMetricNumber(branch.counters)
        const throughput = completedToday + serving
        const hasActivity = waiting > 0 || avgWait > 0 || throughput > 0 || serving > 0
        const status = hasActivity
          ? String(branch.status || 'ACTIVE').toUpperCase()
          : counters > 0 ? 'READY' : 'SETUP'
        const performanceScore = hasActivity
          ? Math.max(0, Math.min(100, Math.round(90 + (completedToday * 0.7) - (waiting * 1.4) - (avgWait * 0.8) + Math.min(counters, 5))))
          : null

        return {
          key: String(branch.id || branch.branchId || index),
          branchName: getBranchName(branch),
          city: getBranchCity(branch),
          status,
          waiting,
          avgWait,
          throughput,
          performanceScore,
          scoreText: performanceScore == null ? 'N/A' : performanceScore
        }
      })
      .sort((a, b) => {
        if (a.performanceScore == null && b.performanceScore == null) return a.branchName.localeCompare(b.branchName)
        if (a.performanceScore == null) return 1
        if (b.performanceScore == null) return -1
        return b.performanceScore - a.performanceScore
      })
      .slice(0, 15)
  }, [enrichedBranches])

  async function loadDashboardData() {
    if (demoMode) {
      setOverview(demoOverview)
      setBranchPerformance(demoBranchPerformance)
      setServiceAnalytics(demoServiceAnalytics)
      setPeakHours(demoPeakHours)
      setSummary(demoSummary)
      return
    }

    const [overviewResult, branchPerformanceResult, serviceAnalyticsResult, peakHoursResult, summaryResult] = await Promise.allSettled([
      axiosInstance.get('/api/admin/dashboard/overview'),
      axiosInstance.get('/api/admin/dashboard/branch-performance'),
      axiosInstance.get('/api/admin/dashboard/service-analytics'),
      axiosInstance.get('/api/admin/dashboard/peak-hours'),
      axiosInstance.get('/api/admin/dashboard/summary')
    ])

    const failures = []

    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value?.data || emptyOverview)
    } else {
      setOverview(emptyOverview)
      failures.push('overview')
    }

    if (branchPerformanceResult.status === 'fulfilled') {
      setBranchPerformance(getListPayload(branchPerformanceResult.value?.data))
    } else {
      setBranchPerformance([])
      failures.push('branch performance')
    }

    if (serviceAnalyticsResult.status === 'fulfilled') {
      setServiceAnalytics(getListPayload(serviceAnalyticsResult.value?.data))
    } else {
      setServiceAnalytics([])
      failures.push('service analytics')
    }

    if (peakHoursResult.status === 'fulfilled') {
      setPeakHours(getListPayload(peakHoursResult.value?.data))
    } else {
      setPeakHours([])
      failures.push('peak hours')
    }

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value?.data || { message: '' })
    } else {
      setSummary({ message: '' })
      failures.push('summary')
    }

    if (failures.length) {
      setError(`Some dashboard sections failed to load: ${failures.join(', ')}.`)
    }
  }

  async function loadAdminClients() {
    if (demoMode) {
      setClients(demoClients)
      setSelectedClientId(String(demoClients[0]?.id || ''))
      return
    }

    try {
      const response = await axiosInstance.get('/api/admin/clients')
      const payload = getListPayload(response.data)
      setClients(payload)
      setSelectedClientId(String(payload[0]?.id || payload[0]?.clientId || ''))
    } catch (err) {
      setClients([])
      setSelectedClientId('')
      setError(err?.response?.data?.message || 'Unable to load clients.')
    }
  }

  async function loadAdminBranches() {
    if (demoMode) {
      setBranches(demoBranches)
      return
    }

    try {
      const response = await axiosInstance.get('/api/admin/branches')
      const payload = getListPayload(response.data)
      setBranches(payload)
    } catch (err) {
      setBranches([])
      setError(err?.response?.data?.message || 'Unable to load branches.')
    }
  }

  async function loadDatabaseData() {
    if (demoMode) {
      setDatabaseSnapshot(demoDatabaseSnapshot)
      setMessage('Demo database snapshot refreshed.')
      return
    }

    try {
      const response = await axiosInstance.get('/api/admin/database')
      setDatabaseSnapshot(response.data || { counts: {} })
    } catch (err) {
      setDatabaseSnapshot({ counts: {} })
      setError(err?.response?.data?.message || 'Unable to load database data.')
    }
  }

  async function bootstrapAdmin() {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadDashboardData(), loadAdminClients(), loadAdminBranches(), loadDatabaseData()])
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to initialize admin dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      bootstrapAdmin()
    })
  }, [])

  function validateClientForm() {
    if (!clientForm.clientName.trim()) return 'Client name is required.'
    if (!clientForm.headOfficeCity.trim()) return 'Head office city is required.'
    if (!clientForm.email.trim()) return 'Email is required.'
    if (!/^\S+@\S+\.\S+$/.test(clientForm.email.trim())) return 'Enter a valid email address.'
    if (!clientForm.phoneNumber.trim()) return 'Phone number is required.'
    const duplicate = clients.find((item) => String(item.email || item.contactEmail || '').toLowerCase() === String(clientForm.email || '').toLowerCase())
    if (duplicate) return 'A client with this email already exists.'
    return ''
  }

  async function handleCreateClient(event) {
    event.preventDefault()
    const validationMessage = validateClientForm()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    const payload = {
      clientName: clientForm.clientName.trim(),
      clientType: clientForm.clientType,
      contactEmail: clientForm.email.trim(),
      contactPhone: clientForm.phoneNumber.trim(),
      headOfficeCity: clientForm.headOfficeCity.trim()
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      if (demoMode) {
        const nextClient = {
          id: `demo-client-${Date.now()}`,
          clientId: `demo-client-${Date.now()}`,
          clientName: payload.clientName,
          name: payload.clientName,
          clientType: payload.clientType,
          type: payload.clientType,
          contactEmail: payload.contactEmail,
          email: payload.contactEmail,
          contactPhone: payload.contactPhone,
          phoneNumber: payload.contactPhone,
          headOfficeCity: payload.headOfficeCity,
          status: 'ACTIVE',
          createdAt: new Date().toISOString().slice(0, 10)
        }
        setClients((prev) => [nextClient, ...prev])
        setSelectedClientId(String(nextClient.id))
        setShowCreateClient(false)
        setClientForm({ clientName: '', clientType: 'HOSPITAL', headOfficeCity: '', email: '', phoneNumber: '' })
        setMessage('Demo: client added to the front-end view.')
        return
      }

      const response = await axiosInstance.post('/api/admin/clients', payload)
      const created = response.data || {}
      const nextClient = {
        id: created.id || Date.now(),
        clientName: created.clientName || payload.clientName,
        clientType: created.clientType || payload.clientType,
        contactEmail: created.contactEmail || payload.contactEmail,
        contactPhone: created.contactPhone || payload.contactPhone,
        headOfficeCity: created.headOfficeCity || payload.headOfficeCity,
        createdAt: created.createdAt || new Date().toISOString()
      }
      setClients((prev) => [nextClient, ...prev])
      setSelectedClientId(String(nextClient.id))
      setShowCreateClient(false)
      setClientForm({ clientName: '', clientType: 'HOSPITAL', headOfficeCity: '', email: '', phoneNumber: '' })
      setMessage('Client created successfully.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create client.')
    } finally {
      setLoading(false)
    }
  }

  function openClientManagement(showForm = false) {
    setActiveTab('clients')
    if (showForm) setShowCreateClient(true)
  }

  function openTopAlertClient() {
    const topAlert = attentionBranches[0]
    if (!topAlert) {
      setActiveTab('clients')
      return
    }

    const nextClientId = getBranchClientId(topAlert.branch)
    if (nextClientId) setSelectedClientId(nextClientId)
    setActiveTab('clients')
  }

  function renderOverviewCards() {
    const data = overview || emptyOverview

    return (
      <div className="stats-grid">
        <div className="stat-card"><p>Waiting Tokens</p><h3>{data.totalWaitingTokens ?? 0}</h3></div>
        <div className="stat-card"><p>Serving Tokens</p><h3>{data.totalServingTokens ?? 0}</h3></div>
        <div className="stat-card"><p>Completed Tokens</p><h3>{data.totalCompletedTokens ?? 0}</h3></div>
        <div className="stat-card"><p>Cancelled Tokens</p><h3>{data.totalCancelledTokens ?? 0}</h3></div>
      </div>
    )
  }

  function renderServiceAnalytics() {
    const rows = serviceAnalytics

    return (
      <div className="table-card">
        <h3>Service Analytics</h3>
        <div className="admin-table-scroll">
          <table className="common-table">
            <thead><tr><th>Service</th><th>Total</th><th>Avg Wait</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((item, index) => (
                <tr key={item.serviceId || index}>
                  <td>{item.serviceName || '-'}</td>
                  <td>{item.totalTokens ?? '-'}</td>
                  <td>{item.averageServiceTime ?? item.averageWaitTime ?? '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={3}>No service analytics available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderPeakHours() {
    const rows = peakHours

    return (
      <div className="table-card">
        <h3>Peak Hours</h3>
        <div className="admin-table-scroll">
          <table className="common-table">
            <thead><tr><th>Hour</th><th>Token Count</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((item, index) => (
                <tr key={item.hour || index}>
                  <td>{item.hour || '-'}</td>
                  <td>{item.tokenCount ?? '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={2}>No peak hour data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderDashboard() {
    const maxPeakValue = Math.max(...peakHoursTrend.map((item) => item.tokenCount), 1)
    const maxServiceValue = Math.max(...topServiceRows.map((item) => item.totalTokens), 1)

    return (
      <>
        <h2>Admin Dashboard</h2>
        <p className="page-subtitle">Real-time command center for queue health, branch performance, and priority actions.</p>

        <div className="admin-hero-grid">
          <div className={`admin-health-card ${adminSnapshot.tone.className}`}>
            <p>Queue Health Score</p>
            <h3>{adminSnapshot.scoreText}</h3>
            <span>{adminSnapshot.tone.label}</span>
          </div>
          <div className="stat-card"><p>Waiting</p><h3>{adminSnapshot.waiting}</h3></div>
          <div className="stat-card"><p>Serving</p><h3>{adminSnapshot.serving}</h3></div>
          <div className="stat-card"><p>Completed Today</p><h3>{adminSnapshot.completed}</h3></div>
          <div className="stat-card"><p>Active Branches</p><h3>{adminSnapshot.activeBranches}</h3><span>{adminSnapshot.criticalBranches} need attention</span></div>
          <div className="stat-card"><p>Average Branch Wait</p><h3>{adminSnapshot.averageBranchWait} min</h3><span>Across all active branches</span></div>
        </div>

        <div className="admin-command-grid">
          <div className="token-card admin-alert-card">
            <h3>Needs Attention Now</h3>
            {attentionBranches.length ? (
              <ul className="admin-alert-list">
                {attentionBranches.map((item) => (
                  <li key={item.key}>
                    <strong>{item.branchName}</strong>
                    <span>{item.city}</span>
                    <span>Waiting {item.waiting} | Avg wait {item.avgWait} min</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="page-subtitle">No critical branch alerts right now.</p>
            )}
          </div>

          <div className="token-card admin-actions-card">
            <h3>Quick Actions</h3>
            <div className="admin-actions-grid">
              <button type="button" onClick={() => openClientManagement(true)}>+ Create Client</button>
              <button type="button" onClick={() => openClientManagement(false)}>Open Client Management</button>
              <button type="button" className="alt-btn" onClick={openTopAlertClient}>Inspect Top Alert Branch</button>
            </div>
            <p className="page-subtitle admin-summary-line">{getSummaryMessage(summary)}</p>
          </div>
        </div>

        <div className="admin-insights-grid">
          <div className="table-card">
            <h3>Peak Hours Trend</h3>
            {peakHoursTrend.length ? (
              <div className="admin-peak-chart">
                {peakHoursTrend.map((item) => (
                  <div className="peak-chart-item" key={item.key}>
                    <span className="peak-chart-value">{item.tokenCount}</span>
                    <div className="peak-chart-bar-wrap">
                      <div
                        className="peak-chart-bar"
                        style={{ height: `${Math.max(12, Math.round((item.tokenCount / maxPeakValue) * 120))}px` }}
                      />
                    </div>
                    <span className="peak-chart-label">{item.hour}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="page-subtitle">No peak hour data available.</p>
            )}
          </div>

          <div className="table-card">
            <h3>Top Services by Volume</h3>
            {topServiceRows.length ? (
              <ul className="admin-service-list">
                {topServiceRows.map((item) => (
                  <li key={item.key}>
                    <div className="admin-service-head">
                      <strong>{item.name}</strong>
                      <span>{item.totalTokens} tokens</span>
                    </div>
                    <div className="admin-service-track">
                      <span
                        className="admin-service-fill"
                        style={{ width: `${Math.max(8, Math.round((item.totalTokens / maxServiceValue) * 100))}%` }}
                      />
                    </div>
                    <small>Avg wait: {item.avgWait}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="page-subtitle">No service analytics available.</p>
            )}
          </div>
        </div>

        <div className="table-card">
          <h3>Branch Performance League (Top 15)</h3>
          <div className="admin-table-scroll">
            <table className="common-table">
              <thead><tr><th>Rank</th><th>Branch</th><th>City</th><th>Status</th><th>Waiting</th><th>Avg Wait (min)</th><th>Throughput</th><th>Score</th></tr></thead>
              <tbody>
                {branchLeaderboard.length ? branchLeaderboard.map((item, index) => (
                  <tr key={item.key}>
                    <td>{index + 1}</td>
                    <td>{item.branchName}</td>
                    <td>{item.city}</td>
                    <td><span className={item.status === 'ACTIVE' ? 'badge' : 'badge warning'}>{item.status}</span></td>
                    <td>{item.waiting}</td>
                    <td>{item.avgWait}</td>
                    <td>{item.throughput}</td>
                    <td>{item.scoreText}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8}>No branch data available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )
  }

  function renderClientsTable() {
    const rows = clients

    return (
      <div className="table-card">
        <h3>Clients</h3>
        <div className="admin-table-scroll">
          <table className="common-table">
            <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Status</th><th>Branches</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((client) => {
                const id = String(client.id || client.clientId || '')
                const branchCount = enrichedBranches.filter((branch) => getBranchClientId(branch) === id).length
                return (
                  <tr key={id}>
                    <td>{getClientName(client)}</td>
                    <td>{getClientType(client)}</td>
                    <td>{getClientEmail(client)}</td>
                    <td><span className="badge">{client.status || 'ACTIVE'}</span></td>
                    <td>{branchCount}</td>
                    <td>{client.createdAt || '-'}</td>
                    <td>
                      <button type="button" className="table-action-btn" onClick={() => setSelectedClientId(id)}>View</button>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={7}>No clients available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderCreateClientForm() {
    if (!showCreateClient) return null

    return (
      <form className="token-card" onSubmit={handleCreateClient}>
        <h3>Create New Client</h3>
        <div className="admin-form-grid">
          <label>Client Name<input type="text" value={clientForm.clientName} onChange={(event) => setClientForm((prev) => ({ ...prev, clientName: event.target.value }))} /></label>
          <label>Client Type
            <select value={clientForm.clientType} onChange={(event) => setClientForm((prev) => ({ ...prev, clientType: event.target.value }))}>
              <option value="HOSPITAL">Hospital</option>
              <option value="CLINIC">Clinic</option>
              <option value="BANK">Bank</option>
              <option value="GOVERNMENT_OFFICE">Government Office</option>
              <option value="COLLEGE">College</option>
            </select>
          </label>
          <label>Head Office City<input type="text" value={clientForm.headOfficeCity} onChange={(event) => setClientForm((prev) => ({ ...prev, headOfficeCity: event.target.value }))} /></label>
          <label>Email<input type="email" value={clientForm.email} onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))} /></label>
          <label>Phone<input type="text" value={clientForm.phoneNumber} onChange={(event) => setClientForm((prev) => ({ ...prev, phoneNumber: event.target.value }))} /></label>
        </div>
        <div className="admin-actions-row">
          <button type="submit" disabled={loading}>Create Client</button>
          <button type="button" className="alt-btn" onClick={() => setShowCreateClient(false)}>Cancel</button>
        </div>
      </form>
    )
  }

  function renderSelectedClientDetail() {
    if (!selectedClient) {
      return (
        <div className="token-card">
          <h3>No Client Selected</h3>
          <p>Select a client from the list to view branch and process details.</p>
        </div>
      )
    }

    return (
      <>
        <div className="token-card">
          <h3>Client Detail</h3>
          <p><strong>Name:</strong> {getClientName(selectedClient)}</p>
          <p><strong>Type:</strong> {getClientType(selectedClient)}</p>
          <p><strong>Email:</strong> {getClientEmail(selectedClient)}</p>
          <p><strong>Phone:</strong> {getClientPhone(selectedClient)}</p>
          <p><strong>Head Office City:</strong> {selectedClient.headOfficeCity || '-'}</p>
          <p><strong>Status:</strong> {selectedClient.status || 'ACTIVE'}</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><p>Total Branches</p><h3>{processOverview.branches}</h3></div>
          <div className="stat-card"><p>Active Counters</p><h3>{processOverview.activeCounters}</h3></div>
          <div className="stat-card"><p>Waiting</p><h3>{processOverview.waiting}</h3></div>
          <div className="stat-card"><p>Serving / Completed</p><h3>{processOverview.serving} / {processOverview.completedToday}</h3></div>
        </div>

        <div className="table-card">
          <h3>Branches</h3>
          {!selectedClientBranches.length ? (
            <p className="page-subtitle">No branches created yet for this client.</p>
          ) : (
            <div className="admin-table-scroll">
              <table className="common-table">
                <thead><tr><th>Branch</th><th>City</th><th>Working Hours</th><th>Status</th><th>Counters</th><th>Waiting</th><th>Avg Wait</th></tr></thead>
                <tbody>
                  {selectedClientBranches.map((branch) => (
                    <tr key={String(branch.id || branch.branchId || '')}>
                      <td>{getBranchName(branch)}</td>
                      <td>{getBranchCity(branch)}</td>
                      <td>{branch.workingHours || '-'}</td>
                      <td><span className="badge">{branch.status || 'ACTIVE'}</span></td>
                      <td>{branch.counters ?? '-'}</td>
                      <td>{branch.waiting ?? '-'}</td>
                      <td>{branch.averageWaitTime || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )
  }

  function renderClientsManagement() {
    return (
      <>
        <div className="admin-header-row">
          <div>
            <h2>Client Management</h2>
            <p className="page-subtitle">Create clients and monitor their branches and working process in one place.</p>
          </div>
          <button type="button" onClick={() => setShowCreateClient((prev) => !prev)}>{showCreateClient ? 'Close Form' : '+ Create Client'}</button>
        </div>

        {renderCreateClientForm()}
        {renderClientsTable()}
        {renderSelectedClientDetail()}
      </>
    )
  }

  function renderReports() {
    return (
      <>
        <h2>Reports</h2>
        {renderOverviewCards()}
        {renderServiceAnalytics()}
        {renderPeakHours()}
      </>
    )
  }

  function renderDatabase() {
    const counts = databaseSnapshot.counts || {}

    return (
      <>
        <div className="admin-header-row">
          <div>
            <h2>Database</h2>
            <p className="page-subtitle">Live data retrieved from qsmart_db through the backend API.</p>
          </div>
          <button type="button" onClick={loadDatabaseData}>Refresh Data</button>
        </div>

        <div className="stats-grid">
          {databaseTables.map((table) => (
            <div className="stat-card" key={table.key}>
              <p>{table.title}</p>
              <h3>{counts[table.key] ?? 0}</h3>
            </div>
          ))}
        </div>

        {databaseTables.map((table) => {
          const rows = Array.isArray(databaseSnapshot[table.key]) ? databaseSnapshot[table.key] : []

          return (
            <div className="table-card" key={table.key}>
              <h3>{table.title}</h3>
              <div className="admin-table-scroll">
                <table className="common-table">
                  <thead>
                    <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((row, index) => (
                      <tr key={`${table.key}-${row.id || index}`}>
                        {table.columns.map((column) => <td key={column}>{formatCellValue(row[column])}</td>)}
                      </tr>
                    )) : (
                      <tr><td colSpan={table.columns.length}>No rows found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <section className="dashboard-page">
      <aside className="dash-sidebar">
        <h3>Admin Panel</h3>
        <ul>
          <li><button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button></li>
          <li><button className={activeTab === 'clients' ? 'active' : ''} onClick={() => setActiveTab('clients')}>Clients</button></li>
          <li><button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>Reports</button></li>
          <li><button className={activeTab === 'database' ? 'active' : ''} onClick={() => setActiveTab('database')}>Database</button></li>
        </ul>
      </aside>

      <div className="dash-main">
        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'clients' ? renderClientsManagement() : null}
        {activeTab === 'reports' ? renderReports() : null}
        {activeTab === 'database' ? renderDatabase() : null}

        {loading ? <p className="status-message">Loading admin data...</p> : null}
        {error ? <p className="status-message error-text">{error}</p> : null}
        {message ? <p className="status-message success-text">{message}</p> : null}
      </div>
    </section>
  )
}

export default AdminDashboard
