# API Reference

Base URL:

```txt
https://walletprint.up.railway.app
```

Authentication:

```http
x-api-key: YOUR_API_KEY
```

Bearer auth is also accepted:

```http
Authorization: Bearer YOUR_API_KEY
```

## `GET /health`

Returns service health.

```bash
curl https://walletprint.up.railway.app/health
```

Response:

```json
{ "status": "ok" }
```

## `POST /v1/score`

Scores a proposed transaction.

```bash
curl https://walletprint.up.railway.app/v1/score \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "wallet": {
      "address": "0x1111111111111111111111111111111111111111",
      "chain": "base"
    },
    "transaction": {
      "to": "0x7777777777777777777777777777777777777777",
      "value_usd": 1000,
      "asset": "USDC"
    }
  }'
```

Request shape:

```ts
interface ScoreRequest {
  wallet: {
    address: string;
    chain: "base" | "ethereum" | "solana";
  };
  transaction: {
    to: string;
    value_usd: number;
    asset: string;
    contract_address?: string;
    method_signature?: string;
    contract_category?: string;
    transaction_type?: string; // optional — e.g. "micropayment", "bounty_payment"
  };
  context?: {
    platform?: string;       // optional — e.g. "tiny_place", "zerodev", "langchain"
    environment?: "sandbox" | "production";
    agent_id?: string;
  };
}
```

Optional `transaction_type` and `context` are stored with each screened transaction for future threshold tuning. They do **not** affect scoring today — omit them and behavior is unchanged.

Example with marketplace metadata:

```bash
curl https://walletprint.up.railway.app/v1/score \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "wallet": {
      "address": "0x1111111111111111111111111111111111111111",
      "chain": "base"
    },
    "transaction": {
      "to": "0x7777777777777777777777777777777777777777",
      "value_usd": 0.50,
      "asset": "USDC",
      "transaction_type": "micropayment"
    },
    "context": {
      "platform": "tiny_place",
      "environment": "production"
    }
  }'
```

Response shape:

```ts
interface ScoreResponse {
  score: number;
  band: "low" | "medium" | "high";
  reason_codes: Array<{
    code: string;
    label: string;
    detail: string;
    contribution: number;
  }>;
  baseline_summary: {
    wallet_tx_count: number;
    is_cold_start: boolean;
  };
  screened_transaction_id?: string;
  sandbox?: boolean;
  /** Present when scoring with a per-agent API key (production only). */
  agent_key_id?: string;
}
```

### Sandbox vs production keys

| | Public sandbox (`walletprint-dev-key`) | Production integrator key |
| --- | --- | --- |
| Scoring | Live rules and reason codes | Live rules and reason codes |
| Persistence | None | Full (`screened_transactions`, baselines, recipients) |
| Wallet history | Not loaded (each score is ephemeral) | Loaded from prior screens |
| Feedback | Not supported | Supported |
| Cluster signals (R6) | Never written | Written when triggered |

Sandbox responses include `"sandbox": true` and omit `screened_transaction_id`.

Production scores made with a **per-agent API key** include `agent_key_id` linking the row to that key.

## API key types

| Key type | Prefix | Access |
| --- | --- | --- |
| Public sandbox | `walletprint-dev-key` | `POST /v1/score` only (ephemeral, not persisted) |
| Master integrator | `wp_live_…` | All endpoints |
| Per-agent | `wp_agent_…` | `POST /v1/score`, `POST /v1/feedback` only; optional wallet/chain scope |

