// src/lib/api.ts
/// <reference types="vite/client" />
const BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

export interface BillItem {
  id?: number
  buyer_name: string
  item_name: string
  bags: number
  rate: number
  total?: number
}

export interface Bill {
  id: number
  patti_name: string
  date: string
  serial_number: number
  total_bags: number
  total_amount: number
  commission: number
  cooli: number
  chariti: number
  transport: number
  net_amount: number
  is_paid: number   // 0 = unpaid, 1 = paid
  is_printed: number
  created_at?: string
  items?: BillItem[]
}

export interface Settings {
  id?: number
  company_name: string
  phone: string
  address: string
  commission_rate: number
  cooli_per_bag: number
  chariti_per_bag: number
}

export interface DashboardTier {
  total_bills: number
  total_bags: number
  total_amount: number
  total_commission: number
  total_cooli: number
  total_chariti: number
  total_transport: number
  total_net: number
  bills?: Bill[]
}

export interface DashboardStats {
  today: DashboardTier
  month: DashboardTier
  year: DashboardTier
  custom?: DashboardTier
}

export interface BuyerDetails {
  buyer_name: string
  patti_name: string
  item_name: string
  bags: number
  rate: number
  amount: number
  date: string
}

export interface BuyerPurchase {
  buyer_name: string
  patti_name: string
  item_name: string
  total_bags: number
  total_amount: number
  bill_count: number
}

export interface PattiPurchase {
  id: number
  patti_name: string
  date: string
  serial_number: number
  total_bags: number
  total_amount: number
  net_amount: number
}

export interface Contact {
  id: number
  name: string
  email: string
  phone: string
  message: string
  created_at: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_username?: string
  new_password?: string
  confirm_password?: string
}

export interface ChangePasswordResponse {
  success: boolean
  token: string
  username: string
  message: string
}

export interface BuyerPayment {
  id: number
  buyer_name: string
  date: string
  entry_type: 'credit' | 'debit'
  amount: number
  description: string
  created_at?: string
}

export interface BuyerLedgerEntry {
  id: number
  buyer_name: string
  date: string
  description: string
  type: 'debit' | 'credit'
  amount: number
  ref_type: 'patti' | 'payment'
  ref_id: number
  running_balance?: number
  created_at?: string
}

export interface BuyerLedgerResponse {
  entries: BuyerLedgerEntry[]
  total_debit: number
  total_credit: number
  balance: number
  prev_balance: number
  buyers: string[]
}

export interface BuyerBalanceResponse {
  prev_balance: number
  patti_amount: number
  current_balance: number
  found: boolean
}

// Map of buyer_name → hamali amount
export type BuyerHamaliMap = Record<string, number>

// ─── Core ───────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

// ─── API ────────────────────────────────────────────────────────────────────

