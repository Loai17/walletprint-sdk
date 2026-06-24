import { mapProposedTransactionToScoreRequest } from "./map-transaction.js";
import type { WalletPrintClient } from "./client.js";
import type {
  ProposedEvmTransaction,
  ScoreResponse,
  ScreenHookOptions,
  ZeroDevWrapperOptions,
} from "./types.js";

export async function screenProposedTransaction(
  client: WalletPrintClient,
  options: ScreenHookOptions,
): Promise<ScoreResponse> {
  const request = mapProposedTransactionToScoreRequest(options);
  const result = await client.score(request);
  options.onScore?.(result);
  return result;
}

/**
 * Wrap a ZeroDev session-key send function so every proposed transaction is
 * screened before signing. Advisory only in v1 — never blocks execution.
 */
export function wrapZeroDevSendTransaction<T extends ProposedEvmTransaction, R>(
  sendTransaction: (transaction: T) => Promise<R>,
  options: ZeroDevWrapperOptions,
) {
  return async (transaction: T): Promise<{ result: R; score: ScoreResponse }> => {
    const valueUsd = await options.getValueUsd(transaction);
    const score = await screenProposedTransaction(options.client, {
      walletAddress: options.walletAddress,
      chain: options.chain,
      transaction,
      valueUsd,
      asset: options.asset,
      transactionType: options.transactionType,
      context: options.context,
      onScore: options.onScore,
    });

    const result = await sendTransaction(transaction);
    return { result, score };
  };
}

/**
 * Convenience hook for manual ZeroDev / viem flows where you already have a
 * proposed UserOperation or transaction object.
 */
export async function zeroDevPreSignHook(
  client: WalletPrintClient,
  options: Omit<ZeroDevWrapperOptions, "client"> & {
    transaction: ProposedEvmTransaction;
  },
): Promise<ScoreResponse> {
  const valueUsd = await options.getValueUsd(options.transaction);
  return screenProposedTransaction(client, {
    walletAddress: options.walletAddress,
    chain: options.chain,
    transaction: options.transaction,
    valueUsd,
    asset: options.asset,
    transactionType: options.transactionType,
    context: options.context,
    onScore: options.onScore,
  });
}
