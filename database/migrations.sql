-- ============================================================
-- BookSphere Database Migration v1.0
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT DEFAULT 'Unknown Author',
  file_url TEXT,
  file_type TEXT,
  cover_color TEXT DEFAULT '#1a3a5c',
  genre TEXT DEFAULT 'educational',
  genre_confidence FLOAT DEFAULT 0.0,
  summary TEXT,
  themes JSONB DEFAULT '[]'::jsonb,
  characters JSONB DEFAULT '[]'::jsonb,
  key_frameworks JSONB DEFAULT '[]'::jsonb,
  business_insights JSONB DEFAULT '[]'::jsonb,
  key_quotes JSONB DEFAULT '[]'::jsonb,
  chapter_breakdown JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  full_analysis JSONB DEFAULT '{}'::jsonb,
  tone TEXT,
  setting JSONB DEFAULT '{}'::jsonb,
  word_count INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book chunks for RAG (full-text search)
CREATE TABLE IF NOT EXISTS book_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  chapter_title TEXT DEFAULT '',
  page_estimate INTEGER DEFAULT 0,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS book_chunks_tsv_idx ON book_chunks USING gin(tsv);
CREATE INDEX IF NOT EXISTS book_chunks_book_id_idx ON book_chunks(book_id);
CREATE INDEX IF NOT EXISTS book_chunks_book_chunk_idx ON book_chunks(book_id, chunk_index);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  visualization_type TEXT,
  visualization_html TEXT,
  business_insight TEXT,
  suggested_followups JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, created_at);

-- Stories (generated storytelling outputs)
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  story_title TEXT,
  input_data JSONB DEFAULT '{}'::jsonb,
  slides JSONB DEFAULT '[]'::jsonb,
  map_data JSONB DEFAULT '{}'::jsonb,
  reading_time_estimate TEXT DEFAULT '4 minutes',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stories_user_book_idx ON stories(user_id, book_id);

-- Reading progress
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  current_chunk INTEGER DEFAULT 0,
  highlights JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Chennai knowledge base
CREATE TABLE IF NOT EXISTS chennai_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  area_type TEXT NOT NULL,
  description TEXT,
  lat FLOAT,
  lng FLOAT,
  tags TEXT[] DEFAULT '{}',
  storytelling_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users see only their own data)
CREATE POLICY "Users manage own books" ON books FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own chunks" ON book_chunks FOR SELECT
  USING (book_id IN (SELECT id FROM books WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own messages" ON messages FOR ALL
  USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own stories" ON stories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own progress" ON reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone reads chennai" ON chennai_areas FOR SELECT USING (true);
