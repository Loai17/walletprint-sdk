# @walletprint/sdk

Behavioral transaction risk SDK for crypto wallets and AI agent wallets.

WalletPrint checks whether a proposed transaction looks normal for a specific wallet — new recipients, unusual amounts, velocity spikes, known scam addresses, and cross-platform recipient clustering.

This repository contains the open-source SDK only. The scoring engine, API, and dashboard are not published here.

## Install

```bash
npm install @walletprint/sdk
```

## Quick start

```typescript
import { WalletPrintClient } from "@walletprint/sdk";

const client = new WalletPrintClient({
  baseUrl: "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY!,
});

const result = await client.score({
  wallet: {
    address: "0xYourWallet",
    chain: "base",
  },
  transaction: {
    to: "0xRecipient",
    value_usd: 1200,
    asset: "USDC",
  },
});

console.log(result.score, result.band, result.reason_codes);
```

## Get a production API key

Sign up free at **[walletprint.vercel.app/dashboard/signup](https://walletprint.vercel.app/dashboard/signup)**. You receive a master integrator key (`wp_live_…`) once. The dashboard lets you create per-agent keys, review transactions, configure webhooks, and download audit exports.

## Per-agent API keys

Create scoped keys for individual agent wallets (server-side, using your master key):

```typescript
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

Agent keys can only call `POST /v1/score` and `POST /v1/feedback`. Optional `wallet_address` and `chain` lock scoring to that scope.

## Context & Transaction Type

Optional metadata for marketplace and agent-wallet integrations. These fields are stored with each screened transaction for future threshold tuning — they do not affect scoring today.

```typescript
const result = await client.score({
  wallet: { address: "0xYourAgent", chain: "base" },
  transaction: {
    to: "0xRecipient",
    value_usd: 0.5,
    asset: "USDC",
    transaction_type: "micropayment", // optional
  },
  context: {
    platform: "tiny_place", // optional — e.g. tiny_place, zerodev, langchain, coinbase_agentkit
    environment: "production", // optional
    agent_id: "agent-42", // optional
  },
});
```

Wrappers (`wrapZeroDevSendTransaction`, `createSolanaWalletPrintMiddleware`, `createWalletPrintScoreTool`) accept an optional `context` and `transactionType` in their options — nothing is sent automatically; integrators opt in explicitly.

## Documentation

- [Getting started](docs/getting-started.md)
- [HTTP API reference](docs/api.md)
- [Approval flow & webhooks](docs/approval-flow.md)
- [Compliance export](docs/compliance.md)
- [Examples](examples/README.md)

## Development

```bash
npm install
npm test
npm run build
```

## ZeroDev integration

Wrap a session-key `sendTransaction` call so every proposed transaction is screened before signing. Advisory only in v1 — WalletPrint never blocks execution.

```typescript
import { WalletPrintClient, wrapZeroDevSendTransaction } from "@walletprint/sdk";

const client = new WalletPrintClient({
  baseUrl: "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY!,
});

const screenedSend = wrapZeroDevSendTransaction(
  async (transaction) => sessionKeyClient.sendTransaction(transaction),
  {
    client,
    walletAddress: "0xYourAgentWallet",
    chain: "base",
    getValueUsd: async (tx) => {
      // Replace with your price oracle / token metadata lookup.
      return 500;
    },
    onScore: (result) => {
      console.log("WalletPrint advisory:", result.band, result.reason_codes);
    },
  },
);

const { result, score } = await screenedSend({
  to: "0xRecipient",
  value: 1n,
});
```

Manual pre-sign hook:

```typescript
import { WalletPrintClient, zeroDevPreSignHook } from "@walletprint/sdk";

const score = await zeroDevPreSignHook(client, {
  walletAddress: "0xYourAgentWallet",
  chain: "base",
  transaction: { to: "0xRecipient", value: 1n },
  getValueUsd: async () => 500,
});
```

## LangChain integration

```typescript
import { WalletPrintClient, createLangChainDynamicTool } from "@walletprint/sdk";

const client = new WalletPrintClient({
  baseUrl: "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY!,
});

const scoreTool = await createLangChainDynamicTool({
  client,
  walletAddress: "0xYourAgentWallet",
  chain: "base",
});

// Add `scoreTool` to your agent's tool list before signing transactions.
```

Framework-agnostic tool object:

```typescript
import { createWalletPrintScoreTool } from "@walletprint/sdk";

const tool = createWalletPrintScoreTool({
  client,
  walletAddress: "0xYourAgentWallet",
  chain: "base",
});

const result = await tool.invoke({
  to: "0xRecipient",
  value_usd: 1000,
  asset: "USDC",
});
```

## Solana

WalletPrint supports Solana agent wallets via `createSolanaWalletPrintMiddleware`.

```typescript
import { WalletPrintClient, createSolanaWalletPrintMiddleware } from "@walletprint/sdk";
import { Transaction, Connection, PublicKey } from "@solana/web3.js";

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL!,
  apiKey: process.env.WALLETPRINT_API_KEY!,
});

