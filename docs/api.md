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
    chain: "base" | "ethereum";
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
  screened_transaction_id: string;
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

The hosted service applies per-integrator rate limits. Defaults are currently configured as `120` requests per minute.
