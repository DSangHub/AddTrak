CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  category TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'CA',
  zip TEXT NOT NULL,
  inventory_problem TEXT,
  membership_interest BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  original_price NUMERIC(10,2) NOT NULL CHECK (original_price >= 0),
  offer_price NUMERIC(10,2) NOT NULL CHECK (offer_price >= 0),
  membership_credit NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (membership_credit >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS offers_business_id_idx ON offers(business_id);

CREATE TABLE IF NOT EXISTS member_profiles (
  id BIGSERIAL PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  zip TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_memberships (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE SET NULL,
  membership_name TEXT NOT NULL,
  annual_cost NUMERIC(10,2) NOT NULL CHECK (annual_cost >= 0),
  reward_balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reward_balance >= 0),
  renewal_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE SET NULL,
  offer_id BIGINT REFERENCES offers(id) ON DELETE SET NULL,
  membership_id BIGINT REFERENCES member_memberships(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'founding_free';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memberships_member_id_idx ON member_memberships(member_id);
CREATE INDEX IF NOT EXISTS purchases_member_id_idx ON purchases(member_id);
CREATE INDEX IF NOT EXISTS purchases_business_id_idx ON purchases(business_id);
