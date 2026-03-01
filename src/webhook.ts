import { createHmac, timingSafeEqual } from 'crypto'
import { WebhookSignatureError } from './errors'
import type { WebhookPayload, Network, PaymentStatus, WebhookEventType } from './types'

/** Supported blockchain networks. */
export const SUPPORTED_NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'POLYGON', 'ARBITRUM'] as const

/** Supported stablecoin tokens. */
export const SUPPORTED_TOKENS = ['USDT', 'USDC'] as const

/**
 * Verify a webhook signature from PayzCore.
 *
 * The signature covers `timestamp + "." + body` to bind the timestamp
 * to the payload and prevent replay attacks with modified timestamps.
 *
 * @param body - Raw request body string
 * @param signature - Value of X-PayzCore-Signature header
 * @param secret - Webhook secret from project creation (whsec_xxx)
 * @param options - Timestamp validation (required)
 * @param options.timestamp - Value of X-PayzCore-Timestamp header (required)
 * @param options.toleranceMs - Max age in ms (default: 300000 = 5 minutes)
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
  options?: { timestamp?: string; toleranceMs?: number },
): boolean {
  if (!body || !signature || !secret) return false;

  // Timestamp is required for signature verification
  const timestamp = options?.timestamp
  if (!timestamp) return false

  // Replay protection: reject stale webhooks
  const ts = new Date(timestamp).getTime()
  const tolerance = options?.toleranceMs ?? 5 * 60 * 1000 // ±5 minutes default
  if (isNaN(ts) || Math.abs(Date.now() - ts) > tolerance) {
    return false
  }

  // Signature covers timestamp + body
  const message = `${timestamp}.${body}`
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.byteLength !== expBuf.byteLength) return false
  return timingSafeEqual(sigBuf, expBuf)
}

/**
 * Parse a raw webhook body into a typed WebhookPayload.
 * Logs warnings for unknown network/token values (forward-compatible).
 *
 * @param body - Raw request body string (JSON)
 * @returns Parsed webhook payload
 */
export function parseWebhook(body: string): WebhookPayload {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(body) as Record<string, unknown>
  } catch {
    throw new WebhookSignatureError('Invalid webhook payload: malformed JSON')
  }

  if (raw.network && !(SUPPORTED_NETWORKS as readonly string[]).includes(raw.network as string)) {
    console.warn(`[PayzCore] Unknown network in webhook: ${raw.network}`)
  }
  if (raw.token && !(SUPPORTED_TOKENS as readonly string[]).includes(raw.token as string)) {
    console.warn(`[PayzCore] Unknown token in webhook: ${raw.token}`)
  }

  return {
    event: raw.event as WebhookEventType,
    paymentId: raw.payment_id as string,
    externalRef: raw.external_ref as string,
    externalOrderId: (raw.external_order_id as string | null) ?? undefined,
    network: raw.network as Network,
    token: (raw.token as string) ?? 'USDT',
    address: raw.address as string,
    expectedAmount: raw.expected_amount as string,
    paidAmount: raw.paid_amount as string,
    txHash: raw.tx_hash as string | null,
    status: raw.status as PaymentStatus,
    paidAt: raw.paid_at as string | null,
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    timestamp: raw.timestamp as string,
    // Payment link buyer fields (only present for payment link payments)
    buyerEmail: raw.buyer_email as string | null | undefined,
    buyerName: raw.buyer_name as string | null | undefined,
    buyerNote: raw.buyer_note as string | null | undefined,
    paymentLinkId: raw.payment_link_id as string | null | undefined,
    paymentLinkSlug: raw.payment_link_slug as string | null | undefined,
  }
}

/**
 * Verify signature and parse the webhook payload.
 * Throws WebhookSignatureError if signature is invalid.
 *
 * @param body - Raw request body string
 * @param signature - Value of X-PayzCore-Signature header
 * @param secret - Webhook secret from project creation (whsec_xxx)
 * @param options - Timestamp validation (required)
 * @param options.timestamp - Value of X-PayzCore-Timestamp header (required)
 * @param options.toleranceMs - Max age in ms (default: 300000 = 5 minutes)
 * @returns Parsed and typed webhook payload
 */
export function constructEvent(
  body: string,
  signature: string,
  secret: string,
  options?: { timestamp?: string; toleranceMs?: number },
): WebhookPayload {
  if (!verifyWebhookSignature(body, signature, secret, options)) {
    throw new WebhookSignatureError()
  }

  try {
    return parseWebhook(body)
  } catch {
    throw new WebhookSignatureError('Invalid webhook payload')
  }
}
