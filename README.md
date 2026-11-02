# AddTrak

AddTrak supports secure member and business profiles. Members can track annual memberships, qualifying purchases, rewards, and remaining membership cost. Businesses can submit slow-moving inventory offers and manage Stripe subscription billing.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add Clerk, Postgres/Neon, and Stripe credentials from `.env.example`
4. Run `db/schema.sql` against the database once
5. Start: `npm run dev`

## Vercel setup

- Connect the GitHub repository to Vercel.
- Add Clerk from the Vercel Marketplace.
- Add a Neon Postgres database from the Vercel Marketplace.
- Confirm the environment variables from `.env.example` exist.
- Run `db/schema.sql`, then redeploy.
- Create a recurring Stripe Price and store it as `STRIPE_BUSINESS_PRICE_ID`.
- Add `/api/stripe/webhook` as a Stripe webhook endpoint. Subscribe to Checkout completion, subscription lifecycle, invoice paid/failed, customer updates, refunds, disputes, and early fraud warnings.
- Store the Stripe key and webhook secret as Vercel sensitive environment variables. Prefer a restricted key with only the permissions this integration uses.

Stripe Tax is not enabled by the code. Before collecting tax on recurring plans, configure the required tax registrations and then explicitly enable Stripe Tax.

Until credentials are connected, the protected dashboard displays a setup notice instead of pretending to store accounts.
