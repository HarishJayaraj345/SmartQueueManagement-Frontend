const now = new Date()
const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60 * 1000).toISOString()

export const demoClients = [
  {
    id: 'client-1',
    clientId: 'client-1',
    name: 'MediCare City Hospital',
    clientName: 'MediCare City Hospital',
    clientType: 'Hospital',
    type: 'Hospital',
    email: 'operations@medicarecity.com',
    contactEmail: 'operations@medicarecity.com',
    phoneNumber: '9876543210',
    contactPhone: '9876543210',
    headOfficeCity: 'Chennai',
    status: 'ACTIVE',
    createdAt: '2026-04-02'
  },
  {
    id: 'client-2',
    clientId: 'client-2',
    name: 'Nova Diagnostics',
    clientName: 'Nova Diagnostics',
    clientType: 'Diagnostic',
    type: 'Diagnostic',
    email: 'frontdesk@novadiagnostics.com',
    contactEmail: 'frontdesk@novadiagnostics.com',
    phoneNumber: '9988776655',
    contactPhone: '9988776655',
    headOfficeCity: 'Bengaluru',
    status: 'ACTIVE',
    createdAt: '2026-04-12'
  },
  {
    id: 'client-3',
    clientId: 'client-3',
    name: 'CityCare Clinic',
    clientName: 'CityCare Clinic',
    clientType: 'Clinic',
    type: 'Clinic',
    email: 'hello@citycareclinic.com',
    contactEmail: 'hello@citycareclinic.com',
    phoneNumber: '9123456780',
    contactPhone: '9123456780',
    headOfficeCity: 'Hyderabad',
    status: 'ACTIVE',
    createdAt: '2026-04-18'
  }
]

export const demoBranches = [
  {
    id: 'branch-1',
    branchId: 'branch-1',
    clientId: 'client-1',
    name: 'Anna Nagar Main Branch',
    branchName: 'Anna Nagar Main Branch',
    city: 'Chennai',
    location: 'Anna Nagar, Chennai',
    workingHours: '08:00 AM - 08:00 PM',
    seatingCapacity: 72,
    status: 'ACTIVE',
    counters: 5,
    waiting: 18,
    serving: 4,
    averageWaitTime: 14,
    completedToday: 126
  },
  {
    id: 'branch-2',
    branchId: 'branch-2',
    clientId: 'client-1',
    name: 'Tambaram Care Center',
    branchName: 'Tambaram Care Center',
    city: 'Chennai',
    location: 'Tambaram, Chennai',
    workingHours: '09:00 AM - 07:00 PM',
    seatingCapacity: 45,
    status: 'ACTIVE',
    counters: 4,
    waiting: 12,
    serving: 3,
    averageWaitTime: 11,
    completedToday: 86
  },
  {
    id: 'branch-3',
    branchId: 'branch-3',
    clientId: 'client-2',
    name: 'Indiranagar Lab Hub',
    branchName: 'Indiranagar Lab Hub',
    city: 'Bengaluru',
    location: 'Indiranagar, Bengaluru',
    workingHours: '07:00 AM - 09:00 PM',
    seatingCapacity: 38,
    status: 'ACTIVE',
    counters: 3,
    waiting: 9,
    serving: 2,
    averageWaitTime: 9,
    completedToday: 74
  },
  {
    id: 'branch-4',
    branchId: 'branch-4',
    clientId: 'client-3',
    name: 'Hitech City Clinic Desk',
    branchName: 'Hitech City Clinic Desk',
    city: 'Hyderabad',
    location: 'Hitech City, Hyderabad',
    workingHours: '08:30 AM - 06:30 PM',
    seatingCapacity: 30,
    status: 'READY',
    counters: 2,
    waiting: 5,
    serving: 1,
    averageWaitTime: 8,
    completedToday: 42
  }
]

export const demoServices = [
  {
    id: 'service-1',
    serviceId: 'service-1',
    branchId: 'branch-1',
    name: 'General Consultation',
    serviceName: 'General Consultation',
    description: 'Doctor consultation queue',
    estimatedTime: '15 mins',
    estimatedWaitMinutes: 18,
    waitingCount: 12,
    currentServingToken: 'A-118'
  },
  {
    id: 'service-2',
    serviceId: 'service-2',
    branchId: 'branch-1',
    name: 'Billing Counter',
    serviceName: 'Billing Counter',
    description: 'Payment and invoice queue',
    estimatedTime: '8 mins',
    estimatedWaitMinutes: 9,
    waitingCount: 6,
    currentServingToken: 'B-044'
  },
  {
    id: 'service-3',
    serviceId: 'service-3',
    branchId: 'branch-1',
    name: 'Pharmacy Counter',
    serviceName: 'Pharmacy Counter',
    description: 'Medicine collection queue',
    estimatedTime: '12 mins',
    estimatedWaitMinutes: 14,
    waitingCount: 8,
    currentServingToken: 'P-071'
  },
  {
    id: 'service-4',
    serviceId: 'service-4',
    branchId: 'branch-2',
    name: 'Lab Sample Collection',
    serviceName: 'Lab Sample Collection',
    description: 'Sample collection desk',
    estimatedTime: '10 mins',
    estimatedWaitMinutes: 11,
    waitingCount: 7,
    currentServingToken: 'L-032'
  },
  {
    id: 'service-5',
    serviceId: 'service-5',
    branchId: 'branch-3',
    name: 'Blood Test Collection',
    serviceName: 'Blood Test Collection',
    description: 'Diagnostic sample queue',
    estimatedTime: '9 mins',
    estimatedWaitMinutes: 10,
    waitingCount: 9,
    currentServingToken: 'N-055'
  },
  {
    id: 'service-6',
    serviceId: 'service-6',
    branchId: 'branch-4',
    name: 'Doctor Consultation',
    serviceName: 'Doctor Consultation',
    description: 'Clinic consultation desk',
    estimatedTime: '13 mins',
    estimatedWaitMinutes: 8,
    waitingCount: 5,
    currentServingToken: 'C-018'
  }
]

