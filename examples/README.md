# Examples

These examples use the published `@walletprint/sdk` package.

Set an API key before running:

```bash
export WALLETPRINT_API_KEY=your_key
export WALLETPRINT_BASE_URL=https://walletprint.up.railway.app
```

## Examples

- `basic-score`: score one proposed transaction.
- `feedback-label`: score a transaction and submit an outcome label.
- `zerodev-wrapper`: wrap a ZeroDev-style send function.
- `langchain-tool`: create a WalletPrint score tool for agent flows.

Each example can be run with:

```bash
cd examples/basic-score
npm install
npm start
```
