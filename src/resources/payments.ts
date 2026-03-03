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
  const availableNetworks = raw.available_networks as Array<Record<string, unknown>> | undefined
  return {
    id: raw.id,
    address: raw.address ?? null,
    amount: raw.amount,
    network: raw.network ?? null,
    token: raw.token ?? null,
    status: raw.status,
    expiresAt: raw.expires_at,
    externalOrderId: raw.external_order_id,
    qrCode: raw.qr_code,
    notice: raw.notice,
    originalAmount: raw.original_amount,
    requiresTxid: raw.requires_txid,
    confirmEndpoint: raw.confirm_endpoint,
    awaitingNetwork: raw.awaiting_network,
    paymentUrl: raw.payment_url,
    availableNetworks: availableNetworks?.map((n) => ({
      network: n.network,
      name: n.name,
      tokens: n.tokens,
    })),
  }
}

function mapPaymentListItem(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    externalRef: raw.external_ref,
    externalOrderId: raw.external_order_id,
    network: raw.network ?? null,
    token: raw.token ?? null,
    address: raw.address ?? null,
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
    address: raw.address ?? null,
    network: raw.network ?? null,
    token: raw.token ?? null,
    txHash: raw.tx_hash,
    expiresAt: raw.expires_at,
    awaitingNetwork: raw.awaiting_network,
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
    const body: Record<string, unknown> = {
      amount: params.amount,
      external_ref: params.externalRef,
    }
    // Only send network/token if explicitly provided
    if (params.network != null) body.network = params.network
    if (params.token != null) body.token = params.token
    if (params.externalOrderId != null) body.external_order_id = params.externalOrderId
    if (params.address != null) body.address = params.address
    if (params.expiresIn != null) body.expires_in = params.expiresIn
    if (params.metadata != null) body.metadata = params.metadata

    const raw = await this.client.post<Record<string, unknown>>('/v1/payments', body)
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
    const path = `/v1/payments${qs ? `?${qs}` : ''}`
    const raw = await this.client.get<Record<string, unknown>>(path)
    const payments = raw.payments as Array<Record<string, unknown>>

    return {
      success: true,
      payments: payments.map(mapPaymentListItem),
    } as ListPaymentsResponse
  }

  async get(id: string): Promise<GetPaymentResponse> {
    const raw = await this.client.get<Record<string, unknown>>(`/v1/payments/${encodeURIComponent(id)}`)
    return {
      success: true,
      payment: mapPaymentDetail(raw.payment as Record<string, unknown>),
    } as GetPaymentResponse
  }

  async cancel(id: string): Promise<CancelPaymentResponse> {
    const raw = await this.client.patch<Record<string, unknown>>(
      `/v1/payments/${encodeURIComponent(id)}`,
      { status: 'cancelled' }
    )
    const p = raw.payment as Record<string, unknown>
    return {
      success: true,
      payment: {
        id: p.id as string,
        status: 'cancelled',
        expectedAmount: p.expected_amount as string,
        address: p.address ?? null,
        network: p.network ?? null,
        token: p.token ?? null,
        expiresAt: p.expires_at as string,
      },
    } as CancelPaymentResponse
  }

  async confirm(id: string, txHash: string): Promise<ConfirmPaymentResponse> {
    const raw = await this.client.post<Record<string, unknown>>(
      `/v1/payments/${encodeURIComponent(id)}/confirm`,
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
