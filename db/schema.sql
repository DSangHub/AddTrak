-- BankKnit runs in a private schema so its server-only data is not exposed by
-- Supabase's default public Data API. The application accesses these tables
-- only through authenticated Next.js server routes.
CREATE SCHEMA IF NOT EXISTS bankknit;
REVOKE ALL ON SCHEMA bankknit FROM PUBLIC;

CREATE TABLE IF NOT EXISTS bankknit.member_profiles (
  id BIGSERIAL PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  zip TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  public_slug TEXT UNIQUE NOT NULL,
  public_name_consent_at TIMESTAMPTZ NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','requested','verified','revoked','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bankknit.bank_profiles (
  id BIGSERIAL PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('bank','credit_union')),
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT NOT NULL,
  regulator_name TEXT NOT NULL,
  certificate_number TEXT NOT NULL,
  service_zip TEXT NOT NULL,
  service_radius_miles INTEGER NOT NULL DEFAULT 25 CHECK (service_radius_miles BETWEEN 1 AND 100),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  plan TEXT NOT NULL DEFAULT 'standard' CHECK (plan IN ('standard','premium')),
  online_application_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','suspended')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bankknit.verification_requests (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES bankknit.member_profiles(id) ON DELETE CASCADE,
  bank_id BIGINT NOT NULL REFERENCES bankknit.bank_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','verification_pending','rejected','verified','account_opened','revoked','expired')),
  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  account_opened_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, bank_id)
);

CREATE TABLE IF NOT EXISTS bankknit.verified_name_badges (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT UNIQUE NOT NULL REFERENCES bankknit.member_profiles(id) ON DELETE CASCADE,
  bank_id BIGINT NOT NULL REFERENCES bankknit.bank_profiles(id) ON DELETE RESTRICT,
  verification_request_id BIGINT UNIQUE NOT NULL REFERENCES bankknit.verification_requests(id) ON DELETE RESTRICT,
  badge_code TEXT UNIQUE NOT NULL,
  public_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bankknit.bank_billing_events (
  id BIGSERIAL PRIMARY KEY,
  bank_id BIGINT NOT NULL REFERENCES bankknit.bank_profiles(id) ON DELETE CASCADE,
  verification_request_id BIGINT NOT NULL REFERENCES bankknit.verification_requests(id) ON DELETE RESTRICT,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('qualified_lead','opened_account')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents IN (12500,25000)),
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due','paid','failed','refund_review','dispute_review','fraud_review')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (verification_request_id, fee_type)
);

CREATE TABLE IF NOT EXISTS bankknit.stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verification_requests_member_idx ON bankknit.verification_requests(member_id);
CREATE INDEX IF NOT EXISTS verification_requests_bank_idx ON bankknit.verification_requests(bank_id);
CREATE INDEX IF NOT EXISTS bank_profiles_zip_idx ON bankknit.bank_profiles(service_zip);
CREATE INDEX IF NOT EXISTS bank_billing_events_bank_idx ON bankknit.bank_billing_events(bank_id);

ALTER TABLE bankknit.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankknit.bank_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankknit.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankknit.verified_name_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankknit.bank_billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankknit.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
