# Changelog

## 0.1.4

Security: bumped transitive `langsmith` dependency to `>=0.6.0` to resolve four disclosed CVEs (prompt deserialization trust boundary, SSRF via tracing headers, streaming redaction bypass, prototype pollution). Removes deprecated `uuid@10` from the dependency tree. No changes to WalletPrint's own API or scoring logic.

## 0.1.3

Initial published release with score client, ZeroDev wrapper, and LangChain tool helpers.
