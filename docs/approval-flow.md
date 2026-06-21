# Wiring WalletPrint into Your Approval Flow

WalletPrint is a **signal layer**, not an approval system. Major wallet platforms already ship human-in-the-loop approval UIs — MetaMask Agent Wallet, Cobo, Ledger, and others. Your job is to plug WalletPrint's score into whatever approval flow you already have.

## How it works

1. Your app calls `POST /v1/score` before a transaction is signed.
2. WalletPrint returns a score, risk band, reason codes, and a `screened_transaction_id`.
3. If the band is medium or high, WalletPrint can POST a webhook to your automation endpoint.
4. Your approval system (Slack, email, custom UI) presents the alert to a human.
5. The human decision is logged back via `POST /v1/feedback`.

WalletPrint never executes approve/deny logic. You own the approval UX and the final signing decision.

## Configure webhooks

Production integrators can register a webhook URL and choose which bands trigger delivery:

```bash
curl https://walletprint.up.railway.app/v1/webhook \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_PRODUCTION_API_KEY" \
  -d '{
    "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX",
    "webhook_bands": ["medium", "high"]
  }'
```

Set `"webhook_url": null` to disable webhooks.

Default bands: `medium` and `high`. Low-band scores are not delivered unless you include `"low"` in `webhook_bands`.

## Webhook payload

When a scored transaction matches your configured bands, WalletPrint POSTs JSON to your webhook URL:

```json
{
  "event": "transaction.flagged",
  "timestamp": "2025-06-20T12:00:00.000Z",
  "screened_transaction_id": "9ffc282b-ac2b-4249-999a-1b68c8a91756",
  "score": 65,
  "band": "medium",
  "reason_codes": [
    {
      "code": "NEW_RECIPIENT",
      "label": "New recipient",
      "detail": "Wallet has never sent to this address before.",
      "contribution": 15
    }
  ],
  "wallet": {
    "address": "0x1111111111111111111111111111111111111111",
    "chain": "base"
  },
  "transaction": {
    "to": "0x7777777777777777777777777777777777777777",
    "value_usd": 1000,
    "asset": "USDC"
  },
  "baseline_summary": {
    "wallet_tx_count": 18,
    "is_cold_start": false
  },
  "feedback_url": "https://walletprint.up.railway.app/v1/feedback",
  "score_url": "https://walletprint.up.railway.app/v1/score",
  "wallet_address": "0x1111111111111111111111111111111111111111",
  "chain": "base",
  "to_address": "0x7777777777777777777777777777777777777777",
  "value_usd": 1000,
  "asset": "USDC"
}
```

Top-level flat fields (`wallet_address`, `to_address`, `value_usd`, etc.) are included for Zapier, Make, and similar automation tools. Nested `wallet` and `transaction` objects preserve the full API shape.

Delivery is fire-and-forget with a 5-second timeout. Failed deliveries are logged server-side but do not affect the score response.

## Reference integration: Slack

Use a Slack Incoming Webhook or a small bot that listens for WalletPrint payloads:

```typescript
// Example: Express handler receiving WalletPrint webhooks
app.post("/walletprint/webhook", async (req, res) => {
  const payload = req.body;
  const reasons = payload.reason_codes
    .map((r: { label: string; detail: string }) => `• ${r.label}: ${r.detail}`)
    .join("\n");

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `WalletPrint flagged a ${payload.band} transaction (score ${payload.score})`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${payload.band.toUpperCase()}* score ${payload.score}\n${reasons}`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Wallet*\n\`${payload.wallet_address}\`` },
            { type: "mrkdwn", text: `*To*\n\`${payload.to_address}\`` },
            { type: "mrkdwn", text: `*Amount*\n$${payload.value_usd} ${payload.asset}` },
            { type: "mrkdwn", text: `*Chain*\n${payload.chain}` },
          ],
        },
      ],
    }),
  });

  res.sendStatus(200);
});
```

When a human approves or denies, log the outcome:

```bash
curl https://walletprint.up.railway.app/v1/feedback \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_PRODUCTION_API_KEY" \
  -d '{
    "screened_transaction_id": "SCREENED_TRANSACTION_ID",
    "label": "confirmed_benign",
    "label_source": "automated",
    "notes": "Approved via Slack #wallet-ops"
  }'
```

Labels: `false_positive`, `false_negative`, `confirmed_malicious`, `confirmed_benign`.

## Reference integration: Email (Resend)

Send an approval email with a link back to your internal review page:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/walletprint/webhook", async (req, res) => {
  const payload = req.body;
  const reviewUrl = `https://your-app.com/review/${payload.screened_transaction_id}`;

  await resend.emails.send({
    from: "WalletPrint Alerts <alerts@yourdomain.com>",
    to: ["ops@yourdomain.com"],
    subject: `[WalletPrint ${payload.band}] $${payload.value_usd} ${payload.asset} transfer proposed`,
    html: `
      <p>Score: <strong>${payload.score}</strong> (${payload.band})</p>
      <p>Wallet: ${payload.wallet_address}</p>
      <p>To: ${payload.to_address}</p>
      <p>Amount: $${payload.value_usd} ${payload.asset}</p>
      <p><a href="${reviewUrl}">Review transaction</a></p>
    `,
  });

  res.sendStatus(200);
});
```

Your review page should call `/v1/feedback` when the human makes a decision. WalletPrint does not host approval links — that stays in your infrastructure.

## Testing your webhook

1. Register your endpoint with `PATCH /v1/webhook`.
2. Score a transaction that triggers medium or high band using your production API key.
3. Confirm your endpoint receives the payload.
4. Submit feedback to close the loop.

For local development, use a tunnel (ngrok, Cloudflare Tunnel) to expose your handler.

## What WalletPrint does not do

- Host an approval UI
- Send push notifications directly
- Execute approve/deny logic on your behalf
- Block or cancel transactions

WalletPrint provides the behavioral signal and the plumbing to deliver it. Your approval system owns the human decision.
