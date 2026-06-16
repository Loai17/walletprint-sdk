import { WalletPrintClient } from "@walletprint/sdk";

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL ?? "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY,
});

if (!process.env.WALLETPRINT_API_KEY) {
  throw new Error("Set WALLETPRINT_API_KEY before running this example.");
}

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

console.log(JSON.stringify(result, null, 2));
