import { describe, expect, it, vi } from "vitest";
import { WalletPrintClient } from "../src/client.js";
import { WalletPrintApiError } from "../src/errors.js";
import {
  inferMethodSignature,
  mapProposedTransactionToScoreRequest,
  toUsdNumber,
} from "../src/map-transaction.js";
import { createWalletPrintScoreTool } from "../src/langchain-tool.js";
import { wrapZeroDevSendTransaction } from "../src/zerodev-wrapper.js";

describe("WalletPrintClient", () => {
  it("calls /v1/score with API key header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          score: 27,
          band: "low",
          reason_codes: [],
          baseline_summary: { wallet_tx_count: 5, is_cold_start: false },
          screened_transaction_id: "11111111-1111-1111-1111-111111111111",
        }),
        { status: 200 },
      ),
    );

    const client = new WalletPrintClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchImpl,
    });

    const result = await client.score({
      wallet: {
        address: "0x1111111111111111111111111111111111111111",
        chain: "base",
      },
      transaction: {
        to: "0x2222222222222222222222222222222222222222",
        value_usd: 100,
        asset: "USDC",
      },
    });

    expect(result.score).toBe(27);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/v1/score",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-key",
        }),
      }),
    );
  });

  it("throws WalletPrintApiError on non-2xx responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid API key." }), {
        status: 401,
      }),
    );

    const client = new WalletPrintClient({
      baseUrl: "https://api.example.com",
      apiKey: "bad-key",
      fetchImpl,
    });

    await expect(
      client.score({
        wallet: {
          address: "0x1111111111111111111111111111111111111111",
          chain: "base",
        },
        transaction: {
          to: "0x2222222222222222222222222222222222222222",
          value_usd: 100,
          asset: "USDC",
        },
      }),
    ).rejects.toBeInstanceOf(WalletPrintApiError);
  });
});

describe("mapProposedTransactionToScoreRequest", () => {
  it("maps a proposed EVM transaction", () => {
    const request = mapProposedTransactionToScoreRequest({
      walletAddress: "0x1111111111111111111111111111111111111111",
      chain: "ethereum",
      valueUsd: 250,
      asset: "ETH",
      transaction: {
        to: "0x2222222222222222222222222222222222222222",
        data: "0xa9059cbb",
      },
    });

    expect(request.transaction.method_signature).toBe("0xa9059cbb");
    expect(request.transaction.value_usd).toBe(250);
  });

  it("forwards optional transaction_type and context", () => {
    const request = mapProposedTransactionToScoreRequest({
      walletAddress: "0x1111111111111111111111111111111111111111",
      chain: "base",
      valueUsd: 0.5,
      asset: "USDC",
      transactionType: "micropayment",
      context: { platform: "tiny_place", environment: "production" },
      transaction: {
        to: "0x2222222222222222222222222222222222222222",
      },
    });

    expect(request.transaction.transaction_type).toBe("micropayment");
    expect(request.context).toEqual({
      platform: "tiny_place",
      environment: "production",
    });
  });

  it("converts wei to USD for ETH transfers", () => {
    expect(toUsdNumber(1_000_000_000_000_000_000n, "ETH", 3000)).toBe(3000);
    expect(inferMethodSignature("0xa9059cbb0000")).toBe("0xa9059cbb");
  });
});

describe("integrations", () => {
  it("wraps a ZeroDev send function without blocking", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          score: 15,
          band: "low",
          reason_codes: [],
          baseline_summary: { wallet_tx_count: 1, is_cold_start: true },
          screened_transaction_id: "22222222-2222-2222-2222-222222222222",
        }),
        { status: 200 },
      ),
    );

    const client = new WalletPrintClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchImpl,
    });

    const sendTransaction = vi.fn().mockResolvedValue("0xhash");
    const wrapped = wrapZeroDevSendTransaction(sendTransaction, {
      client,
      walletAddress: "0x1111111111111111111111111111111111111111",
      chain: "base",
      getValueUsd: async () => 500,
    });

    const { result, score } = await wrapped({
      to: "0x2222222222222222222222222222222222222222",
      value: 1n,
    });

    expect(score.score).toBe(15);
    expect(result).toBe("0xhash");
    expect(sendTransaction).toHaveBeenCalledOnce();
  });

  it("creates a LangChain-compatible score tool", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          score: 40,
          band: "medium",
          reason_codes: [],
          baseline_summary: { wallet_tx_count: 10, is_cold_start: false },
          screened_transaction_id: "33333333-3333-3333-3333-333333333333",
        }),
        { status: 200 },
      ),
    );

    const client = new WalletPrintClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchImpl,
    });

    const tool = createWalletPrintScoreTool({
      client,
      walletAddress: "0x1111111111111111111111111111111111111111",
      chain: "base",
    });

    const result = await tool.invoke({
      to: "0x2222222222222222222222222222222222222222",
      value_usd: 1000,
      asset: "USDC",
    });

    expect(result.band).toBe("medium");
  });
});