export const demoUserTokens = [
  {
    id: 'token-1',
    tokenNumber: 'A-124',
    clientName: 'MediCare City Hospital',
    branchName: 'Anna Nagar Main Branch',
    serviceName: 'General Consultation',
    status: 'WAITING',
    bookedAt: minutesAgo(14),
    proofCode: 'QSM-A124-MEDCARE'
  },
  {
    id: 'token-2',
    tokenNumber: 'B-046',
    clientName: 'MediCare City Hospital',
    branchName: 'Anna Nagar Main Branch',
    serviceName: 'Billing Counter',
    status: 'SERVING',
    bookedAt: minutesAgo(38),
    proofCode: 'QSM-B046-BILLING'
  }
]

export const demoClientProfile = {
  clientId: 'client-1',
  clientName: 'MediCare City Hospital',
  clientType: 'Hospital',
  logoUrl: '',
  logoText: 'MC',
  logoColor: '#2f6f73'
}

export const demoCounters = [
  {
    id: 'counter-1',
    counterId: 'counter-1',
    branchId: 'branch-1',
    branchName: 'Anna Nagar Main Branch',
    name: 'Consultation Desk 1',
    counterName: 'Consultation Desk 1',
    serviceName: 'General Consultation',
    type: 'Service',
    status: 'ACTIVE'
  },
  {
    id: 'counter-2',
    counterId: 'counter-2',
    branchId: 'branch-1',
    branchName: 'Anna Nagar Main Branch',
    name: 'Billing Counter 2',
    counterName: 'Billing Counter 2',
    serviceName: 'Billing Counter',
    type: 'Billing',
    status: 'ACTIVE'
  },
  {
    id: 'counter-3',
    counterId: 'counter-3',
    branchId: 'branch-2',
    branchName: 'Tambaram Care Center',
    name: 'Lab Desk',
    counterName: 'Lab Desk',
    serviceName: 'Lab Sample Collection',
    type: 'Service',
    status: 'ACTIVE'
  }
]

export const demoQueue = [
  {
    id: 'queue-1',
    tokenNumber: 'A-118',
    status: 'SERVING',
    userFullName: 'Rahul Kumar',
    userPhoneNumber: '9876501234',
    createdAt: minutesAgo(26)
  },
  {
    id: 'queue-2',
    tokenNumber: 'A-119',
    status: 'WAITING',
    userFullName: 'Meena Iyer',
    userPhoneNumber: '9876502244',
    createdAt: minutesAgo(19)
  },
  {
    id: 'queue-3',
    tokenNumber: 'A-120',
    status: 'WAITING',
    userFullName: 'Arjun Das',
    userPhoneNumber: '9876503321',
    createdAt: minutesAgo(12)
  },
  {
    id: 'queue-4',
    tokenNumber: 'A-117',
    status: 'COMPLETED',
    userFullName: 'Priya Menon',
    userPhoneNumber: '9876508899',
    createdAt: minutesAgo(44)
  }
]

export const demoOverview = {
  totalWaitingTokens: 44,
  totalServingTokens: 10,
  totalCompletedTokens: 328,
  totalCancelledTokens: 7
}

export const demoBranchPerformance = demoBranches.map((branch) => ({
  branchId: branch.id,
  branchName: branch.branchName,
  activeCounters: branch.counters,
  waitingTokens: branch.waiting,
  serving: branch.serving,
  averageServiceTime: branch.averageWaitTime,
  totalTokensProcessed: branch.completedToday
}))

export const demoServiceAnalytics = [
  { serviceId: 'service-1', serviceName: 'General Consultation', totalTokens: 138, averageServiceTime: '14 min' },
  { serviceId: 'service-2', serviceName: 'Billing Counter', totalTokens: 96, averageServiceTime: '8 min' },
  { serviceId: 'service-3', serviceName: 'Pharmacy Counter', totalTokens: 82, averageServiceTime: '12 min' },
  { serviceId: 'service-4', serviceName: 'Lab Sample Collection', totalTokens: 74, averageServiceTime: '10 min' },
  { serviceId: 'service-5', serviceName: 'Blood Test Collection', totalTokens: 64, averageServiceTime: '9 min' }
]

