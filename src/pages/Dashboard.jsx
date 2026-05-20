import { useEffect, useState } from 'react'
import {
  getClients,
  getBranchesByClient,
  getServicesByBranch,
  bookToken
} from '../api/dashboardApi.jsx'

function Dashboard() {
  const [clients, setClients] = useState([])
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true)
        setError('')
        const data = await getClients()
        setClients(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [])

  async function handleClientChange(event) {
    const clientId = event.target.value
    setSelectedClientId(clientId)
    setSelectedBranchId('')
    setSelectedServiceId('')
    setBranches([])
    setServices([])
    setSuccessMessage('')

    if (!clientId) return

    try {
      setLoading(true)
      setError('')
      const data = await getBranchesByClient(clientId)
      setBranches(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBranchChange(event) {
    const branchId = event.target.value
    setSelectedBranchId(branchId)
    setSelectedServiceId('')
    setServices([])
    setSuccessMessage('')

    if (!branchId) return

    try {
      setLoading(true)
      setError('')
      const data = await getServicesByBranch(branchId)
      setServices(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBookToken() {
    if (!selectedClientId || !selectedBranchId || !selectedServiceId) {
      setError('Please select client, branch, and service.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const result = await bookToken({
        clientId: selectedClientId,
        branchId: selectedBranchId,
        serviceId: selectedServiceId
      })
      setSuccessMessage(`Token booked successfully. Token No: ${result.tokenNumber || 'N/A'}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <h2>User Dashboard</h2>

      <div className="dashboard-field">
        <label>1. Select Client</label>
        <select value={selectedClientId} onChange={handleClientChange}>
          <option value="">Choose client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-field">
        <label>2. Select Branch</label>
        <select
          value={selectedBranchId}
          onChange={handleBranchChange}
          disabled={!selectedClientId}
        >
          <option value="">Choose branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-field">
        <label>3. Select Service</label>
        <select
          value={selectedServiceId}
          onChange={(event) => setSelectedServiceId(event.target.value)}
          disabled={!selectedBranchId}
        >
          <option value="">Choose service</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="book-btn" onClick={handleBookToken} disabled={loading}>
        4. Book Token
      </button>

      {loading ? <p className="status-text">Loading...</p> : null}
      {error ? <p className="status-text error-text">{error}</p> : null}
      {successMessage ? <p className="status-text success-text">{successMessage}</p> : null}
    </section>
  )
}

export default Dashboard
