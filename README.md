# @payzcore/node

Official Node.js SDK for the [PayzCore](https://payzcore.com) blockchain monitoring API.

Monitor incoming stablecoin transfers (USDT, USDC) across multiple chains (TRC20, BEP20, ERC20, Polygon, Arbitrum) with typed methods and automatic webhook verification.

## Important

**PayzCore is a blockchain monitoring service, not a payment processor.** All payments are sent directly to your own wallet addresses. PayzCore never holds, transfers, or has access to your funds.

- **Your wallets, your funds** — You provide your own wallet (HD xPub or static addresses). Customers pay directly to your addresses.
- **Read-only monitoring** — PayzCore watches the blockchain for incoming transactions and sends webhook notifications. That's it.
- **Protection Key security** — Sensitive operations like wallet management, address changes, and API key regeneration require a Protection Key that only you set. PayzCore cannot perform these actions without your authorization.
- **Your responsibility** — You are responsible for securing your own wallets and private keys. PayzCore provides monitoring and notification only.

## Installation

```bash
npm install @payzcore/node
```

Requires Node.js 18+. Zero runtime dependencies.

## Supported Networks & Tokens

| Network | Blockchain | Tokens |
|---------|------------|--------|
| `TRC20` | Tron | USDT |
| `BEP20` | BNB Smart Chain | USDT, USDC |
| `ERC20` | Ethereum | USDT, USDC |
| `POLYGON` | Polygon | USDT, USDC |
| `ARBITRUM` | Arbitrum One | USDT, USDC |

Token defaults to `'USDT'` if not specified, so existing code works without changes.

## Quick Start

```typescript
import PayzCore from '@payzcore/node'

const payz = new PayzCore('pk_live_xxx')

// Create a payment monitoring request (network specified)
const { payment } = await payz.payments.create({
  amount: 50,
  network: 'TRC20',
  externalRef: 'user-123',
})

console.log(payment.address) // Blockchain address to monitor
console.log(payment.amount)  // Amount with random cents (e.g. "50.07")
console.log(payment.token)   // Token name (e.g. "USDT")
console.log(payment.qrCode)  // QR code data URL

// Or let the customer choose the network on the payment page
const { payment: p } = await payz.payments.create({
  amount: 50,
  externalRef: 'user-123',
})

console.log(p.awaitingNetwork)    // true
console.log(p.paymentUrl)         // "https://app.payzcore.com/pay/xxx"
console.log(p.availableNetworks)  // [{ network: 'TRC20', name: 'Tron', tokens: ['USDT'] }, ...]
```

## Before Going Live

**Always test your setup before accepting real payments:**

1. **Verify your xPub** — In the PayzCore dashboard, click "Verify Key" when adding your wallet. Compare address #0 with your wallet app's first receiving address. They must match.
2. **Send a test payment** — Create a monitoring request for $1–5 and send the funds to the assigned address. Verify they arrive in your wallet.
3. **Test sweeping** — Send the test funds back out to confirm you control the derived addresses with your private keys.

> **Warning:** A wrong xPub key generates addresses you don't control. Funds sent to those addresses are permanently lost. PayzCore is watch-only and cannot recover funds. Please take 2 minutes to verify.

## Configuration

```typescript
const payz = new PayzCore('pk_live_xxx', {
  baseUrl: 'https://api.payzcore.com', // default
  timeout: 30000,                       // default 30s
  maxRetries: 2,                        // default 2 (retries on 5xx/network errors)
})
```

## Payments

### Create

```typescript
const { payment } = await payz.payments.create({
  amount: 50,
  network: 'TRC20',             // optional — omit to let customer choose on payment page
  token: 'USDT',              // 'USDT' | 'USDC' (optional, defaults to 'USDT')
  externalRef: 'user-123',     // your reference
  externalOrderId: 'order-456', // optional
  expiresIn: 3600,             // optional, seconds (300–86400)
  metadata: { type: 'topup' }, // optional
  address: 'Txxxx...',        // optional, static wallet dedicated mode only
})

// payment.id, payment.address, payment.amount, payment.token, payment.expiresAt, payment.qrCode
// Static wallet projects may also return: payment.notice, payment.originalAmount, payment.requiresTxid
```

> **Note:** The `address` parameter is only used with static wallet projects in dedicated mode. For HD wallet projects, this parameter is ignored.

#### USDC on Polygon Example

```typescript
const { payment } = await payz.payments.create({
  amount: 100,
  network: 'POLYGON',
  token: 'USDC',
  externalRef: 'user-456',
})
```

### List

```typescript
const { payments } = await payz.payments.list({
  status: 'paid', // optional filter
  limit: 20,      // optional, max 100
  offset: 0,      // optional
})
```

### Get

```typescript
const { payment } = await payz.payments.get('payment-uuid')

// Returns latest cached status from the database
// payment.transactions[].txHash, payment.transactions[].amount, etc.
```

### Cancel

```typescript
const { payment } = await payz.payments.cancel('payment-uuid')
// payment.status === 'cancelled'
```

### Confirm (Pool + Txid Mode)

```typescript
const result = await payz.payments.confirm('payment-uuid', 'abc123def456...')
// result.verified, result.status, result.amountReceived
```

## Projects (Admin)

Requires a master key (`mk_xxx`):

```typescript
const admin = new PayzCore('mk_xxx', { masterKey: true })

const { project } = await admin.projects.create({
  name: 'My Store',
  slug: 'my-store',
  webhookUrl: 'https://mysite.com/webhooks',
})

const { projects } = await admin.projects.list()
```

## Webhook Verification

```typescript
import { verifyWebhookSignature, constructEvent } from '@payzcore/node'

// In your webhook handler (Express, Next.js, etc.)
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-payzcore-signature')!

  // Option 1: Just verify
  const isValid = verifyWebhookSignature(body, signature, 'whsec_xxx')

  // Option 2: Verify + parse (throws WebhookSignatureError if invalid)
  const event = constructEvent(body, signature, 'whsec_xxx')

  if (event.event === 'payment.completed') {
    console.log(event.paymentId, event.paidAmount)
  }

  return new Response('ok')
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment fully received |
| `payment.overpaid` | Received more than expected |
| `payment.partial` | Partial payment received |
| `payment.expired` | Payment window expired |
| `payment.cancelled` | Payment cancelled by the merchant |

## Static Wallet Mode

When the PayzCore project is configured with a static wallet, the API works the same way but may return additional fields in the response:

| Field | Type | Description |
|-------|------|-------------|
| `notice` | `string` | Instructions for the payer (e.g. "Send exact amount") |
| `original_amount` | `string` | The original requested amount before any adjustments |
| `requires_txid` | `boolean` | Whether the payer must submit their transaction ID |

In dedicated address mode, you can specify which static address to assign to a customer using the `address` parameter on payment creation. In shared address mode, the project's single static address is used automatically.

## Error Handling

All errors extend `PayzCoreError` with `status`, `code`, and optional `details`:

```typescript
import { PayzCoreError, RateLimitError, ValidationError } from '@payzcore/node'

try {
  await payz.payments.create({ ... })
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(err.retryAfter) // Unix timestamp
    console.log(err.isDaily)    // true if daily plan limit
  } else if (err instanceof ValidationError) {
    console.log(err.details)    // field-level errors
  } else if (err instanceof PayzCoreError) {
    console.log(err.status, err.message)
  }
}
```

### Error Classes

| Class | Status | When |
|-------|--------|------|
| `AuthenticationError` | 401 | Invalid/missing API key |
| `ForbiddenError` | 403 | Project deactivated |
| `NotFoundError` | 404 | Payment/resource not found |
| `ValidationError` | 400 | Invalid request body |
| `RateLimitError` | 429 | Rate limit or daily plan limit exceeded |
| `IdempotencyError` | 409 | `external_order_id` reused with different `external_ref` |
| `WebhookSignatureError` | — | Invalid webhook signature |

## See Also

- [Getting Started](https://docs.payzcore.com/getting-started) — Account setup and first payment
- [Authentication & API Keys](https://docs.payzcore.com/guides/authentication) — API key management
- [Webhooks Guide](https://docs.payzcore.com/guides/webhooks) — Events, headers, and signature verification
- [Supported Networks](https://docs.payzcore.com/guides/networks) — Available networks and tokens
- [Error Reference](https://docs.payzcore.com/guides/errors) — HTTP status codes and troubleshooting
- [API Reference](https://docs.payzcore.com) — Interactive API documentation (Scalar UI)

## License

MIT
