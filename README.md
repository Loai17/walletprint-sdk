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

See [approval-flow.md](docs/approval-flow.md) for the webhook payload schema and reference integrations.

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

## Environment variables

**Sandbox (try it now — no signup):**

```bash
WALLETPRINT_API_KEY=walletprint-dev-key
WALLETPRINT_BASE_URL=https://walletprint.up.railway.app
```

This public sandbox key is rate-limited and for exploration only. Scores are computed live but **not persisted**, and sandbox requests do not load wallet history. Production cross-wallet clustering signals are never written from sandbox traffic.

**Production API keys:** coming soon — follow updates at [walletprint.vercel.app](https://walletprint.vercel.app). Request a production key when you are ready to build behavioral baselines from real wallet activity.

## Advisory mode

v1 is advisory only. The SDK logs and returns risk scores; your application decides whether to proceed, pause, or require human approval.

## Security scanners

WalletPrint's SDK makes network calls to score transactions via our hosted API. Security scanners (e.g., [Socket](https://socket.dev)) will flag "network access" and "URL strings" — this is expected behavior for a risk-scoring SDK, not a vulnerability.

Optional LangChain integration (`createLangChainDynamicTool`) uses `@langchain/core` as a peer dependency. WalletPrint does not enable LangSmith tracing or verbose console logging — the SDK only wraps a score API call as a structured tool.

## License

MIT
