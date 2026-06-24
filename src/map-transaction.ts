import type { MapTransactionOptions, ProposedEvmTransaction, ScoreRequest } from "./types.js";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function toUsdNumber(value: bigint | string | number, asset: string, ethUsd = 3000): number {
  const numeric =
    typeof value === "bigint"
      ? Number(value) / 1e18
      : typeof value === "string"
        ? Number.parseFloat(value)
        : value;

  if (!Number.isFinite(numeric) || numeric < 0) return 0;

  const normalizedAsset = asset.toUpperCase();
  if (["USDC", "USDT", "DAI", "USD"].includes(normalizedAsset)) return numeric;
  if (["ETH", "WETH"].includes(normalizedAsset)) return numeric * ethUsd;
  return numeric;
}

export function mapProposedTransactionToScoreRequest(
  options: MapTransactionOptions,
): ScoreRequest {
  const to = normalizeAddress(options.transaction.to, "transaction.to");
  const walletAddress = normalizeAddress(options.walletAddress, "wallet.address");

  return {
    wallet: {
      address: walletAddress,
      chain: options.chain,
    },
    transaction: {
      to,
      value_usd: options.valueUsd,
      asset: options.asset ?? inferAsset(options.transaction),
      contract_address: options.transaction.contract_address,
      method_signature: options.transaction.method_signature ?? inferMethodSignature(options.transaction.data),
      contract_category: options.transaction.contract_category,
      ...(options.transactionType ? { transaction_type: options.transactionType } : {}),
    },
    ...(options.context ? { context: options.context } : {}),
  };
}

export function inferAsset(transaction: ProposedEvmTransaction): string {
  if (transaction.data && transaction.data !== "0x") {
    return "CONTRACT_CALL";
  }
  return "ETH";
}

export function inferMethodSignature(data?: string): string | undefined {
  if (!data || data === "0x" || data.length < 10) return undefined;
  return data.slice(0, 10);
}

function normalizeAddress(address: string, fieldName: string): string {
  const normalized = address.toLowerCase();
  if (!EVM_ADDRESS_RE.test(normalized)) {
    throw new Error(`${fieldName} must be a valid EVM address`);
  }
  return normalized;
}