Issue a master key via [self-serve signup](https://walletprint.vercel.app/dashboard/signup). Create per-agent keys with `POST /v1/agent-keys` (master key required).

### Per-agent key scoping

If `wallet_address` and/or `chain` are set on an agent key, `POST /v1/score` requests outside that scope return `403` with a clear error message. Revoked agent keys return `401`.

## `POST /v1/agent-keys`

Create a per-agent API key. **Master integrator key required.** Production keys only.

```bash
curl https://walletprint.up.railway.app/v1/agent-keys \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_MASTER_KEY" \
  -d '{
    "agent_name": "trading-agent-1",
    "wallet_address": "0xYourAgentWallet",
    "chain": "base",
    "rate_limit_per_minute": 60
  }'
```

Request body:

```ts
interface CreateAgentKeyRequest {
  agent_name: string;
  wallet_address?: string;
  chain?: "base" | "ethereum" | "solana";
  rate_limit_per_minute?: number; // default 60, max 10000
}
```

Response (API key returned **once**):

```json
{
  "agent_key_id": "uuid",
  "api_key": "wp_agent_…",
  "agent_name": "trading-agent-1",
  "wallet_address": "0xYourAgentWallet",
  "chain": "base",
  "created_at": "2026-06-30T12:00:00.000Z"
}
```

## `GET /v1/agent-keys`

List agent keys for your integrator. **Master key required.**

```bash
curl https://walletprint.up.railway.app/v1/agent-keys \
  -H "x-api-key: YOUR_MASTER_KEY"
```

Response:

```json
{
  "agent_keys": [
    {
      "agent_key_id": "uuid",
      "agent_name": "trading-agent-1",
      "wallet_address": "0xYourAgentWallet",
      "chain": "base",
      "is_active": true,
      "created_at": "2026-06-30T12:00:00.000Z",
      "last_used_at": "2026-06-30T18:00:00.000Z",
      "rate_limit_per_minute": 60
    }
  ]
}
```

## `DELETE /v1/agent-keys/:agent_key_id`

Revoke an agent key. **Master key required.**

```bash
curl -X DELETE https://walletprint.up.railway.app/v1/agent-keys/AGENT_KEY_ID \
  -H "x-api-key: YOUR_MASTER_KEY"
```

Response:

```json
{ "revoked": true, "agent_key_id": "uuid" }
```

## `GET /v1/audit-export`

Exports screened transactions and human feedback labels for compliance and oversight documentation. Production API keys only.

```bash
curl "https://walletprint.up.railway.app/v1/audit-export?from=2025-06-01T00:00:00Z&to=2025-06-30T23:59:59Z&format=json" \
  -H "x-api-key: YOUR_API_KEY"
```

Query parameters:

- `from` — start of date range (ISO 8601 or `YYYY-MM-DD`, optional; default: 30 days before `to`)
- `to` — end of date range (ISO 8601 or `YYYY-MM-DD`, optional; default: now). Date-only values include the full UTC day.
- `wallet` — filter to a specific wallet address (optional)
- `format` — `json` (default) or `csv`

JSON response:

```json
{
  "records": [
    {
      "screened_transaction_id": "9ffc282b-ac2b-4249-999a-1b68c8a91756",
      "screened_at": "2025-06-20T12:00:00.000Z",
      "wallet_address": "0x1111111111111111111111111111111111111111",
      "chain": "base",
      "to_address": "0x7777777777777777777777777777777777777777",
      "value_usd": 1000,
      "asset": "USDC",
      "contract_address": null,
      "contract_category": null,
      "score": 65,
      "band": "medium",
      "reason_codes": [],
      "human_decision": "confirmed_benign",
      "human_decision_at": "2025-06-20T12:05:00.000Z",
      "human_decision_source": "integrator_dashboard",
      "human_decision_notes": "Expected treasury transfer"
    }
  ],
  "from": "2025-06-01T00:00:00.000Z",
  "to": "2025-06-30T23:59:59.000Z",
  "count": 1
}
```

See [compliance.md](./compliance.md) for how audit exports support oversight documentation.

## `PATCH /v1/webhook`

Configure webhook delivery for flagged transactions. Production API keys only.

```bash
curl https://walletprint.up.railway.app/v1/webhook \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "webhook_url": "https://your-app.com/walletprint/webhook",
    "webhook_bands": ["medium", "high"]
  }'
```

Request body:

```ts
interface WebhookSettings {
  webhook_url: string | null;
  webhook_bands?: Array<"low" | "medium" | "high">;
}
```

When a scored transaction matches a configured band, WalletPrint POSTs a `transaction.flagged` payload to your URL. See [approval-flow.md](./approval-flow.md) for the full payload schema and reference integrations (Slack, email).

## `POST /v1/webhook/test`

Send a test webhook payload to your configured URL. **Master integrator key required.** Production keys only.

```bash
curl https://walletprint.up.railway.app/v1/webhook/test \
  -X POST \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_MASTER_KEY" \
  -d '{}'
```

Returns `400` if no webhook URL is configured. On success:

```json
{
  "sent": true,
  "webhook_url": "https://your-app.com/walletprint/webhook",
  "payload_preview": { "event": "transaction.flagged", "score": 62, "band": "medium", "...": "..." }
}
```

## `POST /v1/feedback`

Labels a screened transaction.

```bash
curl https://walletprint.up.railway.app/v1/feedback \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "screened_transaction_id": "SCREENED_TRANSACTION_ID",
    "label": "confirmed_benign",
    "label_source": "integrator_dashboard",
    "notes": "Expected transfer"
  }'
```

Labels:

- `false_positive`
- `false_negative`
- `confirmed_malicious`
- `confirmed_benign`

Label sources:

- `integrator_dashboard`
- `community`
- `automated`

## Rate Limits

The hosted service applies per-integrator rate limits. Master integrator keys default to **120 requests per minute**. Per-agent keys use the `rate_limit_per_minute` set at creation (default 60, max 10,000).
