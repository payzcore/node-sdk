// ── Chains, Tokens & Statuses ──

export type Chain = 'TRC20' | 'BEP20' | 'ERC20' | 'POLYGON' | 'ARBITRUM'

export type Token = 'USDT' | 'USDC'

export type PaymentStatus =
  | 'pending'
  | 'confirming'
  | 'partial'
  | 'paid'
  | 'overpaid'
  | 'expired'
  | 'cancelled'

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.overpaid'
  | 'payment.partial'
  | 'payment.expired'
  | 'payment.cancelled'

// ── Client Options ──

export interface PayzCoreOptions {
  /** API base URL. Default: https://api.payzcore.com */
  baseUrl?: string
  /** Request timeout in ms. Default: 30000 */
  timeout?: number
  /** Max retries on 5xx/network errors. Default: 2 */
  maxRetries?: number
  /** Use master key auth (x-master-key header). Default: false */
  masterKey?: boolean
}

// ── Payments ──

export interface CreatePaymentParams {
  amount: number
  chain: Chain
  /** Token to monitor. Default: 'USDT' */
  token?: Token
  externalRef: string
  externalOrderId?: string
  /** Pre-assign a specific static address for this customer (dedicated mode only) */
  address?: string
  /** Expiry in seconds (300–86400). Default: 3600 */
  expiresIn?: number
  metadata?: Record<string, unknown>
}

export interface Payment {
  id: string
  address: string
  amount: string
  chain: Chain
  token: string
  status: PaymentStatus
  expiresAt: string
  externalOrderId?: string
  qrCode?: string
  /** Instructions for the payer (static wallet pool mode) */
  notice?: string
  /** Original requested amount before micro-amount adjustment */
  originalAmount?: string
  /** Whether the payer must submit their transaction hash (txid pool mode) */
  requiresTxid?: boolean
  /** Endpoint path to submit transaction hash (txid pool mode) */
  confirmEndpoint?: string
}

export interface CreatePaymentResponse {
  success: true
  existing: boolean
  payment: Payment
}

export interface PaymentListItem {
  id: string
  externalRef: string
  externalOrderId?: string
  chain: Chain
  token: string
  address: string
  expectedAmount: string
  paidAmount: string
  status: PaymentStatus
  txHash: string | null
  expiresAt: string
  paidAt: string | null
  createdAt: string
}

export interface ListPaymentsParams {
  status?: PaymentStatus
  limit?: number
  offset?: number
}

export interface ListPaymentsResponse {
  success: true
  payments: PaymentListItem[]
}

export interface Transaction {
  txHash: string
  amount: string
  from: string
  confirmed: boolean
  confirmations: number
}

export interface CancelPaymentResponse {
  success: true
  payment: {
    id: string
    status: 'cancelled'
    expectedAmount: string
    address: string
    chain: Chain
    token: string
    expiresAt: string
  }
}

export interface ConfirmPaymentResponse {
  success: true
  status: PaymentStatus
  verified: boolean
  amountReceived?: string
  amountExpected?: string
  message?: string
}

export interface PaymentDetail {
  id: string
  status: PaymentStatus
  expectedAmount: string
  paidAmount: string
  address: string
  chain: Chain
  token: string
  txHash: string | null
  expiresAt: string
  transactions: Transaction[]
}

export interface GetPaymentResponse {
  success: true
  payment: PaymentDetail
}

// ── Projects ──

export interface CreateProjectParams {
  name: string
  slug: string
  webhookUrl?: string
  metadata?: Record<string, unknown>
}

export interface Project {
  id: string
  name: string
  slug: string
  apiKey: string
  webhookSecret: string
  webhookUrl: string | null
  createdAt: string
}

export interface CreateProjectResponse {
  success: true
  project: Project
}

export interface ProjectListItem {
  id: string
  name: string
  slug: string
  apiKey: string
  webhookUrl: string | null
  isActive: boolean
  createdAt: string
}

export interface ListProjectsResponse {
  success: true
  projects: ProjectListItem[]
}

// ── Webhooks ──

export interface WebhookPayload {
  event: WebhookEventType
  paymentId: string
  externalRef: string
  externalOrderId?: string
  chain: Chain
  token: string
  address: string
  expectedAmount: string
  paidAmount: string
  txHash: string | null
  status: PaymentStatus
  paidAt: string | null
  metadata: Record<string, unknown>
  timestamp: string
}

// ── API Error Shape ──

export interface ApiErrorBody {
  error: string
  details?: Array<{ code: string; path?: string[]; message: string }>
  limit?: number
  plan?: string
}
