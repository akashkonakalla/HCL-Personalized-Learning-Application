-- ═══════════════════════════════════════════════════════
-- database/init.sql — Personalized Learning AI Supabase Schema
-- Run this in your Supabase SQL Editor to initialize the DB
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ──────────────────────────────────────────────
-- Table: users
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT        NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 80),
    email         TEXT        NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own row
CREATE POLICY "Users can view own record"
    ON public.users FOR SELECT
    USING (true);  -- service key bypasses RLS anyway

CREATE POLICY "Users can update own record"
    ON public.users FOR UPDATE
    USING (auth.uid()::text = id::text);


-- ──────────────────────────────────────────────
-- Table: learning_history
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_history (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    topic      TEXT        NOT NULL CHECK (char_length(topic) >= 1 AND char_length(topic) <= 120),
    score      INTEGER     NOT NULL CHECK (score >= 0 AND score <= 10),
    level      TEXT        NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Expert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user history lookups
CREATE INDEX IF NOT EXISTS idx_learning_history_user_id
    ON public.learning_history (user_id, created_at DESC);

-- Row Level Security
ALTER TABLE public.learning_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
    ON public.learning_history FOR SELECT
    USING (true);  -- service key bypasses RLS

CREATE POLICY "Users can insert own history"
    ON public.learning_history FOR INSERT
    WITH CHECK (true);


-- ──────────────────────────────────────────────
-- Helpful views
-- ──────────────────────────────────────────────

-- View: User stats summary
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
    u.id                                    AS user_id,
    u.name,
    u.email,
    COUNT(h.id)                             AS total_sessions,
    ROUND(AVG(h.score), 1)                  AS avg_score,
    MAX(h.created_at)                       AS last_session_at,
    COUNT(CASE WHEN h.level = 'Expert'       THEN 1 END) AS expert_sessions,
    COUNT(CASE WHEN h.level = 'Intermediate' THEN 1 END) AS intermediate_sessions,
    COUNT(CASE WHEN h.level = 'Beginner'     THEN 1 END) AS beginner_sessions
FROM public.users u
LEFT JOIN public.learning_history h ON h.user_id = u.id
GROUP BY u.id, u.name, u.email;


-- ──────────────────────────────────────────────
-- Sample Data (optional — remove in production)
-- ──────────────────────────────────────────────
-- INSERT INTO public.users (name, email, password_hash)
-- VALUES ('Test User', 'test@example.com', '$2b$12$placeholder_hash');
