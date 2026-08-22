# AddTrak

Business-first AddTrak application. Businesses can create secure accounts, submit a profile, and add slow-moving inventory offers with proposed customer membership credits.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add Clerk and Postgres/Neon credentials
4. Run `db/schema.sql` against the database once
5. Start: `npm run dev`

## Vercel setup

- Connect the GitHub repository to Vercel.
- Add Clerk from the Vercel Marketplace.
- Add a Neon Postgres database from the Vercel Marketplace.
- Confirm the environment variables from `.env.example` exist.
- Run `db/schema.sql`, then redeploy.

Until credentials are connected, the protected dashboard displays a setup notice instead of pretending to store accounts.