export const api = {
  isAuthenticated: () => !!getToken(),
  logout: () => localStorage.removeItem('admin_token'),

  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }).then((d) => {
      localStorage.setItem('admin_token', d.token)
      return d
    }),

  changePassword: (data: ChangePasswordPayload) =>
    request<ChangePasswordResponse>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((d) => {
      localStorage.setItem('admin_token', d.token)
      return d
    }),

  // Bills
  getBills: (date?: string) =>
    request<Bill[]>(`/bills${date ? `?date=${date}` : ''}`),
  getBill: (id: number) =>
    request<Bill>(`/bills/${id}`),
  createBill: (data: Partial<Bill>) =>
    request<Bill>('/bills', { method: 'POST', body: JSON.stringify(data) }),
  updateBill: (id: number, data: Partial<Bill>) =>
    request<Bill>(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBill: (id: number) =>
    request<{ success: boolean }>(`/bills/${id}`, { method: 'DELETE' }),

  // Toggle paid status
  toggleBillPaid: (id: number, isPaid: boolean) =>
    request<{ success: boolean; is_paid: number }>(`/bills/${id}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ is_paid: isPaid ? 1 : 0 }),
    }),

  // Toggle printed status
    toggleBillPrinted: (id: number, isPrinted: boolean) =>
    request<{ success: boolean; is_printed: number }>(`/bills/${id}/printed`, {
      method: 'PATCH',
      body: JSON.stringify({ is_printed: isPrinted ? 1 : 0 }),
    }),

  // Serial search
  getBillBySerial: (serial: string) =>
    request<Bill>(`/bills?serial=${serial}`),

  // Dashboard
  getDashboardStats: (params: { date?: string; from?: string; to?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return request<DashboardStats>(`/dashboard/stats${q ? `?${q}` : ''}`)
  },

  // Buyers — LIKE search
  getBuyerPurchases: (params: { buyer?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString()
    return request<BuyerDetails[]>(`/buyers/purchases${q ? `?${q}` : ''}`)
  },

  // Buyer details — EXACT match
  getBuyerDetails: (params: { buyer?: string; from?: string; to?: string; exact?: string }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString()
    return request<BuyerDetails[]>(`/buyers/purchases${q ? `?${q}` : ''}`)
  },

  getPattiPurchases: (params: { patti?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString()
    return request<PattiPurchase[]>(`/patti/purchases${q ? `?${q}` : ''}`)
  },

  // Sales (public)
  getTopSales: () => request<any[]>('/sales/top'),

  // Settings
  getSettings: () => request<Settings>('/settings'),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Contacts
  getContacts: () => request<Contact[]>('/contacts'),
  submitContact: (data: { name: string; email?: string; phone?: string; message: string }) =>
    request<{ success: boolean }>('/contacts', { method: 'POST', body: JSON.stringify(data) }),

  // ── Buyer Hamali ────────────────────────────────────────────────────────
  getBuyerHamaliMap: () =>
    request<BuyerHamaliMap>('/buyer-hamali'),
  getBuyerHamali: (buyer: string) =>
    request<{ buyer_name: string; hamali: number }>(`/buyer-hamali?buyer=${encodeURIComponent(buyer)}`),
  setBuyerHamali: (buyer_name: string, hamali: number) =>
    request<{ buyer_name: string; hamali: number }>('/buyer-hamali', {
      method: 'POST',
      body: JSON.stringify({ buyer_name, hamali }),
    }),

  // ── Buyer Payments ──────────────────────────────────────────────────────
  getBuyerPayments: (params: { buyer?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString()
    return request<BuyerPayment[]>(`/buyer-payments${q ? `?${q}` : ''}`)
  },
  createBuyerPayment: (data: Partial<BuyerPayment>) =>
    request<BuyerPayment>('/buyer-payments', { method: 'POST', body: JSON.stringify(data) }),
  updateBuyerPayment: (id: number, data: Partial<BuyerPayment>) =>
    request<BuyerPayment>(`/buyer-payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBuyerPayment: (id: number) =>
    request<{ success: boolean }>(`/buyer-payments/${id}`, { method: 'DELETE' }),

  // ── Buyer Ledger ────────────────────────────────────────────────────────
  getBuyerLedger: (params: { buyer?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString()
    return request<BuyerLedgerResponse>(`/buyer-ledger${q ? `?${q}` : ''}`)
  },

  // ── Buyer Balance (for print) ───────────────────────────────────────────
  getBuyerBalance: (buyer: string, billId: number) =>
    request<BuyerBalanceResponse>(`/buyer-balance?buyer=${encodeURIComponent(buyer)}&bill_id=${billId}`),
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatCurrency(n: number | string): string {
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  const dd   = String(day).padStart(2, '0')
  const mm   = String(m).padStart(2, '0')
  return `${dd}-${mm}-${y}`
}

// ─── BILL CALCULATION ────────────────────────────────────────────────────────

export function calcBill(
  items: BillItem[],
  totalBags: number,
  settings: Settings,
  cooli = 0,
  chariti = 0,
  transport = 0
) {
  const totalAmount = Math.floor(
    items.reduce((s, i) => s + Number(i.bags) * Number(i.rate), 0)
  )
  const commission  = Math.floor((totalAmount * Number(settings.commission_rate)) / 1000)
  const transportAmt = Math.floor(Number(transport))
  const netAmount   = Math.floor(
    totalAmount - commission - Number(cooli) - Number(chariti) - transportAmt
  )
  return { totalAmount, commission, transport: transportAmt, netAmount }
}