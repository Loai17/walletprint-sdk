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

Dedicated production API keys are available via **self-serve signup** at [walletprint.vercel.app/dashboard/signup](https://walletprint.vercel.app/dashboard/signup). You receive a master integrator key (`wp_live_…`) once — store it securely. From the dashboard you can create per-agent keys, review transactions, configure webhooks, and download audit exports.

Use the public sandbox key (`walletprint-dev-key`) to explore without an account. Sandbox scores are live but **not persisted**; they may compute an ephemeral baseline from a wallet's recent on-chain history for the response, but nothing is saved and no cross-wallet signals are written.

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
  screened_transaction_id: result.screened_transaction_id!,
  label: "confirmed_benign",
  label_source: "integrator_dashboard",
  notes: "Expected treasury transfer",
});
```

## Per-agent API keys

For fleets of agent wallets, create scoped keys from your master key (server-side only — never expose the master key in client code):

```ts
const response = await fetch("https://walletprint.up.railway.app/v1/agent-keys", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.WALLETPRINT_MASTER_KEY!,
  },
  body: JSON.stringify({
    agent_name: "trading-agent-1",
    wallet_address: "0xYourAgentWallet",
    chain: "base",
  }),
});
const { api_key } = await response.json();
// Store api_key securely — returned once only

const agentClient = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL!,
  apiKey: api_key,
});
```

Agent keys can only call `POST /v1/score` and `POST /v1/feedback`. Manage keys in the [dashboard](https://walletprint.vercel.app/dashboard/agent-keys) or via the API.

## Cold Start Behavior

If a wallet has fewer than five screened transactions, some behavioral rules are neutral:

- size deviation is not penalized
- velocity spike is not penalized
- recipient novelty can still trigger

This avoids flooding new integrators with false positives.

### History seeding (shortens cold start)

The first time a production key scores a brand-new wallet, WalletPrint can pull the
wallet's recent on-chain history (up to 90 days / 200 transfers via Alchemy) and seed an
initial behavioral baseline — so size, velocity, and clustering signals are useful from
the first real transaction instead of the fifth. Seeding is best-effort and runs in the
background: it never blocks or changes the response to that first request, and a failure
silently falls back to a normal cold start.

The seeded baseline is kept as a floor and **blended** with your organic screened traffic
until the wallet accumulates enough real history (20 screened transactions), at which
point the seed is retired and the baseline is built purely from your own traffic. This
means a single real transaction can never wipe out the richer seeded baseline.

Seeding is on by default and can be disabled per integrator (`history_seeding_enabled`).

## Advisory Mode

WalletPrint v1 never blocks a transaction. It returns a score and reason codes; the integrator decides what to do.

## Context & Transaction Type (optional)

Agent marketplaces (e.g. Tiny Place on Solana) often have high-frequency micropayments and many new recipients by design — patterns that look risky for a single agent but are normal on a platform. You can tag scores with optional metadata so WalletPrint can tune thresholds later using real production data.

```ts
const result = await client.score({
  wallet: {
    address: "0x1111111111111111111111111111111111111111",
    chain: "base",
  },
  transaction: {
    to: "0x7777777777777777777777777777777777777777",
    value_usd: 0.5,
    asset: "USDC",
    transaction_type: "micropayment", // optional
  },
  context: {
    platform: "tiny_place", // optional
    environment: "production",
    agent_id: "agent-42",
  },
});
```

These fields are persisted with each screened transaction. They do **not** change the score or reason codes today. SDK wrappers (`wrapZeroDevSendTransaction`, `createSolanaWalletPrintMiddleware`, `createWalletPrintScoreTool`) accept optional `context` and `transactionType` in their options — nothing is sent automatically.

## Solana

The scoring API is chain-agnostic. Pass `chain: "solana"` with a Solana wallet address and recipient:

```ts
const result = await client.score({
  wallet: {
    address: "YourSolanaWalletBase58Address",
    chain: "solana",
  },
  transaction: {
    to: "RecipientBase58Address",
    value_usd: 250,
    asset: "SOL",
  },
});
```

For agent-wallet send flows, use `createSolanaWalletPrintMiddleware` from the SDK (requires optional `@solana/web3.js` peer). See the [SDK README](https://github.com/Loai17/walletprint-sdk#solana).

## Next Steps

- **Get a production key** — [self-serve signup](https://walletprint.vercel.app/dashboard/signup) (free).
- **Wire into your approval flow** — configure webhooks and connect Slack or email alerts. See [approval-flow.md](./approval-flow.md).
- **Compliance export** — pull audit records from the dashboard or `GET /v1/audit-export`. See [compliance.md](./compliance.md).
- **Full API reference** — [api.md](./api.md).
