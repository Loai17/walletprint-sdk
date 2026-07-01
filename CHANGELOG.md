# Changelog

## 0.2.0

Feature: per-agent API keys and self-serve integrator onboarding (server-side). Master integrator keys (`wp_live_…`) can create scoped agent keys (`wp_agent_…`) via `POST /v1/agent-keys`. Agent keys are limited to `POST /v1/score` and `POST /v1/feedback`, with optional wallet/chain scope and per-key rate limits. New `POST /v1/webhook/test` endpoint. Score responses may include `agent_key_id` when scored via an agent key. SDK `ScoreResponse` adds optional `agent_key_id`. Docs updated for self-serve signup at walletprint.vercel.app/dashboard/signup. No breaking SDK API changes.

## 0.1.9

Feature: optional on-chain history seeding for new wallets (server-side). The first time a wallet is scored, WalletPrint can pull its recent transaction history from Alchemy (90-day / 200-tx cap) and seed an initial behavioral baseline — so R2 (size deviation), R3 (velocity), and R6 (clustering) are useful from transaction one instead of transaction five. Seeding is fire-and-forget and best-effort: it never blocks or affects a score response, and it is on by default per integrator (`history_seeding_enabled`). The seeded baseline is kept as a floor and blended with organic screened traffic until the wallet reaches 20 real transactions, so a single real transaction can't wipe out the seed. Sandbox scoring can compute the same baseline ephemerally (never persisted). No SDK client API changes.

## 0.1.8

Feature: optional `transaction_type` (on `transaction`) and `context` (top-level) on `ScoreRequest`. Stored with each screened transaction for marketplace/agent-wallet telemetry. Does not affect R1–R6 scoring. SDK wrappers accept optional `context` and `transactionType`. Docs updated.

## 0.1.7

Feature: Solana transaction support via `createSolanaWalletPrintMiddleware` and `createSolanaLangChainTool`. Adds `"solana"` to the `Chain` type. `@solana/web3.js` is an optional peer dependency.

Security note: optional `@solana/web3.js` installs may surface GHSA-w5hq-g745-h8pq (`uuid` < 11.1.1) via `jayson` — same CVE class already mitigated for `@langchain/core`; upstream-owned, not fixable in this package without breaking Solana support.

## 0.1.6

Docs: webhook approval flow, compliance export (`GET /v1/audit-export`, `PATCH /v1/webhook`), and updated API reference. No SDK client API changes.

## 0.1.5

Security: explicitly pin `uuid` to `11.1.1` (devDependency + `@langchain/core` override) to resolve CVE-2026-41907 and deprecated `uuid@10`. No API changes.

## 0.1.4

Security: bumped transitive `langsmith` dependency to `>=0.6.0` to resolve four disclosed CVEs (prompt deserialization trust boundary, SSRF via tracing headers, streaming redaction bypass, prototype pollution). Removes deprecated `uuid@10` from the dependency tree. No changes to WalletPrint's own API or scoring logic.

## 0.1.3

Initial published release with score client, ZeroDev wrapper, and LangChain tool helpers.
