# ZeroDev Wrapper Example

```bash
npm install
WALLETPRINT_API_KEY=your_key npm start
```

This example wraps a mock `sendTransaction()` function. In a real ZeroDev app, replace:

```js
mockZeroDevSendTransaction
```

with:

```js
sessionKeyClient.sendTransaction
```

WalletPrint screens before sending and returns the advisory score alongside the send result.