const screenedSend = createSolanaWalletPrintMiddleware(
  async (tx) => {
    // your existing send logic here
    const signature = await connection.sendTransaction(tx, [payer]);
    return signature;
  },
  {
    client,
    walletAddress: payer.publicKey.toString(),
    asset: "SOL",
    onScore: (result) => {
      console.log("WalletPrint:", result.band, result.reason_codes);
      if (result.band === "high") {
        // pause, alert a human, require confirmation
      }
    },
  }
);

// Use exactly like your existing send
const { signature, score } = await screenedSend(transaction);
```

Sandbox key `walletprint-dev-key` works immediately for testing.

## Feedback

Help improve the model by labeling outcomes:

```typescript
await client.submitFeedback({
  screened_transaction_id: result.screened_transaction_id,
  label: "false_positive",
  label_source: "integrator_dashboard",
  notes: "Legitimate treasury transfer",
});
```

## Webhooks & approval flow

WalletPrint is a signal layer — not an approval UI. Register a webhook to receive medium/high band alerts and wire them into Slack, email, or your own review flow:

```bash
curl https://walletprint.up.railway.app/v1/webhook \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_PRODUCTION_API_KEY" \
  -d '{"webhook_url": "https://your-app.com/walletprint/webhook", "webhook_bands": ["medium", "high"]}'
```

See [approval-flow.md](docs/approval-flow.md) for the webhook payload schema, `POST /v1/webhook/test`, and reference integrations.

## Compliance export

Pull audit records (scores, reason codes, human decisions) for oversight documentation:

```bash
curl "https://walletprint.up.railway.app/v1/audit-export?format=csv" \
  -H "x-api-key: YOUR_PRODUCTION_API_KEY" \
  -o walletprint-audit.csv
```

See [compliance.md](docs/compliance.md) for details.

## API reference

- `WalletPrintClient.score(request)` → `ScoreResponse`
- `WalletPrintClient.submitFeedback(request)` → `FeedbackResponse`
- `wrapZeroDevSendTransaction(sendFn, options)`
- `zeroDevPreSignHook(client, options)`
- `createWalletPrintScoreTool(options)`
- `createLangChainDynamicTool(options)` (requires `@langchain/core`)
- `createSolanaWalletPrintMiddleware(sendFn, options)` (requires `@solana/web3.js`)
- `createSolanaLangChainTool(options)` (requires `@langchain/core`)

## Environment variables

**Sandbox (try it now — no signup):**

```bash
WALLETPRINT_API_KEY=walletprint-dev-key
WALLETPRINT_BASE_URL=https://walletprint.up.railway.app
```

This public sandbox key is rate-limited and for exploration only. Scores are computed live but **not persisted**. Sandbox scoring may use a wallet's recent on-chain history to compute an ephemeral baseline for the response, but nothing is saved and production cross-wallet clustering signals are never written from sandbox traffic.

**Production API keys:** self-serve at [walletprint.vercel.app/dashboard/signup](https://walletprint.vercel.app/dashboard/signup). Master keys persist scores and build behavioral baselines. Create per-agent keys from the dashboard or `POST /v1/agent-keys`.

## Advisory mode

v1 is advisory only. The SDK logs and returns risk scores; your application decides whether to proceed, pause, or require human approval.

## Security scanners

WalletPrint's SDK makes network calls to score transactions via our hosted API. Security scanners (e.g., [Socket](https://socket.dev)) will flag **network access** and **URL strings** — this is expected behavior for a risk-scoring SDK, not a vulnerability.

**Optional peer dependencies** — WalletPrint's own runtime is `zod` only. Integrations pull in optional peers; documented findings below are upstream-owned, not WalletPrint code.

| Integration | Peer dep | Known scanner / audit notes |
| --- | --- | --- |
| LangChain | `@langchain/core` | Transitive `langsmith` — four CVEs resolved in **0.1.4** via override to `langsmith@0.7.10`. WalletPrint does not enable LangSmith tracing or verbose console logging. |
| LangChain | `@langchain/core` | Transitive `uuid` — **GHSA-w5hq-g745-h8pq** / CVE-2026-41907 mitigated in **0.1.5** via `uuid@11.1.1` devDependency + nested override on `@langchain/core`. |
| Solana | `@solana/web3.js` | Transitive `@solana/web3.js` → `jayson` → `uuid@8.3.2` — **same CVE class** as above (**GHSA-w5hq-g745-h8pq**, `uuid` < 11.1.1). Added in **0.1.7** as an optional peer; npm overrides cannot fix without breaking `@solana/web3.js`. Only appears when you install the Solana peer for dev/CI. |

If Socket or `npm audit` surfaces `uuid` alerts after **0.1.7**, check which optional peer is installed — this is not a regression in WalletPrint's core package.

## License

MIT
