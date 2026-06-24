import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletPrintClient } from "./client.js";
import type { LangChainToolOptions, ScoreResponse, SolanaMiddlewareOptions } from "./types.js";
import { createLangChainDynamicTool } from "./langchain-tool.js";

export type { SolanaMiddlewareOptions };

interface ExtractedSolanaTransaction {
  to: string;
  contract_address?: string;
}

function isVersionedTransaction(
  tx: Transaction | VersionedTransaction,
): tx is VersionedTransaction {
  return "version" in tx && "message" in tx;
}

function toBase58(key: { toBase58(): string } | string): string {
  return typeof key === "string" ? key : key.toBase58();
}

function getFeePayer(tx: Transaction | VersionedTransaction): string | undefined {
  if (isVersionedTransaction(tx)) {
    const message = tx.message;
    const keys =
      "staticAccountKeys" in message && message.staticAccountKeys.length > 0
        ? message.staticAccountKeys
        : message.getAccountKeys?.().staticAccountKeys;

    return keys?.[0] ? toBase58(keys[0]) : undefined;
  }

  return tx.feePayer ? tx.feePayer.toBase58() : undefined;
}

export function extractSolanaTransactionData(
  tx: Transaction | VersionedTransaction,
  fallbackTo: string,
): ExtractedSolanaTransaction {
  const feePayer = getFeePayer(tx);

  if (isVersionedTransaction(tx)) {
    const message = tx.message;
    const accountKeys =
      "staticAccountKeys" in message && message.staticAccountKeys.length > 0
        ? message.staticAccountKeys.map(toBase58)
        : message.getAccountKeys?.().staticAccountKeys.map(toBase58) ?? [];

    const firstInstruction = message.compiledInstructions[0];
    if (!firstInstruction || accountKeys.length === 0) {
      return { to: fallbackTo };
    }

    const programId = accountKeys[firstInstruction.programIdIndex];
    for (const accountIndex of firstInstruction.accountKeyIndexes) {
      const address = accountKeys[accountIndex];
      if (address && address !== feePayer) {
        return {
          to: address,
          contract_address: programId,
        };
      }
    }

    return {
      to: fallbackTo,
      contract_address: programId,
    };
  }

  const firstInstruction = tx.instructions[0];
  if (!firstInstruction) {
    return { to: fallbackTo };
  }

  const programId = firstInstruction.programId.toBase58();
  for (const key of firstInstruction.keys) {
    const address = key.pubkey.toBase58();
    if (address !== feePayer) {
      return {
        to: address,
        contract_address: programId,
      };
    }
  }

  return {
    to: fallbackTo,
    contract_address: programId,
  };
}

async function screenSolanaTransaction(
  client: WalletPrintClient,
  options: SolanaMiddlewareOptions,
  tx: Transaction | VersionedTransaction,
): Promise<ScoreResponse> {
  const extracted = extractSolanaTransactionData(tx, options.walletAddress);
  const valueUsd = options.getValueUsd ? await options.getValueUsd(tx) : 0;
  const result = await client.score({
    wallet: {
      address: options.walletAddress,
      chain: "solana",
    },
    transaction: {
      to: extracted.to,
      value_usd: valueUsd,
      asset: options.asset ?? "SOL",
      contract_address: extracted.contract_address,
      ...(options.transactionType ? { transaction_type: options.transactionType } : {}),
    },
    ...(options.context ? { context: options.context } : {}),
  });

  options.onScore?.(result);
  return result;
}

/**
 * Wrap a Solana transaction send function so every proposed transaction is
 * screened before signing. Advisory only in v1 — never blocks execution.
 */
export function createSolanaWalletPrintMiddleware(
  sendFn: (tx: Transaction | VersionedTransaction) => Promise<string>,
  options: SolanaMiddlewareOptions,
): (tx: Transaction | VersionedTransaction) => Promise<{ signature: string; score: ScoreResponse }> {
  return async (tx) => {
    const score = await screenSolanaTransaction(options.client, options, tx);
    const signature = await sendFn(tx);
    return { signature, score };
  };
}

/**
 * Optional helper when @langchain/core is installed.
 */
export async function createSolanaLangChainTool(
  options: Omit<LangChainToolOptions, "chain">,
) {
  return createLangChainDynamicTool({
    ...options,
    chain: "solana",
    defaultAsset: options.defaultAsset ?? "SOL",
  });
}
