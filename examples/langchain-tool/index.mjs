import { WalletPrintClient, createWalletPrintScoreTool } from "@walletprint/sdk";

if (!process.env.WALLETPRINT_API_KEY) {
  throw new Error("Set WALLETPRINT_API_KEY before running this example.");
}

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL ?? "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY,
});

const tool = createWalletPrintScoreTool({
  client,
  walletAddress: "0x1111111111111111111111111111111111111111",
  chain: "base",
});

// In a real agent, call this tool before any wallet-send action.
const result = await tool.invoke({
  to: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  value_usd: 1000,
  asset: "USDC",
});

console.log(JSON.stringify(result, null, 2));
