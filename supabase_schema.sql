-- Supabase Database Schema and RLS Policies setup for IPTV Zone
-- Copy and run this script in the SQL Editor of your Supabase Dashboard.

-- 1. Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "channelCount" INTEGER NOT NULL DEFAULT 0
);

-- 2. Create channels table
CREATE TABLE IF NOT EXISTS channels (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "logo" TEXT,
  "group" TEXT,
  "originalGroup" TEXT,
  "playlistId" TEXT REFERENCES playlists("id") ON DELETE CASCADE,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isFifa" BOOLEAN NOT NULL DEFAULT false,
  "score" INTEGER NOT NULL DEFAULT 0,
  "isDead" BOOLEAN NOT NULL DEFAULT false,
  "starredAt" TEXT,
  "createdAt" TEXT NOT NULL
);

-- 3. Create settings table
CREATE TABLE IF NOT EXISTS settings (
  "id" TEXT PRIMARY KEY, -- Will always be 'settings'
  "siteTitle" TEXT NOT NULL,
  "bannerUrl" TEXT NOT NULL,
  "bannerTitle" TEXT NOT NULL,
  "bannerSubtitle" TEXT NOT NULL,
  "featuredGroup" TEXT NOT NULL,
  "fifaKeywords" TEXT NOT NULL,
  "autoRemoveDead" BOOLEAN NOT NULL DEFAULT true
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security (RLS) Policies
-- Note: The service_role key automatically bypasses RLS policies (perfect for backend server-side operations).
-- The policies below enable reading for all users, and safe, authorized write operations.

-- Playlists table policies
CREATE POLICY "Allow public read access on playlists" 
  ON playlists FOR SELECT USING (true);

CREATE POLICY "Allow authenticated/service role/anon write access on playlists" 
  ON playlists FOR ALL USING (true) WITH CHECK (true);

-- Channels table policies
CREATE POLICY "Allow public read access on channels" 
  ON channels FOR SELECT USING (true);

CREATE POLICY "Allow authenticated/service role/anon write access on channels" 
  ON channels FOR ALL USING (true) WITH CHECK (true);

-- Settings table policies
CREATE POLICY "Allow public read access on settings" 
  ON settings FOR SELECT USING (true);

CREATE POLICY "Allow authenticated/service role/anon write access on settings" 
  ON settings FOR ALL USING (true) WITH CHECK (true);

-- 6. Insert default settings if not exists
INSERT INTO settings ("id", "siteTitle", "bannerUrl", "bannerTitle", "bannerSubtitle", "featuredGroup", "fifaKeywords", "autoRemoveDead")
VALUES (
  'settings',
  'IPTV Zone',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
  'All live tv channel & Fifa world cup live stream 2026',
  'সব লাইভ টিভি চ্যানেল এক জায়গায়- খেলা, খবর, সিনেমা ও বিনোদন এখন ফ্রি স্ট্রিমিং',
  'News',
  'fifa, world cup, cup, match, live',
  true
) ON CONFLICT ("id") DO NOTHING;
