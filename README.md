# VTUBER ARCHIVE

버추얼 스트리머 개인 리뷰/아카이브 사이트. Netlify + Supabase 기반 무료 호스팅.

## ✨ 주요 기능

- **갤러리 뷰**: 썸네일 격자 배치, 실시간 검색, 소속사 필터
- **상세 페이지**: 마크다운 리뷰 렌더링, 이미지 라이트박스, YouTube/Twitch 자동 임베드
- **방문자 별점**: 1~5점 + 코멘트, 브라우저 지문 기반 중복 방지
- **관리자 페이지**:
  - 마크다운 에디터 (EasyMDE, 다크 테마)
  - **드래그&드롭 이미지 업로드** (WebP / GIF / PNG / JPG, 최대 10MB)
  - **클립보드 붙여넣기 업로드** (스크린샷 찍고 Ctrl+V)
  - 이미지 라이브러리: 클릭하면 마크다운 삽입, 우클릭하면 썸네일 설정
  - 실시간 프리뷰 (side-by-side)

## 🚀 셋업 가이드 (10~15분)

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 가입 → **New Project**
2. Project 생성 후 **Settings → API** 에서 복사:
   - `Project URL`
   - `anon public key`
3. **SQL Editor** → `supabase_schema.sql` 전체 붙여넣기 → **Run**
   - 이 한 번으로 테이블, RLS, **Storage 버킷(이미지 저장용)**까지 전부 생성됨

### 2. 관리자 계정

1. **Authentication → Users → Add user**
2. 이메일/비밀번호 입력 (이 계정으로만 admin.html 로그인 가능)
3. **Authentication → Providers → Email** 에서 "Confirm email" OFF

### 3. 프론트엔드 설정

`js/supabase.js` 상단 두 줄 교체:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

### 4. Netlify 배포

**드래그 앤 드롭**: netlify.com → Add new site → **Deploy manually** → 폴더 드래그 → 끝

**GitHub 연동**: 저장소 푸시 → Netlify → Import from Git → Deploy (이후 push마다 자동 배포)

## 📝 리뷰 작성법

관리자 페이지(`/admin.html`)에서 로그인 후:

### 이미지 업로드
1. **드래그 앤 드롭**: 업로드 영역에 파일 끌어놓기
2. **클릭 업로드**: 영역 클릭해서 파일 선택
3. **클립보드 붙여넣기**: 스크린샷 복사 후 페이지 어디서든 Ctrl+V
4. 업로드 완료되면 에디터 커서 위치에 자동으로 마크다운 삽입됨

### 이미지 라이브러리
- **좌클릭**: 리뷰에 이미지 삽입
- **우클릭**: 썸네일로 설정
- **✕ 버튼**: 삭제

### 마크다운 기본 문법

```markdown
## 섹션 제목
### 소제목

**굵게** *기울임* ~~취소선~~

> 인용구

- 불릿 리스트
- 항목

1. 번호 리스트
2. 항목

[링크 텍스트](https://url)

![이미지 설명](이미지 URL)

---

| 방송 | 시간 |
|------|------|
| 월요일 | 21시 |
```

### 자동 임베드

**방법 1: URL만 한 줄에 붙여넣기**

```markdown
## 데뷔 방송

https://www.youtube.com/watch?v=xxxxx

https://vod.sooplive.com/player/192718357

https://clips.twitch.tv/클립이름
```

**방법 2: 커스텀 문법**

```markdown
::soop[192718357]
::youtube[dQw4w9WgXcQ]
::twitch[AwkwardHelplessSalamanderSwiftRage]
```

**방법 3: iframe 코드 직접 붙여넣기**

SOOP에서 "공유 → iframe 복사"로 받은 코드를 그대로 에디터에 붙여넣어도 됩니다. 허용 도메인(YouTube, Twitch, SOOP)만 렌더링되고 나머지는 보안을 위해 걸러집니다.

```html
<iframe src="https://vod.sooplive.com/player/192718357/embed?showChat=false&autoPlay=true&mutePlay=true"
        frameborder="0" allowfullscreen></iframe>
```

## 🛡️ 보안

- Anon key는 공개돼도 안전 (RLS로 보호). Service Role Key는 절대 프론트에 쓰지 말 것
- `admin.html`은 공개돼 있지만 Supabase Auth 로그인 없이는 쓰기 불가
- Storage 버킷도 읽기는 public, 쓰기/삭제는 인증된 관리자만 가능
- 방문자 별점 중복 방지는 localStorage 지문 기반이라 완벽하지 않음 (시크릿 모드에선 재투표 가능)

## 📁 파일 구조

```
vtuber-review/
├── index.html              # 갤러리 페이지
├── vtuber.html             # 상세 + 별점
├── admin.html              # 관리자 (에디터 + 업로드)
├── css/style.css           # 전체 스타일 (다크 + 네온)
├── js/
│   ├── supabase.js         # DB 클라이언트
│   ├── markdown.js         # 마크다운 → HTML 렌더링 + 자동 임베드
│   ├── gallery.js          # 갤러리/검색/필터
│   ├── detail.js           # 상세 페이지 + 방문자 별점
│   └── admin.js            # 관리자 CRUD + 업로드 + 이미지 라이브러리
├── netlify.toml
├── supabase_schema.sql     # DB + Storage + RLS
└── README.md
```

## 💡 스토리지 용량 관리

Supabase 무료 티어:
- Storage: 1GB
- 대역폭: 월 5GB

- 애니메이션 WebP 기준 이미지 1장 평균 500KB~2MB → 약 500~2000장 저장 가능
- 용량 부족해지면 관리자 페이지의 이미지 라이브러리에서 안 쓰는 이미지 삭제
- 더 필요하면 Cloudflare R2 (10GB 무료)로 이전 가능

## 🎨 커스터마이징

- **색상**: `css/style.css` 상단 `:root` CSS 변수 (현재 핫핑크 + 시안)
- **폰트**: Google Fonts `@import` 라인 + `--font-display`, `--font-body`
- **소속사 필터**: `index.html`의 `filter-chip` 버튼 추가/수정
- **커스텀 도메인**: Netlify 대시보드 → Domain management
