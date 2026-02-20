import type { HttpClient } from '../client'
import type {
  CreatePaymentParams,
  CreatePaymentResponse,
  ListPaymentsParams,
  ListPaymentsResponse,
  GetPaymentResponse,
  CancelPaymentResponse,
  ConfirmPaymentResponse,
} from '../types'

// Map snake_case API response to camelCase SDK types
function mapPayment(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    address: raw.address,
    amount: raw.amount,
    chain: raw.chain,
    token: raw.token ?? 'USDT',
    status: raw.status,
    expiresAt: raw.expires_at,
    externalOrderId: raw.external_order_id,
    qrCode: raw.qr_code,
    notice: raw.notice,
    originalAmount: raw.original_amount,
    requiresTxid: raw.requires_txid,
    confirmEndpoint: raw.confirm_endpoint,
  }
}

function mapPaymentListItem(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    externalRef: raw.external_ref,
    externalOrderId: raw.external_order_id,
    chain: raw.chain,
    token: raw.token ?? 'USDT',
    address: raw.address,
    expectedAmount: raw.expected_amount,
    paidAmount: raw.paid_amount,
    status: raw.status,
    txHash: raw.tx_hash,
    expiresAt: raw.expires_at,
    paidAt: raw.paid_at,
    createdAt: raw.created_at,
  }
}

function mapPaymentDetail(raw: Record<string, unknown>) {
  const txs = raw.transactions as Array<Record<string, unknown>> | undefined
  return {
    id: raw.id,
    status: raw.status,
    expectedAmount: raw.expected_amount,
    paidAmount: raw.paid_amount,
    address: raw.address,
    chain: raw.chain,
    token: raw.token ?? 'USDT',
    txHash: raw.tx_hash,
    expiresAt: raw.expires_at,
    transactions: (txs ?? []).map((t) => ({
      txHash: t.tx_hash,
      amount: t.amount,
      from: t.from,
      confirmed: t.confirmed,
      confirmations: (t.confirmations as number) ?? 0,
    })),
  }
}

export class Payments {
  constructor(private readonly client: HttpClient) {}

  async create(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    const body = {
      amount: params.amount,
      chain: params.chain,
      token: params.token,
      external_ref: params.externalRef,
      external_order_id: params.externalOrderId,
      address: params.address,
      expires_in: params.expiresIn,
      metadata: params.metadata,
    }

    const raw = await this.client.post<Record<string, unknown>>('/api/v1/payments', body)
    return {
      success: true,
      existing: raw.existing as boolean,
      payment: mapPayment(raw.payment as Record<string, unknown>),
    } as CreatePaymentResponse
  }

  async list(params: ListPaymentsParams = {}): Promise<ListPaymentsResponse> {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.limit != null) searchParams.set('limit', String(params.limit))
    if (params.offset != null) searchParams.set('offset', String(params.offset))

    const qs = searchParams.toString()
    const path = `/api/v1/payments${qs ? `?${qs}` : ''}`
    const raw = await this.client.get<Record<string, unknown>>(path)
    const payments = raw.payments as Array<Record<string, unknown>>

    return {
      success: true,
      payments: payments.map(mapPaymentListItem),
    } as ListPaymentsResponse
  }

  async get(id: string): Promise<GetPaymentResponse> {
    const raw = await this.client.get<Record<string, unknown>>(`/api/v1/payments/${encodeURIComponent(id)}`)
    return {
      success: true,
      payment: mapPaymentDetail(raw.payment as Record<string, unknown>),
    } as GetPaymentResponse
  }

  async cancel(id: string): Promise<CancelPaymentResponse> {
    const raw = await this.client.patch<Record<string, unknown>>(
      `/api/v1/payments/${encodeURIComponent(id)}`,
      { status: 'cancelled' }
    )
    const p = raw.payment as Record<string, unknown>
    return {
      success: true,
      payment: {
        id: p.id as string,
        status: 'cancelled',
        expectedAmount: p.expected_amount as string,
        address: p.address as string,
        chain: p.chain,
        token: p.token as string,
        expiresAt: p.expires_at as string,
      },
    } as CancelPaymentResponse
  }

  async confirm(id: string, txHash: string): Promise<ConfirmPaymentResponse> {
    const raw = await this.client.post<Record<string, unknown>>(
      `/api/v1/payments/${encodeURIComponent(id)}/confirm`,
      { tx_hash: txHash }
    )
    return {
      success: true,
      status: raw.status,
      verified: raw.verified,
      amountReceived: raw.amount_received,
      amountExpected: raw.amount_expected,
      message: raw.message,
    } as ConfirmPaymentResponse
  }
}
