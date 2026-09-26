-- =====================================================================================
-- SFMPL TRANSPORT MANAGEMENT SYSTEM (TMS) — 5-YEAR PRODUCTION SUPABASE SCHEMA
-- (Mirrored at /supabase/schema.sql and /supabase_schema.sql)
-- =====================================================================================

-- Enable essential enterprise PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Clean schema namespace
CREATE SCHEMA IF NOT EXISTS sfmpl;

-- =====================================================================================
-- 1. ENUMS & DOMAINS
-- =====================================================================================

DO $$ BEGIN
  CREATE TYPE sfmpl.user_role AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.common_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.so_status AS ENUM ('ACTIVE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.so_conversion AS ENUM ('YES', 'NO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.labour_type AS ENUM ('Inclusive', 'Extra');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.dispatch_status AS ENUM ('PENDING', 'DISPATCHED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.trip_status AS ENUM ('RUNNING', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sfmpl.payment_status AS ENUM ('PENDING', 'ADV_PAID', 'BAL_PAID', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================================================
-- 2. SYSTEM USERS & ROLE PERMISSIONS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS sfmpl.users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role sfmpl.user_role NOT NULL DEFAULT 'USER',
  status sfmpl.common_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant username login lookup
CREATE INDEX IF NOT EXISTS idx_users_username_status ON sfmpl.users (LOWER(username), status);

-- Seed Primary Root Superadmin and Operational Admin
-- Superadmin ID: SFMPL / Pass: sfmpl@1991
-- Admin ID: admin / Pass: admin123
INSERT INTO sfmpl.users (username, password_hash, display_name, role, status)
VALUES
  ('SFMPL', crypt('sfmpl@1991', gen_salt('bf')), 'SFMPL Super Admin', 'SUPERADMIN', 'ACTIVE'),
  ('admin', crypt('admin123', gen_salt('bf')), 'Operations Admin', 'ADMIN', 'ACTIVE')
ON CONFLICT (username) DO UPDATE
SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  password_hash = EXCLUDED.password_hash;

-- =====================================================================================
-- 3. MASTER REGISTRIES (PARTIES, PLACES, BROKERS, CARDS)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS sfmpl.parties (
  id BIGSERIAL PRIMARY KEY,
  party_name VARCHAR(255) NOT NULL,
  contact VARCHAR(64),
  gst VARCHAR(32),
  status sfmpl.common_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parties_name_trgm ON sfmpl.parties USING gin (party_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parties_gst ON sfmpl.parties (gst);

CREATE TABLE IF NOT EXISTS sfmpl.places (
  id BIGSERIAL PRIMARY KEY,
  place_name VARCHAR(255) NOT NULL,
  state_code VARCHAR(8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON sfmpl.places USING gin (place_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_state ON sfmpl.places (state_code);

CREATE TABLE IF NOT EXISTS sfmpl.brokers (
  id BIGSERIAL PRIMARY KEY,
  broker_name VARCHAR(255) NOT NULL,
  contact_no VARCHAR(64),
  primary_acc_no VARCHAR(64) NOT NULL,
  ifsc VARCHAR(32) NOT NULL,
  secondary_acc_no VARCHAR(64),
  secondary_ifsc VARCHAR(32),
  status sfmpl.common_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brokers_name_trgm ON sfmpl.brokers USING gin (broker_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_brokers_acc_no ON sfmpl.brokers (primary_acc_no, secondary_acc_no);

CREATE TABLE IF NOT EXISTS sfmpl.fleet_cards (
  id BIGSERIAL PRIMARY KEY,
  card_display VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 4. 5-YEAR HIGH-VOLUME PARTITIONED TRANSACTION TABLES
-- Declarative Range Partitioning by `created_at` prevents degradation after years of data.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS sfmpl.sales_orders (
  id BIGSERIAL,
  so_number VARCHAR(64) NOT NULL,
  party_id BIGINT,
  from_id BIGINT,
  to_id BIGINT,
  mt NUMERIC(10,3) NOT NULL DEFAULT 0,
  rate_given NUMERIC(12,2) NOT NULL DEFAULT 0,
  given_labour_type sfmpl.labour_type NOT NULL DEFAULT 'Inclusive',
  rate_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  rec_labour_type sfmpl.labour_type NOT NULL DEFAULT 'Inclusive',
  loading_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_given NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_rec NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_per_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_margin NUMERIC(14,2) NOT NULL DEFAULT 0,
  converted sfmpl.so_conversion NOT NULL DEFAULT 'NO',
  status sfmpl.so_status NOT NULL DEFAULT 'ACTIVE',
  remarks TEXT,
  allocated BOOLEAN NOT NULL DEFAULT FALSE,
  documentation_status BOOLEAN NOT NULL DEFAULT FALSE,
  mf_status BOOLEAN NOT NULL DEFAULT FALSE,
  unloading_status BOOLEAN NOT NULL DEFAULT FALSE,
  profit_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(128) NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS sfmpl.trip_dispatches (
  id BIGSERIAL,
  so_id BIGINT NOT NULL,
  so_number VARCHAR(64) NOT NULL,
  lorry_no VARCHAR(32) NOT NULL,
  allocation_date DATE,
  consignor VARCHAR(255),
  consignee VARCHAR(255),
  destination VARCHAR(255),
  broker_id BIGINT,
  broker_acc VARCHAR(64),
  broker_ifsc VARCHAR(32),
  bal_acc VARCHAR(64),
  bal_ifsc VARCHAR(32),
  broker_contact VARCHAR(64),
  driver_contact VARCHAR(64),
  loading_date DATE,
  gc_no VARCHAR(64),
  invoice_no VARCHAR(64),
  eway_bill_no VARCHAR(64),
  eway_expiry TIMESTAMPTZ,
  destination_gc VARCHAR(64),
  items TEXT,
  pkgs VARCHAR(64),
  articles VARCHAR(64),
  final_mt NUMERIC(10,3),
  dispatch_status sfmpl.dispatch_status NOT NULL DEFAULT 'PENDING',
  trip_status sfmpl.trip_status NOT NULL DEFAULT 'RUNNING',
  created_by VARCHAR(128) NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS sfmpl.money_freights (
  id BIGSERIAL,
  mf_no VARCHAR(64) NOT NULL,
  so_id BIGINT NOT NULL,
  so_number VARCHAR(64) NOT NULL,
  lorry_no VARCHAR(32) NOT NULL,
  loading_point VARCHAR(255),
  loading_clerk VARCHAR(128),
  pmt_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_mt NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_freight NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
  l_m NUMERIC(12,2) NOT NULL DEFAULT 0,
  p_m NUMERIC(12,2) NOT NULL DEFAULT 0,
  lm_d NUMERIC(12,2) NOT NULL DEFAULT 0,
  pm_d NUMERIC(12,2) NOT NULL DEFAULT 0,
  freight_mf NUMERIC(14,2) NOT NULL DEFAULT 0,
  advance NUMERIC(14,2) NOT NULL DEFAULT 0,
  diesel NUMERIC(14,2) NOT NULL DEFAULT 0,
  diesel_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  diesel_payment_type VARCHAR(32) DEFAULT 'Card',
  diesel_ref VARCHAR(128),
  diesel_card VARCHAR(128),
  other NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  loading_labour NUMERIC(12,2) NOT NULL DEFAULT 0,
  fooding NUMERIC(12,2) NOT NULL DEFAULT 0,
  con NUMERIC(12,2) NOT NULL DEFAULT 0,
  unloading NUMERIC(12,2) NOT NULL DEFAULT 0,
  xerox NUMERIC(12,2) NOT NULL DEFAULT 0,
  detention NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_point NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_chrg NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_exp NUMERIC(14,2) NOT NULL DEFAULT 0,
  extra_labour NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  bill_pmt NUMERIC(12,2) NOT NULL DEFAULT 0,
  bilti_freight NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by VARCHAR(128) NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS sfmpl.unloading_records (
  id BIGSERIAL,
  so_id BIGINT NOT NULL,
  so_number VARCHAR(64) NOT NULL,
  mf_no VARCHAR(64) NOT NULL,
  lorry_no VARCHAR(32) NOT NULL,
  unloading_date DATE NOT NULL,
  unloading_mt NUMERIC(10,3) NOT NULL DEFAULT 0,
  shortage NUMERIC(10,3) NOT NULL DEFAULT 0,
  deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by VARCHAR(128) NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS sfmpl.profits (
  id BIGSERIAL,
  so_id BIGINT NOT NULL,
  so_number VARCHAR(64) NOT NULL,
  mf_no VARCHAR(64) NOT NULL,
  bilti_freight NUMERIC(14,2) NOT NULL DEFAULT 0,
  extra_chrg NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  gp_on_sale NUMERIC(6,2) NOT NULL DEFAULT 0,
  gp_on_purchase NUMERIC(6,2) NOT NULL DEFAULT 0,
  ack_date DATE,
  created_by VARCHAR(128) NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS sfmpl.account_records (
  id BIGSERIAL,
  mf_no VARCHAR(64) NOT NULL,
  so_id BIGINT,
  so_number VARCHAR(64) NOT NULL,
  lorry_no VARCHAR(32) NOT NULL,
  loading_date DATE,
  broker_id BIGINT,
  broker_name VARCHAR(255),
  adv_acc_no VARCHAR(64),
  adv_ifsc VARCHAR(32),
  bal_acc_no VARCHAR(64),
  bal_ifsc VARCHAR(32),
  advance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  adv_paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  adv_txn_id VARCHAR(128) DEFAULT '',
  bal_paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  bal_txn_id VARCHAR(128) DEFAULT '',
  adv_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  bal_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  overall_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  settlement_date TIMESTAMPTZ,
  created_by VARCHAR(128) NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS sfmpl.audit_logs (
  id BIGSERIAL,
  table_name VARCHAR(64) NOT NULL,
  record_id BIGINT NOT NULL,
  action VARCHAR(16) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 5-Year Partitions Generation
DO $$
DECLARE
  start_year INT := 2024;
  end_year INT := 2030;
  y INT;
  t TEXT;
  tbls TEXT[] := ARRAY['sales_orders', 'trip_dispatches', 'money_freights', 'unloading_records', 'profits', 'account_records', 'audit_logs'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    FOR y IN start_year..end_year LOOP
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS sfmpl.%I_%s PARTITION OF sfmpl.%I
         FOR VALUES FROM (%L) TO (%L);',
        t, y, t,
        format('%s-01-01 00:00:00+00', y),
        format('%s-01-01 00:00:00+00', y + 1)
      );
    END LOOP;

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS sfmpl.%I_default PARTITION OF sfmpl.%I DEFAULT;',
      t, t
    );
  END LOOP;
END $$;

-- BRIN & B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_so_created_brin ON sfmpl.sales_orders USING brin (created_at);
CREATE INDEX IF NOT EXISTS idx_trips_created_brin ON sfmpl.trip_dispatches USING brin (created_at, allocation_date, loading_date);
CREATE INDEX IF NOT EXISTS idx_mf_created_brin ON sfmpl.money_freights USING brin (created_at);
CREATE INDEX IF NOT EXISTS idx_unl_created_brin ON sfmpl.unloading_records USING brin (created_at, unloading_date);
CREATE INDEX IF NOT EXISTS idx_profit_created_brin ON sfmpl.profits USING brin (created_at);
CREATE INDEX IF NOT EXISTS idx_acct_created_brin ON sfmpl.account_records USING brin (created_at, settlement_date);
CREATE INDEX IF NOT EXISTS idx_audit_created_brin ON sfmpl.audit_logs USING brin (created_at);

CREATE INDEX IF NOT EXISTS idx_so_number ON sfmpl.sales_orders (so_number);
CREATE INDEX IF NOT EXISTS idx_so_party_created ON sfmpl.sales_orders (party_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_status_conv ON sfmpl.sales_orders (status, converted);

CREATE INDEX IF NOT EXISTS idx_trips_so_id ON sfmpl.trip_dispatches (so_id);
CREATE INDEX IF NOT EXISTS idx_trips_lorry_no ON sfmpl.trip_dispatches (lorry_no);
CREATE INDEX IF NOT EXISTS idx_trips_gc_no ON sfmpl.trip_dispatches (gc_no);
CREATE INDEX IF NOT EXISTS idx_trips_status ON sfmpl.trip_dispatches (trip_status, dispatch_status);

CREATE INDEX IF NOT EXISTS idx_mf_no ON sfmpl.money_freights (mf_no);
CREATE INDEX IF NOT EXISTS idx_mf_so_id ON sfmpl.money_freights (so_id);
CREATE INDEX IF NOT EXISTS idx_mf_lorry_no ON sfmpl.money_freights (lorry_no);

CREATE INDEX IF NOT EXISTS idx_acct_mf_no ON sfmpl.account_records (mf_no);
CREATE INDEX IF NOT EXISTS idx_acct_status ON sfmpl.account_records (overall_status, adv_status, bal_status);

CREATE INDEX IF NOT EXISTS idx_trips_lorry_trgm ON sfmpl.trip_dispatches USING gin (lorry_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trips_dest_trgm ON sfmpl.trip_dispatches USING gin (destination gin_trgm_ops);

-- Materialized View for 5-Year KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS sfmpl.mv_monthly_executive_kpis AS
SELECT
  DATE_TRUNC('month', p.created_at) AS month_start,
  COUNT(DISTINCT p.so_id) AS total_orders,
  COUNT(DISTINCT p.mf_no) AS total_trips,
  COALESCE(SUM(p.total_revenue), 0) AS gross_revenue,
  COALESCE(SUM(p.total_cost), 0) AS total_operational_cost,
  COALESCE(SUM(p.gross_profit), 0) AS net_gross_profit,
  CASE
    WHEN SUM(p.total_revenue) > 0 THEN ROUND((SUM(p.gross_profit) / SUM(p.total_revenue) * 100)::numeric, 2)
    ELSE 0
  END AS avg_margin_pct
FROM sfmpl.profits p
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month_start DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_kpis_month ON sfmpl.mv_monthly_executive_kpis (month_start);

-- Row Level Security
ALTER TABLE sfmpl.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.trip_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.money_freights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.unloading_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.profits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfmpl.account_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION sfmpl.get_current_role()
RETURNS sfmpl.user_role AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), '')::sfmpl.user_role,
    'USER'::sfmpl.user_role
  );
EXCEPTION WHEN OTHERS THEN
  RETURN 'USER'::sfmpl.user_role;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE POLICY superadmin_all_so ON sfmpl.sales_orders FOR ALL TO authenticated
  USING (sfmpl.get_current_role() = 'SUPERADMIN');

CREATE POLICY superadmin_all_trips ON sfmpl.trip_dispatches FOR ALL TO authenticated
  USING (sfmpl.get_current_role() = 'SUPERADMIN');

CREATE POLICY superadmin_all_mf ON sfmpl.money_freights FOR ALL TO authenticated
  USING (sfmpl.get_current_role() = 'SUPERADMIN');

CREATE POLICY superadmin_all_acct ON sfmpl.account_records FOR ALL TO authenticated
  USING (sfmpl.get_current_role() = 'SUPERADMIN');

CREATE POLICY admin_select_so ON sfmpl.sales_orders FOR SELECT TO authenticated
  USING (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN', 'USER'));

CREATE POLICY admin_insert_so ON sfmpl.sales_orders FOR INSERT TO authenticated
  WITH CHECK (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN'));

CREATE POLICY admin_select_trips ON sfmpl.trip_dispatches FOR SELECT TO authenticated
  USING (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN', 'USER'));

CREATE POLICY admin_insert_trips ON sfmpl.trip_dispatches FOR INSERT TO authenticated
  WITH CHECK (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN'));

CREATE POLICY admin_select_mf ON sfmpl.money_freights FOR SELECT TO authenticated
  USING (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN', 'USER'));

CREATE POLICY admin_insert_mf ON sfmpl.money_freights FOR INSERT TO authenticated
  WITH CHECK (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN'));

CREATE POLICY admin_select_acct ON sfmpl.account_records FOR SELECT TO authenticated
  USING (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN', 'USER'));

CREATE POLICY admin_insert_acct ON sfmpl.account_records FOR INSERT TO authenticated
  WITH CHECK (sfmpl.get_current_role() IN ('SUPERADMIN', 'ADMIN'));

-- Grant permissions for Supabase standard roles
GRANT USAGE ON SCHEMA sfmpl TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA sfmpl TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sfmpl TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA sfmpl TO authenticated, service_role;
