# BankKnit

BankKnit is a consent-based Verified Name Profile network. A member requests verification from an approved participating bank or credit union. The institution performs identity verification using its own approved CIP/KYC process, then issues a public badge showing the verified name, issuer, status, issue date, and expiration date.

BankKnit deliberately does not collect identity documents, Social Security numbers, bank credentials, or account numbers.

## Product paths

- `/member/sign-up` — create a member profile
- `/member/dashboard` — find ZIP-area institutions, request verification, and share a badge
- `/bank/sign-up` — submit an institution application
- `/bank/dashboard` — review consented leads, issue/revoke badges, and pay fees
- `/verify/[slug]` — public, read-only badge status

New institution applications default to `pending_review`. An authorized operator must validate the institution and representative before changing `bank_profiles.status` to `approved`.

## Fee rules

- Standard: $125 one-time fee when the institution accepts a qualified lead.
- Premium: $250 one-time fee only when the institution confirms that an account was opened.

Each fee is recorded once in `bank_billing_events` using a unique request/type constraint. Stripe Checkout collects the fee as a one-time payment; signed webhooks update the ledger.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add the BankKnit credentials.
3. Apply `db/schema.sql` to Postgres.
4. Run `npm run dev`.

## Production setup

1. Connect the repository to Vercel.
2. Configure a dedicated BankKnit Clerk application and Postgres database.
3. Apply `db/schema.sql` and configure the environment variables in `.env.example`.
4. Connect a dedicated BankKnit Stripe account. Use a restricted production key with only the permissions required for Customers, Checkout Sessions, PaymentIntents, and Charges.
5. Register `https://YOUR_DOMAIN/api/stripe/webhook` and subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.updated`, `charge.refunded`, `charge.dispute.created`, and `radar.early_fraud_warning.created`.
6. Store Stripe and database secrets as sensitive environment variables, then redeploy.

Stripe Tax is not enabled because the correct tax treatment of lead-generation fees must be determined for the business and jurisdictions before collection.

## Trust boundary

The public badge is not government identification, a credit report, a financial guarantee, or proof that a transaction is safe. The issuing institution remains responsible for identity verification, account opening, information security, privacy, fair lending, disclosures, eligibility, and recordkeeping.
