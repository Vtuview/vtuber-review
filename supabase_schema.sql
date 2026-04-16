-- ============================================
-- VTUBER ARCHIVE - Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 전체 실행
-- ============================================

-- 1. vtubers 테이블
CREATE TABLE IF NOT EXISTS vtubers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,              -- URL용 영문 슬러그 (예: banjucca, nyanya)
  name TEXT NOT NULL,
  agency TEXT,
  thumbnail_url TEXT,
  debut_date DATE,
  platforms JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  my_review TEXT,
  my_rating NUMERIC(3,1) DEFAULT 0 CHECK (my_rating >= 0 AND my_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vtubers_agency ON vtubers(agency);
CREATE INDEX IF NOT EXISTS idx_vtubers_tags ON vtubers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_vtubers_created ON vtubers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vtubers_slug ON vtubers(slug);

-- 2. visitor_ratings 테이블
CREATE TABLE IF NOT EXISTS visitor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vtuber_id UUID NOT NULL REFERENCES vtubers(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  visitor_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vtuber_id, visitor_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_ratings_vtuber ON visitor_ratings(vtuber_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE vtubers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vtubers_read_all" ON vtubers;
CREATE POLICY "vtubers_read_all" ON vtubers FOR SELECT USING (true);

DROP POLICY IF EXISTS "vtubers_write_authenticated" ON vtubers;
CREATE POLICY "vtubers_write_authenticated" ON vtubers
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vtubers_update_authenticated" ON vtubers;
CREATE POLICY "vtubers_update_authenticated" ON vtubers
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "vtubers_delete_authenticated" ON vtubers;
CREATE POLICY "vtubers_delete_authenticated" ON vtubers
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "ratings_read_all" ON visitor_ratings;
CREATE POLICY "ratings_read_all" ON visitor_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "ratings_insert_all" ON visitor_ratings;
CREATE POLICY "ratings_insert_all" ON visitor_ratings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ratings_update_all" ON visitor_ratings;
CREATE POLICY "ratings_update_all" ON visitor_ratings FOR UPDATE USING (true);

-- ============================================
-- Storage 버킷 (이미지/WebP/GIF 업로드용)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

DROP POLICY IF EXISTS "storage_read_all" ON storage.objects;
CREATE POLICY "storage_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "storage_insert_auth" ON storage.objects;
CREATE POLICY "storage_insert_auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-images');

DROP POLICY IF EXISTS "storage_delete_auth" ON storage.objects;
CREATE POLICY "storage_delete_auth" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "storage_update_auth" ON storage.objects;
CREATE POLICY "storage_update_auth" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'review-images');

-- ============================================
-- updated_at 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vtubers_updated_at ON vtubers;
CREATE TRIGGER vtubers_updated_at
  BEFORE UPDATE ON vtubers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
