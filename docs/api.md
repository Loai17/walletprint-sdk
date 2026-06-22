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
  };
}
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

## `GET /v1/audit-export`

Exports screened transactions and human feedback labels for compliance and oversight documentation. Production API keys only.

```bash
curl "https://walletprint.up.railway.app/v1/audit-export?from=2025-06-01T00:00:00Z&to=2025-06-30T23:59:59Z&format=json" \
  -H "x-api-key: YOUR_API_KEY"
```

Query parameters:

- `from` — start of date range (ISO 8601, optional; default: 30 days before `to`)
- `to` — end of date range (ISO 8601, optional; default: now)
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

The hosted service applies per-integrator rate limits. Defaults are currently configured as `120` requests per minute.
