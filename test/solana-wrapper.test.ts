import { describe, expect, it, vi } from "vitest";
import { WalletPrintClient } from "../src/client.js";
import {
  createSolanaWalletPrintMiddleware,
  extractSolanaTransactionData,
} from "../src/solana-wrapper.js";

const FEE_PAYER = "FeePayer1111111111111111111111111111111";
const RECIPIENT = "Recipient111111111111111111111111111111";
const PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

function createMockTransaction() {
  return {
    feePayer: { toBase58: () => FEE_PAYER },
    instructions: [
      {
        programId: { toBase58: () => PROGRAM_ID },
        keys: [
          { pubkey: { toBase58: () => FEE_PAYER } },
          { pubkey: { toBase58: () => RECIPIENT } },
        ],
      },
    ],
  };
}

describe("extractSolanaTransactionData", () => {
  it("extracts the first non-fee-payer account as recipient", () => {
    const extracted = extractSolanaTransactionData(
      createMockTransaction() as never,
      FEE_PAYER,
    );

    expect(extracted.to).toBe(RECIPIENT);
    expect(extracted.contract_address).toBe(PROGRAM_ID);
  });
});

describe("createSolanaWalletPrintMiddleware", () => {
  it("scores with chain solana and still sends the transaction", async () => {
    const scoreResponse = {
      score: 18,
      band: "low" as const,
      reason_codes: [],
      baseline_summary: { wallet_tx_count: 2, is_cold_start: false },
      screened_transaction_id: "44444444-4444-4444-4444-444444444444",
    };

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(scoreResponse), { status: 200 }),
    );

    const client = new WalletPrintClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchImpl,
    });

    const scoreSpy = vi.spyOn(client, "score");
    const onScore = vi.fn();
    const sendFn = vi.fn().mockResolvedValue("solana-signature");

    const screenedSend = createSolanaWalletPrintMiddleware(sendFn, {
      client,
      walletAddress: FEE_PAYER,
      asset: "SOL",
      getValueUsd: async () => 42,
      onScore,
    });

    const tx = createMockTransaction();
    const { signature, score } = await screenedSend(tx as never);

    expect(scoreSpy).toHaveBeenCalledWith({
      wallet: {
        address: FEE_PAYER,
        chain: "solana",
      },
      transaction: {
        to: RECIPIENT,
        value_usd: 42,
        asset: "SOL",
        contract_address: PROGRAM_ID,
      },
    });
    expect(onScore).toHaveBeenCalledWith(scoreResponse);
    expect(sendFn).toHaveBeenCalledWith(tx);
    expect(signature).toBe("solana-signature");
    expect(score.score).toBe(18);
  });

  it("calls sendFn regardless of a high risk score", async () => {
    const scoreResponse = {
      score: 92,
      band: "high" as const,
      reason_codes: [{ code: "NEW_RECIPIENT", label: "New recipient", detail: "", contribution: 40 }],
      baseline_summary: { wallet_tx_count: 2, is_cold_start: false },
    };

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(scoreResponse), { status: 200 }),
    );

    const client = new WalletPrintClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchImpl,
    });

    const sendFn = vi.fn().mockResolvedValue("solana-signature");
    const screenedSend = createSolanaWalletPrintMiddleware(sendFn, {
      client,
      walletAddress: FEE_PAYER,
    });

    const { signature, score } = await screenedSend(createMockTransaction() as never);

    expect(score.band).toBe("high");
    expect(sendFn).toHaveBeenCalledOnce();
    expect(signature).toBe("solana-signature");
  });
});
