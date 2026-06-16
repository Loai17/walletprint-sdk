import { WalletPrintClient } from "@walletprint/sdk";

if (!process.env.WALLETPRINT_API_KEY) {
  throw new Error("Set WALLETPRINT_API_KEY before running this example.");
}

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL ?? "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY,
});

const score = await client.score({
  wallet: {
    address: "0x1111111111111111111111111111111111111111",
    chain: "base",
  },
  transaction: {
    to: "0x8888888888888888888888888888888888888888",
    value_usd: 250,
    asset: "USDC",
  },
});

console.log("Score:", score);

const feedback = await client.submitFeedback({
  screened_transaction_id: score.screened_transaction_id,
  label: "confirmed_benign",
  label_source: "community",
  notes: "Example label submitted from SDK.",
});

console.log("Feedback:", feedback);
