-- ============================================
-- 마이그레이션: vtubers 테이블에 slug 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. slug 컬럼 추가 (유니크, nullable로 먼저 추가)
ALTER TABLE vtubers
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. 인덱스 추가 (slug 조회 빠르게)
CREATE INDEX IF NOT EXISTS idx_vtubers_slug ON vtubers(slug);

-- 3. 기존 행들에 임시 슬러그 부여 (UUID 앞 8자리 사용)
--    이건 나중에 관리자 페이지에서 예쁜 슬러그로 바꿀 수 있음
UPDATE vtubers
SET slug = 'v-' || SUBSTRING(id::TEXT, 1, 8)
WHERE slug IS NULL;

-- 확인
SELECT id, name, slug FROM vtubers;
