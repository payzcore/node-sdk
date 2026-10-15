# @payzcore/node v1.1.8

```bash
npm install @payzcore/node@1.1.8
```

## Fixed
- `payments.create()` → `existing` is always a boolean (was `undefined` for new payments).
- `projects.list()` → `apiKeyPrefix` (was always `undefined` as `apiKey`).
- List items now include `updatedAt` (typed as required but missing before); `get()` includes `paidAt`.
- Webhook payload types: `network`, `token`, `address` can be `null` (payment cancelled/expired before a network was selected); `token` no longer defaults to `'USDT'`.
- `POST` requests are no longer retried automatically unless `externalOrderId` is set, so a retry can never create a duplicate payment.

## Added
- `payments.list({ createdAfter, updatedAfter })` and `result.pagination` (`total`, `limit`, `offset`, `hasMore`).
- `availableNetworks[]` include `confirmations` and `explorer`.
- `Pagination` type export.

## Changed
- `IdempotencyError` covers every HTTP 409; default message is `Conflict`.
- `RateLimitError.retryAfter` documented as an absolute Unix timestamp.

Docs: https://docs.payzcore.com/sdks/node
