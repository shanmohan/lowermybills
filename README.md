# LowerMyBills

Upload your electricity bill → AI reads it → compares it against Australian retailers →
recommends the best-value plan for your household, with an honest savings estimate.

Built with **Next.js (App Router)**, **Auth.js** (Google SSO + demo fallback), the
**Anthropic Claude** API, and **Tailwind CSS**. Designed to expand to gas, mortgage and phone
bills.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

Open http://localhost:3000.

### Minimum to run tonight

| Variable            | Needed for                | How to get it |
| ------------------- | ------------------------- | ------------- |
| `ANTHROPIC_API_KEY` | The actual bill analysis  | https://console.anthropic.com/settings/keys |
| `AUTH_SECRET`       | Sessions / sign-in        | `npx auth secret` (or `openssl rand -base64 32`) |

With just those two set, the app runs with the **one-click Demo login** — no Google account
needed. Add Google later (below) and the Google button appears automatically.

> A starter `.env.local` was generated for you with an `AUTH_SECRET` already filled in and the
> demo login enabled. You only need to paste your `ANTHROPIC_API_KEY`.

### Enabling Google SSO (do this when ready)

1. Go to https://console.cloud.google.com/apis/credentials → **Create credentials → OAuth client ID → Web application**.
2. Authorised redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Prod:  `https://YOURDOMAIN/api/auth/callback/google`
3. Put the client ID/secret in `.env.local` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
4. Restart `npm run dev`. The Google button now appears; set `ENABLE_DEMO_LOGIN=false` to turn
   off the demo login in production.

---

## How it works

```
Browser ──upload bill──▶ /api/analyze (auth-gated)
                              │
                              ├─ reads PDF/image bytes
                              ├─ sends to Claude with the AU plan catalogue + instructions
                              └─ returns a structured AnalysisResult (validated by Zod)
```

- **Plan catalogue:** [`src/data/electricity-plans.json`](src/data/electricity-plans.json) —
  curated *indicative* seed data for major AU retailers. **These are not live market rates.**
  Swap for AER *Energy Made Easy* / CDR data before relying on exact pricing. The UI and the
  model both disclose this.
- **Analysis prompt + Claude call:** [`src/lib/anthropic.ts`](src/lib/anthropic.ts) — uses
  `claude-opus-4-8` by default (override with `ANTHROPIC_MODEL`, e.g. `claude-sonnet-4-6` for
  lower cost). Output is constrained to a schema via Anthropic structured outputs.
- **Result shape:** [`src/lib/schema.ts`](src/lib/schema.ts).

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add the same env vars (`ANTHROPIC_API_KEY`, `AUTH_SECRET`, and Google vars when ready) in
   the Vercel project settings.
4. Set your Google OAuth redirect URI to your Vercel/prod domain (see above).
5. Deploy. Point your domain at it when you've got one.

---

## Roadmap

- [ ] Live plan data via AER Energy Made Easy / Consumer Data Right
- [ ] Persist users + bill history (Postgres — Neon/Supabase)
- [ ] Gas, mortgage, phone & internet, insurance categories
- [ ] Email the report / "switch for me" concierge flow

---

## Disclaimer

LowerMyBills provides general information only, based on indicative plan data, and is **not
financial advice**. Always confirm current rates and terms directly with the retailer before
switching.
