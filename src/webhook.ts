import { createHmac, timingSafeEqual } from 'crypto'
import { WebhookSignatureError } from './errors'
import type { WebhookPayload, Chain, PaymentStatus, WebhookEventType } from './types'

/** Supported blockchain networks. */
export const SUPPORTED_CHAINS = ['TRC20', 'BEP20', 'ERC20', 'POLYGON', 'ARBITRUM'] as const

/** Supported stablecoin tokens. */
export const SUPPORTED_TOKENS = ['USDT', 'USDC'] as const

/**
 * Verify a webhook signature from PayzCore.
 *
 * @param body - Raw request body string
 * @param signature - Value of X-PayzCore-Signature header
 * @param secret - Webhook secret from project creation (whsec_xxx)
 * @param options - Optional timestamp validation
 * @param options.timestamp - Value of X-PayzCore-Timestamp header
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

  // Timestamp replay protection (optional but recommended)
  if (options?.timestamp) {
    const ts = new Date(options.timestamp).getTime()
    const tolerance = options.toleranceMs ?? 5 * 60 * 1000 // ±5 minutes default
    if (isNaN(ts) || Math.abs(Date.now() - ts) > tolerance) {
      return false
    }
  }

  const expected = createHmac('sha256', secret).update(body).digest('hex')
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

/**
 * Parse a raw webhook body into a typed WebhookPayload.
 * Logs warnings for unknown chain/token values (forward-compatible).
 *
 * @param body - Raw request body string (JSON)
 * @returns Parsed webhook payload
 */
export function parseWebhook(body: string): WebhookPayload {
  const raw = JSON.parse(body) as Record<string, unknown>

  if (raw.chain && !(SUPPORTED_CHAINS as readonly string[]).includes(raw.chain as string)) {
    console.warn(`[PayzCore] Unknown chain in webhook: ${raw.chain}`)
  }
  if (raw.token && !(SUPPORTED_TOKENS as readonly string[]).includes(raw.token as string)) {
    console.warn(`[PayzCore] Unknown token in webhook: ${raw.token}`)
  }

  return {
    event: raw.event as WebhookEventType,
    paymentId: raw.payment_id as string,
    externalRef: raw.external_ref as string,
    externalOrderId: raw.external_order_id as string | undefined,
    chain: raw.chain as Chain,
    token: (raw.token as string) ?? 'USDT',
    address: raw.address as string,
    expectedAmount: raw.expected_amount as string,
    paidAmount: raw.paid_amount as string,
    txHash: raw.tx_hash as string | null,
    status: raw.status as PaymentStatus,
    paidAt: raw.paid_at as string | null,
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    timestamp: raw.timestamp as string,
  }
}

/**
 * Verify signature and parse the webhook payload.
 * Throws WebhookSignatureError if signature is invalid.
 *
 * @param body - Raw request body string
 * @param signature - Value of X-PayzCore-Signature header
 * @param secret - Webhook secret from project creation (whsec_xxx)
 * @param options - Optional timestamp validation
 * @param options.timestamp - Value of X-PayzCore-Timestamp header
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
