-- Recipro V3 cloud sync schema (Supabase / Postgres).
-- Run this in the Supabase SQL editor to set up or RESET the database.
--
-- This script safely drops ALL old tables (V1 + V2) before creating the V3 schema.
-- The app is pre-launch with no real user data, so this is safe.

-- Drop V1 legacy tables (profiles, event_members, contacts)
DROP TABLE IF EXISTS transaction_contacts CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS event_members CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Also drop the V2 Express ephemeral tables if they exist
DROP TABLE IF EXISTS ephemeral_transactions CASCADE;
DROP TABLE IF EXISTS ephemeral_events CASCADE;

-- ============================================================
-- V3 Schema: Lean Ephemeral Cloud
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    theme TEXT DEFAULT 'happy',
    paynow_type TEXT,      -- 'mobile' | 'uen' | null
    paynow_proxy TEXT,     -- mobile number or UEN
    pin TEXT NOT NULL,      -- 4-6 digit join/admin PIN
    members JSONB DEFAULT '[]'::jsonb,  -- family members e.g. ["Groom","Bride"]
    owner_id UUID,         -- links to auth.users for ownership
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_tel TEXT,
    relation TEXT,                -- picked from event members dropdown
    amount NUMERIC(10, 2) NOT NULL,
    method TEXT DEFAULT 'cash',   -- 'cash' | 'paynow'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_event_id_idx ON transactions(event_id);

-- Realtime for live ledger sync across devices.
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- RLS: enabled but fully open (PIN is the real gate). Tighten later if needed.
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_anon_all ON events;
CREATE POLICY events_anon_all ON events
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS events_auth_all ON events;
CREATE POLICY events_auth_all ON events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS transactions_anon_all ON transactions;
CREATE POLICY transactions_anon_all ON transactions
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS transactions_auth_all ON transactions;
CREATE POLICY transactions_auth_all ON transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS event_guests (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    relation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_guests_event_id_idx ON event_guests(event_id);

ALTER TABLE event_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_guests_anon_all ON event_guests;
CREATE POLICY event_guests_anon_all ON event_guests
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS event_guests_auth_all ON event_guests;
CREATE POLICY event_guests_auth_all ON event_guests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
