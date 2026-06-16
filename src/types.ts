export type Chain = "base" | "ethereum";

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
  };
}

export interface ScoreResponse {
  score: number;
  band: RiskBand;
  reason_codes: ReasonCode[];
  baseline_summary: {
    wallet_tx_count: number;
    is_cold_start: boolean;
  };
  screened_transaction_id: string;
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
}
