import { z } from "zod";
import type { WalletPrintClient } from "./client.js";
import type { LangChainToolOptions, ScoreResponse } from "./types.js";

const scoreToolSchema = z.object({
  to: z.string().describe("Recipient EVM address"),
  value_usd: z.number().nonnegative().describe("USD-normalized transaction value"),
  asset: z.string().describe("Asset symbol, e.g. ETH or USDC"),
  contract_address: z.string().optional(),
  contract_category: z.string().optional(),
  method_signature: z.string().optional(),
  transaction_type: z.string().optional(),
});

export type LangChainScoreToolInput = z.infer<typeof scoreToolSchema>;

export interface WalletPrintLangChainTool {
  name: string;
  description: string;
  schema: typeof scoreToolSchema;
  invoke: (input: LangChainScoreToolInput) => Promise<ScoreResponse>;
}

/**
 * Framework-agnostic tool object. Pass to LangChain's DynamicStructuredTool
 * or call `invoke()` directly from agent middleware.
 */
export function createWalletPrintScoreTool(
  options: LangChainToolOptions,
): WalletPrintLangChainTool {
  return {
    name: "walletprint_score_transaction",
    description:
      "Screen a proposed crypto transaction for behavioral risk before signing or sending it.",
    schema: scoreToolSchema,
    invoke: async (input) => {
      const valueUsd = options.getValueUsd
        ? await options.getValueUsd(input)
        : input.value_usd;

      return options.client.score({
        wallet: {
          address: options.walletAddress,
          chain: options.chain,
        },
        transaction: {
          to: input.to,
          value_usd: valueUsd,
          asset: input.asset || options.defaultAsset || "USDC",
          contract_address: input.contract_address,
          contract_category: input.contract_category,
          method_signature: input.method_signature,
          ...(input.transaction_type ? { transaction_type: input.transaction_type } : {}),
        },
        ...(options.context ? { context: options.context } : {}),
      });
    },
  };
}

/**
 * Optional helper when @langchain/core is installed.
 */
export async function createLangChainDynamicTool(options: LangChainToolOptions) {
  const { DynamicStructuredTool } = await import("@langchain/core/tools");
  const tool = createWalletPrintScoreTool(options);

  return new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    func: async (input) => JSON.stringify(await tool.invoke(input)),
  });
}
