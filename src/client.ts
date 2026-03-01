import type { ApiErrorBody, PayzCoreOptions } from './types'
import {
  PayzCoreError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  IdempotencyError,
} from './errors'

const DEFAULT_BASE_URL = 'https://api.payzcore.com'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 2
const RETRY_BASE_MS = 200

export class HttpClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly maxRetries: number
  private readonly useMasterKey: boolean

  constructor(apiKey: string, options: PayzCoreOptions = {}) {
    this.apiKey = apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.useMasterKey = options.masterKey ?? false
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const bodyStr = body != null ? JSON.stringify(body) : ''
    const headers: Record<string, string> = {
      'User-Agent': '@payzcore/node/1.1.5',
    }
    if (body != null) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.useMasterKey) {
      headers['x-master-key'] = this.apiKey
    } else {
      headers['x-api-key'] = this.apiKey
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
      }

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: bodyStr || undefined,
          signal: AbortSignal.timeout(this.timeout),
        })

        if (response.ok) {
          return (await response.json()) as T
        }

        // Non-retryable errors — throw immediately
        if (response.status < 500 && response.status !== 429) {
          await throwApiError(response)
        }

        // 429 — don't retry
        if (response.status === 429) {
          await throwApiError(response)
        }

        // 5xx — retry if attempts remain
        lastError = await buildApiError(response)
      } catch (err) {
        if (
          err instanceof PayzCoreError ||
          err instanceof AuthenticationError ||
          err instanceof ForbiddenError ||
          err instanceof NotFoundError ||
          err instanceof ValidationError ||
          err instanceof RateLimitError ||
          err instanceof IdempotencyError
        ) {
          throw err
        }

        // Network / timeout errors — retry
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }

    throw lastError ?? new PayzCoreError('Request failed after retries', 0, 'network_error')
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throwApiError(response: Response): Promise<never> {
  throw await buildApiError(response)
}

async function buildApiError(response: Response): Promise<PayzCoreError> {
  let body: ApiErrorBody
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = { error: response.statusText || 'Unknown error' }
  }

  const message = body.error ?? 'Unknown error'

  switch (response.status) {
    case 400:
      return new ValidationError(message, body.details)
    case 401:
      return new AuthenticationError(message)
    case 403:
      return new ForbiddenError(message)
    case 404:
      return new NotFoundError(message)
    case 409:
      return new IdempotencyError(message)
    case 429: {
      const resetHeader = response.headers.get('X-RateLimit-Reset')
      const dailyHeader = response.headers.get('X-RateLimit-Daily')
      const retryAfter = resetHeader ? parseInt(resetHeader, 10) : null
      const isDaily = dailyHeader === 'true'
      return new RateLimitError(message, retryAfter, isDaily)
    }
    default:
      return new PayzCoreError(message, response.status, 'api_error')
  }
}
