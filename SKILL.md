# WalletPrint — Behavioral Transaction Risk Scoring

Screen a proposed crypto transaction against the sending wallet's behavioral history before it is signed. Returns a risk score, band, and plain-English reason codes the agent can act on.

**This skill is advisory only — it never blocks a transaction. The agent decides what to do with the result.**

## When to use this skill

Use this skill **before signing or submitting any crypto transaction** when you want a behavioral risk check. Invoke it when:

- You are about to call `send_transaction`, `sendTransaction`, or any equivalent signing action
- The user asks you to "check" or "screen" a transaction before sending
- You are building an agent that transfers crypto on behalf of a user and want to flag anomalies

Do **not** use it after a transaction has already been submitted.

## Setup

Install the SDK:

```bash
npm install @walletprint/sdk
```

Set environment variables:

```bash
# Sandbox — works immediately, no signup required
WALLETPRINT_API_KEY=walletprint-dev-key
WALLETPRINT_BASE_URL=https://walletprint.up.railway.app

# Production — get a key at https://walletprint.vercel.app/dashboard/signup
WALLETPRINT_API_KEY=wp_live_...
```

## How to score a transaction

```typescript
import { WalletPrintClient } from "@walletprint/sdk";

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL!,
  apiKey: process.env.WALLETPRINT_API_KEY!,
});

const result = await client.score({
  wallet: {
    address: "0xYourAgentWallet",  // the sending wallet
    chain: "base",                  // "base", "ethereum", "solana"
  },
  transaction: {
    to: "0xRecipientAddress",
    value_usd: 1200,
    asset: "USDC",
    transaction_type: "transfer",   // optional: "transfer", "swap", "micropayment", etc.
  },
});

console.log(result.score);        // 0–100 (higher = riskier)
console.log(result.band);         // "low" | "medium" | "high"
console.log(result.reason_codes); // e.g. ["new_recipient", "amount_outlier_4x"]
```

## Interpreting the result

| band | score range | recommended action |
|------|-------------|-------------------|
| `low` | 0–39 | Proceed normally |
| `medium` | 40–69 | Log and optionally notify the user |
| `high` | 70–100 | Pause and ask the user to confirm before proceeding |

**Reason codes** (plain English examples):
- `new_recipient` — this wallet has never sent to this address before
- `amount_outlier_4x` — the amount is 4× this wallet's 30-day average
- `velocity_spike` — unusually high transaction frequency in the last hour
- `known_drainer` — recipient matches a known wallet drainer address
- `cross_wallet_cluster` — recipient has received from many unrelated wallets recently

## Pattern: pause on high risk

```typescript
const result = await client.score({ wallet, transaction });

if (result.band === "high") {
  // Do not sign. Ask the user.
  return `⚠️ High-risk transaction detected (score ${result.score}/100).
Reasons: ${result.reason_codes.join(", ")}.
Do you want to proceed anyway?`;
}

if (result.band === "medium") {
  // Log and continue, or surface to user as a soft warning.
  console.warn("WalletPrint medium risk:", result.reason_codes);
}

// band === "low": proceed
await sendTransaction(transaction);
```

## Framework integrations

**ZeroDev** — wrap `sendTransaction` so every call is screened automatically:

```typescript
import { wrapZeroDevSendTransaction } from "@walletprint/sdk";

const screenedSend = wrapZeroDevSendTransaction(
  async (tx) => sessionKeyClient.sendTransaction(tx),
  { client, walletAddress: "0xAgent", chain: "base", getValueUsd: async () => 500 }
);

const { result, score } = await screenedSend({ to: "0xRecipient", value: 1n });
```

**LangChain** — add WalletPrint as a tool in your agent's tool list:

```typescript
import { createLangChainDynamicTool } from "@walletprint/sdk";

const scoreTool = await createLangChainDynamicTool({
  client,
  walletAddress: "0xAgent",
  chain: "base",
});
// Add scoreTool to your LangChain agent's tools array.
```

**Solana** — middleware that wraps your existing send function:

```typescript
import { createSolanaWalletPrintMiddleware } from "@walletprint/sdk";

const screenedSend = createSolanaWalletPrintMiddleware(
  async (tx) => connection.sendTransaction(tx, [payer]),
  { client, walletAddress: payer.publicKey.toString(), asset: "SOL" }
);
```

**Coinbase AgentKit** — use the native `WalletPrintActionProvider`:

```typescript
import { walletprintActionProvider } from "@coinbase/agentkit";

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [walletprintActionProvider({ apiKey: process.env.WALLETPRINT_API_KEY! })],
});
```

## Submit feedback

Help improve the scoring model by labeling outcomes after execution:

```typescript
await client.submitFeedback({
  screened_transaction_id: result.screened_transaction_id,
  label: "false_positive",   // "false_positive" | "true_positive" | "confirmed_safe"
  notes: "Legitimate treasury transfer",
});
```

## Links

- GitHub: https://github.com/Loai17/walletprint-sdk
- npm: https://www.npmjs.com/package/@walletprint/sdk
- Dashboard & API keys: https://walletprint.vercel.app/dashboard/signup
- API reference: https://walletprint.up.railway.app
