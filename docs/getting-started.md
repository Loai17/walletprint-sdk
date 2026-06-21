# Getting Started

This guide shows the shortest path from `npm install` to a live WalletPrint score.

## 1. Install

```bash
npm install @walletprint/sdk
```

## 2. Create a Client

Use the public sandbox key to try WalletPrint immediately:

```bash
export WALLETPRINT_API_KEY=walletprint-dev-key
export WALLETPRINT_BASE_URL=https://walletprint.up.railway.app
```

```ts
import { WalletPrintClient } from "@walletprint/sdk";

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL!,
  apiKey: process.env.WALLETPRINT_API_KEY!,
});
```

Dedicated production API keys are coming soon. Until then, use the sandbox key for exploration. Sandbox scores are live but **not persisted** and do not load wallet history — use a production key when you are ready to build behavioral baselines from real traffic.

## 3. Score a Proposed Transaction

```ts
const result = await client.score({
  wallet: {
    address: "0x1111111111111111111111111111111111111111",
    chain: "base",
  },
  transaction: {
    to: "0x7777777777777777777777777777777777777777",
    value_usd: 1000,
    asset: "USDC",
  },
});

console.log(result);
```

Example response:

```json
{
  "score": 15,
  "band": "low",
  "reason_codes": [
    {
      "code": "NEW_RECIPIENT",
      "label": "New recipient",
      "detail": "Wallet has never sent to this address before.",
      "contribution": 15
    }
  ],
  "baseline_summary": {
    "wallet_tx_count": 11,
    "is_cold_start": false
  },
  "screened_transaction_id": "9ffc282b-ac2b-4249-999a-1b68c8a91756"
}
```

## 4. Submit Feedback

Feedback is the product loop. If the result is wrong or confirmed, label it.

```ts
await client.submitFeedback({
  screened_transaction_id: result.screened_transaction_id,
  label: "confirmed_benign",
  label_source: "integrator_dashboard",
  notes: "Expected treasury transfer",
});
```

## Cold Start Behavior

If a wallet has fewer than five screened transactions, some behavioral rules are neutral:

- size deviation is not penalized
- velocity spike is not penalized
- recipient novelty can still trigger

This avoids flooding new integrators with false positives.

## Advisory Mode

WalletPrint v1 never blocks a transaction. It returns a score and reason codes; the integrator decides what to do.

## Next Steps

- **Wire into your approval flow** — configure webhooks and connect Slack or email alerts. See [approval-flow.md](./approval-flow.md).
- **Compliance export** — pull audit records for oversight documentation. See [compliance.md](./compliance.md).
- **Full API reference** — [api.md](./api.md).
