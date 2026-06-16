import { WalletPrintClient, wrapZeroDevSendTransaction } from "@walletprint/sdk";

if (!process.env.WALLETPRINT_API_KEY) {
  throw new Error("Set WALLETPRINT_API_KEY before running this example.");
}

const client = new WalletPrintClient({
  baseUrl: process.env.WALLETPRINT_BASE_URL ?? "https://walletprint.up.railway.app",
  apiKey: process.env.WALLETPRINT_API_KEY,
});

// Replace this with `sessionKeyClient.sendTransaction(transaction)`.
async function mockZeroDevSendTransaction(transaction) {
  console.log("Would send transaction:", transaction);
  return "0xmocktransactionhash";
}

const screenedSendTransaction = wrapZeroDevSendTransaction(
  mockZeroDevSendTransaction,
  {
    client,
    walletAddress: "0x1111111111111111111111111111111111111111",
    chain: "base",
    asset: "USDC",
    getValueUsd: async () => 500,
    onScore: (score) => {
      console.log("WalletPrint advisory:", score.band, score.reason_codes);
    },
  },
);

const { result, score } = await screenedSendTransaction({
  to: "0x9999999999999999999999999999999999999999",
  value: 0n,
});

console.log("Send result:", result);
console.log("Score:", score);
