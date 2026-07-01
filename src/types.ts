/**
 * Chains the SDK advertises support for. Must stay in lockstep with the API's
 * accepted chains — a contract test in the API package asserts this list equals
 * the server-side chain enum so the SDK can never advertise a chain the API
 * rejects (the bug that broke Solana scoring).
 */
export const SUPPORTED_CHAINS = ["base", "ethereum", "solana"] as const;

export type Chain = (typeof SUPPORTED_CHAINS)[number];

export type TransactionType =
  | "micropayment"
  | "transfer"
  | "contract_interaction"
  | "bounty_payment"
  | string;

export interface ScoreContext {
  platform?: string;
  environment?: "sandbox" | "production";
  agent_id?: string;
}

export type RiskBand = "low" | "medium" | "high";

export interface ReasonCode {
  code: string;
  label: string;
  detail: string;
  contribution: number;
}

export interface ScoreRequest {
  wallet: {
    address: string;
    chain: Chain;
  };
  transaction: {
    to: string;
    value_usd: number;
    asset: string;
    contract_address?: string;
    method_signature?: string;
    contract_category?: string;
    transaction_type?: TransactionType;
  };
  context?: ScoreContext;
}

export interface ScoreResponse {
  score: number;
  band: RiskBand;
  /** The chain the wallet was scored on, echoed back from the request. */
  chain: Chain;
  reason_codes: ReasonCode[];
  baseline_summary: {
    wallet_tx_count: number;
    is_cold_start: boolean;
  };
  screened_transaction_id?: string;
  /** Present when the score was made with a per-agent API key. */
  agent_key_id?: string;
  /** True when using the public sandbox key — score is live but not saved. */
  sandbox?: boolean;
}

export type FeedbackLabel =
  | "false_positive"
  | "false_negative"
  | "confirmed_malicious"
  | "confirmed_benign";

export type FeedbackLabelSource =
  | "integrator_dashboard"
  | "community"
  | "automated";

export interface FeedbackRequest {
  screened_transaction_id: string;
  label: FeedbackLabel;
  label_source: FeedbackLabelSource;
  notes?: string;
}

export interface FeedbackResponse {
  id: string;
  screened_transaction_id: string;
  label: FeedbackLabel;
  label_source: FeedbackLabelSource;
  notes: string | null;
  created_at: string;
}

export interface WalletPrintClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface ProposedEvmTransaction {
  to: string;
  value?: bigint | string | number;
  data?: string;
  contract_address?: string;
  method_signature?: string;
  contract_category?: string;
}

export interface MapTransactionOptions {
  walletAddress: string;
  chain: Chain;
  transaction: ProposedEvmTransaction;
  valueUsd: number;
  asset?: string;
  transactionType?: TransactionType;
  context?: ScoreContext;
}

export interface ScreenHookOptions extends MapTransactionOptions {
  onScore?: (result: ScoreResponse) => void;
}

export interface ZeroDevWrapperOptions {
  client: import("./client.js").WalletPrintClient;
  walletAddress: string;
  chain: Chain;
  getValueUsd: (transaction: ProposedEvmTransaction) => number | Promise<number>;
  asset?: string;
  transactionType?: TransactionType;
  context?: ScoreContext;
  onScore?: (result: ScoreResponse) => void;
}

export interface SolanaMiddlewareOptions {
  client: import("./client.js").WalletPrintClient;
  walletAddress: string;
  getValueUsd?: (
    transaction: import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction,
  ) => number | Promise<number>;
  asset?: string;
  transactionType?: TransactionType;
  context?: ScoreContext;
  onScore?: (result: ScoreResponse) => void;
}

export interface LangChainToolOptions {
  client: import("./client.js").WalletPrintClient;
  walletAddress: string;
  chain: Chain;
  getValueUsd?: (input: {
    to: string;
    value_usd: number;
    asset: string;
  }) => number | Promise<number>;
  defaultAsset?: string;
  context?: ScoreContext;
}
