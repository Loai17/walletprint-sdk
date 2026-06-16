# LangChain Tool Example

```bash
npm install
WALLETPRINT_API_KEY=your_key npm start
```

This creates a framework-agnostic WalletPrint score tool.

If you install `@langchain/core`, you can also use:

```ts
import { createLangChainDynamicTool } from "@walletprint/sdk";

const tool = await createLangChainDynamicTool({
  client,
  walletAddress: "0xYourAgentWallet",
  chain: "base",
});
```

Add the resulting tool before any transaction-signing or wallet-send tool.
