# Compliance & Audit Export

WalletPrint helps integrators demonstrate human oversight of agentic wallet activity. This is **supporting documentation** for compliance programs — not a legal certification or attestation.

Regulatory frameworks such as the EU AI Act (Article 14) and NIST AI RMF increasingly expect organizations to show that automated systems operating with significant autonomy have meaningful human oversight. WalletPrint's audit export packages data you already collect during normal operation.

## What the export contains

Each audit record includes:

| Field | Description |
| --- | --- |
| `screened_transaction_id` | Unique ID for the scored transaction |
| `screened_at` | When WalletPrint scored the transaction |
| `wallet_address` | Source wallet address |
| `chain` | `base` or `ethereum` |
| `to_address` | Proposed recipient |
| `value_usd` | Transfer amount in USD |
| `asset` | Token or asset symbol |
| `contract_address` | Contract involved, if any |
| `contract_category` | Classified contract type, if any |
| `score` | Risk score (0–100) |
| `band` | `low`, `medium`, or `high` |
| `reason_codes` | Explainable rule triggers (JSON) |
| `human_decision` | Feedback label, if submitted |
| `human_decision_at` | When the human decision was recorded |
| `human_decision_source` | Who submitted the label (`integrator_dashboard`, `community`, `automated`) |
| `human_decision_notes` | Free-text notes from the reviewer |

When you wire WalletPrint into an approval flow (see [approval-flow.md](./approval-flow.md)), human decisions logged via `/v1/feedback` appear in the export automatically.

## Export endpoint

```bash
curl "https://walletprint.up.railway.app/v1/audit-export?from=2025-06-01T00:00:00Z&to=2025-06-30T23:59:59Z&format=json" \
  -H "x-api-key: YOUR_PRODUCTION_API_KEY"
```

Query parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `from` | No | Start of date range (ISO 8601). Defaults to 30 days before `to`. |
| `to` | No | End of date range (ISO 8601). Defaults to now. |
| `wallet` | No | Filter to a specific wallet address |
| `format` | No | `json` (default) or `csv` |

JSON response:

```json
{
  "records": [ ... ],
  "from": "2025-06-01T00:00:00.000Z",
  "to": "2025-06-30T23:59:59.000Z",
  "count": 42
}
```

CSV export:

```bash
curl "https://walletprint.up.railway.app/v1/audit-export?format=csv" \
  -H "x-api-key: YOUR_PRODUCTION_API_KEY" \
  -o walletprint-audit.csv
```

Production API keys only. Sandbox keys cannot export audit data.

## How this maps to oversight requirements

WalletPrint audit exports are designed to support common oversight documentation needs:

- **Traceability** — Every scored transaction has a timestamp, score, and explainable reason codes.
- **Human review evidence** — Feedback labels record who reviewed a flagged transaction and when.
- **Explainability** — Reason codes are plain English, not opaque model outputs.
- **Retention** — Exports can be pulled on demand for your own archival systems.

Integrators remain responsible for their compliance programs, retention policies, and legal obligations. WalletPrint provides structured data to support those programs.

## Recommended workflow

1. Score transactions via SDK or API before signing.
2. Route medium/high band alerts to your approval system via webhooks.
3. Log human decisions via `/v1/feedback`.
4. Pull periodic audit exports for internal review or external audit requests.
5. Archive exports in your own compliance storage.

## Enterprise buyers

If you need audit export capabilities for a procurement or security review, contact us through [walletprint.vercel.app/contact](https://walletprint.vercel.app/contact). A production API key with persistence enabled is required.
