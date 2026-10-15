import type { ApiErrorBody } from './types'

export class PayzCoreError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Array<{ code: string; path?: string[]; message: string }>

  constructor(message: string, status: number, code: string, details?: ApiErrorBody['details']) {
    super(message)
    this.name = 'PayzCoreError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class AuthenticationError extends PayzCoreError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, 'authentication_error')
    this.name = 'AuthenticationError'
  }
}

export class ForbiddenError extends PayzCoreError {
  constructor(message = 'Access denied') {
    super(message, 403, 'forbidden')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends PayzCoreError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found')
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends PayzCoreError {
  constructor(
    message: string,
    details?: ApiErrorBody['details'],
  ) {
    super(message, 400, 'validation_error', details)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends PayzCoreError {
  /**
   * Absolute Unix timestamp (seconds) from `X-RateLimit-Reset` — not a duration.
   * Wait time: `Math.max(0, err.retryAfter - Math.floor(Date.now() / 1000))`.
   */
  readonly retryAfter: number | null
  readonly isDaily: boolean

  constructor(message: string, retryAfter: number | null = null, isDaily = false) {
    super(message, 429, 'rate_limit_error')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
    this.isDaily = isDaily
  }
}

/**
 * Any HTTP 409 Conflict: external_order_id reused with a different external_ref
 * or amount, cancelling a payment that is no longer pending, a tx hash already
 * used, etc. `message` has the exact reason from the API.
 */
export class IdempotencyError extends PayzCoreError {
  constructor(message = 'Conflict') {
    super(message, 409, 'idempotency_error')
    this.name = 'IdempotencyError'
  }
}

export class WebhookSignatureError extends Error {
  constructor(message = 'Webhook signature verification failed') {
    super(message)
    this.name = 'WebhookSignatureError'
  }
}