export const demoPeakHours = [
  { hour: '08 AM', tokenCount: 32 },
  { hour: '09 AM', tokenCount: 58 },
  { hour: '10 AM', tokenCount: 76 },
  { hour: '11 AM', tokenCount: 91 },
  { hour: '12 PM', tokenCount: 68 },
  { hour: '01 PM', tokenCount: 44 },
  { hour: '02 PM', tokenCount: 63 },
  { hour: '03 PM', tokenCount: 88 },
  { hour: '04 PM', tokenCount: 73 },
  { hour: '05 PM', tokenCount: 51 }
]

export const demoSummary = {
  message: 'Queue flow is stable across active branches with Anna Nagar carrying the highest consultation load.',
  overview: demoOverview
}

export const demoDatabaseSnapshot = {
  counts: {
    users: 245,
    clients: demoClients.length,
    branches: demoBranches.length,
    services: demoServices.length,
    counters: demoCounters.length,
    queueTokens: 389,
    queueRules: 8,
    addresses: 4
  },
  users: [
    { id: 1, fullName: 'Demo User', email: 'demo@qsmart.app', phoneNumber: '9876543210', role: 'USER', clientName: '-', createdAt: '2026-05-12' },
    { id: 2, fullName: 'Client Manager', email: 'client@qsmart.app', phoneNumber: '9876500001', role: 'CLIENT', clientName: 'MediCare City Hospital', createdAt: '2026-05-10' },
    { id: 3, fullName: 'Admin Lead', email: 'admin@qsmart.app', phoneNumber: '9876500002', role: 'ADMIN', clientName: '-', createdAt: '2026-05-08' }
  ],
  clients: demoClients,
  branches: demoBranches,
  services: demoServices.map((service) => ({
    ...service,
    branchName: demoBranches.find((branch) => branch.id === service.branchId)?.branchName || '-',
    clientName: demoClients.find((client) => client.id === demoBranches.find((branch) => branch.id === service.branchId)?.clientId)?.clientName || '-',
    createdAt: '2026-05-01'
  })),
  counters: demoCounters.map((counter, index) => ({
    ...counter,
    counterNumber: index + 1,
    isActive: counter.status === 'ACTIVE',
    createdAt: '2026-05-03'
  })),
  queueTokens: demoQueue.map((item) => ({
    ...item,
    userEmail: `${String(item.userFullName || 'user').toLowerCase().replace(/\s+/g, '.')}@example.com`,
    serviceName: 'General Consultation',
    counterId: 'counter-1',
    completedAt: item.status === 'COMPLETED' ? minutesAgo(8) : ''
  })),
  queueRules: [
    { id: 1, ruleKey: 'MAX_DAILY_TOKENS', ruleValue: '450', branchName: 'Anna Nagar Main Branch' },
    { id: 2, ruleKey: 'AUTO_EXPIRE_MINUTES', ruleValue: '20', branchName: 'Anna Nagar Main Branch' },
    { id: 3, ruleKey: 'PRIORITY_WINDOW', ruleValue: 'Senior citizen support enabled', branchName: 'Tambaram Care Center' }
  ],
  addresses: demoBranches.map((branch, index) => ({
    id: index + 1,
    addressLine: branch.location,
    city: branch.city,
    state: branch.city === 'Bengaluru' ? 'Karnataka' : branch.city === 'Hyderabad' ? 'Telangana' : 'Tamil Nadu',
    country: 'India',
    pincode: ['600040', '600045', '560038', '500081'][index] || '600001'
  }))
}

export function getDemoBranchesByClient(clientId) {
  return demoBranches.filter((branch) => String(branch.clientId) === String(clientId))
}

export function getDemoServicesByBranch(branchId) {
  return demoServices.filter((service) => String(service.branchId) === String(branchId))
}

export function getDemoEstimatedWait(serviceId) {
  const service = demoServices.find((item) => String(item.id) === String(serviceId) || String(item.serviceId) === String(serviceId))
  if (!service) return { estimatedWaitTime: '10-15 mins', estimatedWaitMinutes: 12 }

  return {
    estimatedWaitTime: `${service.estimatedWaitMinutes} mins`,
    estimatedWaitMinutes: service.estimatedWaitMinutes
  }
}

export function getDemoLiveStatus(serviceId) {
  const service = demoServices.find((item) => String(item.id) === String(serviceId) || String(item.serviceId) === String(serviceId))

  return {
    currentServingToken: service?.currentServingToken || '-',
    waitingCount: service?.waitingCount || 0,
    statusMessage: service?.waitingCount ? 'Queue moving normally' : 'No active queue'
  }
}
