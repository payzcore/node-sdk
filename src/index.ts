import { HttpClient } from './client'
import { Payments } from './resources/payments'
import { Projects } from './resources/projects'
import type { PayzCoreOptions } from './types'

export class PayzCore {
  readonly payments: Payments
  readonly projects: Projects

  constructor(apiKey: string, options: PayzCoreOptions = {}) {
    if (!apiKey) {
      throw new Error('PayzCore API key is required. Pass your pk_live_xxx or mk_xxx key.')
    }

    const client = new HttpClient(apiKey, options)
    this.payments = new Payments(client)
    this.projects = new Projects(client)
  }
}

export default PayzCore

// Webhook utilities
export { verifyWebhookSignature, constructEvent, parseWebhook, SUPPORTED_NETWORKS, SUPPORTED_TOKENS } from './webhook'

// Error classes
export {
  PayzCoreError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  IdempotencyError,
  WebhookSignatureError,
} from './errors'

// Types
export type {
  Network,
  Token,
  PaymentStatus,
  WebhookEventType,
  PayzCoreOptions,
  CreatePaymentParams,
  Payment,
  CreatePaymentResponse,
  PaymentListItem,
  ListPaymentsParams,
  ListPaymentsResponse,
  Transaction,
  PaymentDetail,
  GetPaymentResponse,
  CancelPaymentResponse,
  ConfirmPaymentResponse,
  CreateProjectParams,
  Project,
  CreateProjectResponse,
  ProjectListItem,
  ListProjectsResponse,
  AvailableNetwork,
  WebhookPayload,
} from './types'
