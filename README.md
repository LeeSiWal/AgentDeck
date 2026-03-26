# AgentDeck

AI 에이전트를 브라우저에서 관리하는 터미널 대시보드.

Claude Code, Gemini CLI, Codex CLI 등 AI 코딩 에이전트를 한 화면에서 실행하고 모니터링합니다.
Go 단일 바이너리로 빌드되어 설치가 간편합니다.

![Go](https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57?logo=sqlite&logoColor=white)

---

## 주요 기능

- **멀티 에이전트** — 여러 AI 에이전트를 동시에 실행/모니터링
- **웹 터미널** — xterm.js 기반 실시간 터미널 (Interactive/Chat 모드)
- **파일 탐색기** — 프로젝트 파일 탐색/편집/생성/삭제
- **도트 캐릭터** — 에이전트 활동을 픽셀 애니메이션으로 시각화 (Default/Cat 테마)
- **슬래시 자동완성** — `~/.claude/commands`, `agents`, `skills` 자동 감지
- **사운드** — 레트로 게임 스타일 효과음 (도구별 고유 사운드)
- **원클릭 실행** — 바이너리 더블클릭 → 브라우저 자동 열기 → PIN 자동 생성
- **단일 바이너리** — Go 바이너리에 프론트엔드가 임베드, 외부 의존성 없음

---

## 설치

### 원클릭 설치 (권장)

**macOS / Linux:**
```bash
git clone https://github.com/siwal/agentdeck-go.git
cd agentdeck-go
./install.sh
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/siwal/agentdeck-go.git
cd agentdeck-go
.\install.ps1
```

설치 스크립트가 자동으로 처리하는 것:
- Homebrew (macOS) / WSL (Windows) 설치
- tmux, Go, Node.js, pnpm 설치
- 프로젝트 빌드
- `~/.agentdeck/`에 바이너리 설치
- 바탕화면 바로가기 생성 (macOS: `.command` + `.app`, Windows: `.bat`)

### 수동 설치

필요 도구: `go 1.23+`, `pnpm`, `tmux`

```bash
git clone https://github.com/siwal/agentdeck-go.git
cd agentdeck-go
make setup    # 의존성 설치
make build    # 빌드
./agentdeck   # 실행
```

---

## 실행

### 첫 실행

바이너리를 실행하면 자동으로:

1. PIN 6자리 자동 생성
2. JWT 시크릿 자동 생성
3. `.env` 파일 자동 저장
4. 브라우저 자동 열기

```
  ================================================
     AgentDeck - AI Agent Terminal Manager
  ================================================

     URL :  http://localhost:33033
     PIN :  847293

  ** First run! PIN has been auto-generated. **

     Browser will open automatically.
     Press Ctrl+C to stop the server.

  ================================================
```

터미널에 표시된 PIN을 브라우저에 입력하면 바로 사용 가능합니다.

### 이후 실행

- **macOS:** 바탕화면 `AgentDeck.command` 더블클릭 또는 `~/Applications`의 AgentDeck 앱
- **Windows:** 바탕화면 `AgentDeck.bat` 더블클릭
- **터미널:** `~/.agentdeck/agentdeck` 또는 `./agentdeck`

한 번 로그인하면 7일간 재로그인 불필요 (JWT).

---

## 사용법

### 1. 프로젝트 선택

첫 화면에서 프로젝트를 선택합니다:
- **최근 프로젝트** — 이전에 열었던 프로젝트 바로 열기
- **폴더 탐색** — 파일 브라우저로 선택
- **직접 입력** — 경로 직접 입력 (예: `~/code/my-project`)
- **새 프로젝트 만들기** — 폴더 생성

### 2. 에이전트 실행

프로젝트를 선택하면 에이전트 타입을 고릅니다:
- **Claude Code** — Anthropic의 AI 코딩 에이전트
- **Gemini CLI** — Google의 AI CLI
- **Codex CLI** — OpenAI의 AI CLI
- **Custom** — 원하는 커맨드 직접 입력

### 3. 터미널 사용

| 모드 | 설명 |
|------|------|
| **CHAT** (기본) | 하단 입력창으로 명령 입력. `/`로 슬래시 커맨드 자동완성 |
| **RAW** | 터미널 직접 입력. 일반 터미널처럼 사용 |

- 방향키로 선택지 선택 가능 (Chat 모드에서도 동작)
- `Shift+Enter`로 멀티라인 입력
- 긴 프롬프트도 전송 가능 (자동 청크 분할)

### 4. 패널

- **Files** — 좌측 파일 탐색기 (파일 보기/편집/생성/삭제)
- **Anim** — 우측 애니메이션 패널 (도트 캐릭터 + 캐릭터 테마 설정)
- 패널 크기 드래그로 조절 가능

### 5. 대시보드

여러 에이전트를 동시에 관리:
- 그리드/리스트 뷰
- `+` 버튼으로 에이전트 바로 생성
- 에이전트 상태 실시간 표시

---

## 설정

### 환경변수 (`.env`)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AGENTDECK_PIN` | (자동 생성) | 로그인 PIN 6자리 |
| `AGENTDECK_JWT_SECRET` | (자동 생성) | JWT 서명 키 |
| `AGENTDECK_PORT` | `33033` | 서버 포트 |
| `AGENTDECK_DB_PATH` | `./agentdeck.db` | SQLite 데이터베이스 경로 |
| `AGENTDECK_CORS_ORIGINS` | `http://localhost:33033` | CORS 허용 origin |

첫 실행 시 자동 생성되며, 직접 편집도 가능합니다.

### PM2로 상시 실행

```bash
pm2 start ./agentdeck --name agentdeck
pm2 save
pm2 startup  # 재부팅 후 자동 시작
```

---

## 기술 스택

### 서버 (Go)
- **Gorilla Mux** — HTTP 라우터
- **Gorilla WebSocket** — 실시간 통신
- **SQLite** (mattn/go-sqlite3) — 에이전트/프로젝트/로그 저장
- **creack/pty** — 터미널 PTY 관리
- **tmux** — 에이전트 세션 관리
- **fsnotify** — 파일 변경 감지
- **JWT** (golang-jwt) — 인증

### 클라이언트 (React + TypeScript)
- **Vite** — 빌드 도구
- **React Router v6** — 클라이언트 라우팅
- **Zustand** — 상태 관리
- **xterm.js** — 웹 터미널
- **Tailwind CSS** — 스타일링
- **Web Audio API** — 효과음

### 빌드 결과물
- Go 바이너리 1개 (프론트엔드 임베드)
- SQLite DB 파일 1개
- `.env` 설정 파일 1개

---

## 프로젝트 구조

```
agentdeck-go/
├── server/                 # Go 백엔드
│   ├── main.go            # 엔트리포인트 + 라우터
│   ├── auth/              # JWT 인증
│   ├── config/            # 환경변수 로드
│   ├── db/                # SQLite + 마이그레이션
│   ├── handlers/          # HTTP 핸들러
│   ├── middleware/         # CORS, Helmet, Rate Limiter
│   ├── services/          # 비즈니스 로직 (Agent, File, Project, PTY, Tmux)
│   └── ws/                # WebSocket 허브
├── client/                 # React 프론트엔드
│   └── src/
│       ├── components/    # UI 컴포넌트
│       │   ├── agent/     # 에이전트 카드, 런처, 생성 시트
│       │   ├── animation/ # 도트 캐릭터, 오비탈, 타임라인
│       │   ├── file/      # 파일 탐색기, 에디터, 프리뷰
│       │   ├── terminal/  # 터미널 뷰, 입력, 모바일 툴바
│       │   └── layout/    # 네비게이션, 사이드바
│       ├── hooks/         # React 훅
│       ├── lib/           # API, WebSocket, 사운드, 팔레트
│       ├── stores/        # Zustand 스토어
│       └── pages/         # 페이지 컴포넌트
├── install.sh             # macOS/Linux 설치 스크립트
├── install.ps1            # Windows 설치 스크립트
├── Makefile               # 빌드 커맨드
└── .env.example           # 환경변수 예시
```

---

## 아키텍처

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │ React    │    │ AgentDeckWS  │    │ xterm.js          │  │
│  │ App      │───▶│ (WebSocket)  │◀──▶│ Terminal Emulator │  │
│  │ Zustand  │    │ ws.ts        │    │ TerminalView.tsx  │  │
│  └──────────┘    └──────┬───────┘    └───────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │ WebSocket (JSON)
                          │ ws://host:33033/ws?token=JWT
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Go Server (단일 바이너리)                                    │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ HTTP     │    │ WebSocket    │    │ Static Files     │   │
│  │ Handlers │    │ Hub          │    │ (embed.FS)       │   │
│  │ (API)    │    │              │    │ Vite Build       │   │
│  └──────────┘    └──────┬───────┘    └──────────────────┘   │
│                         │                                    │
│  ┌──────────┐    ┌──────┴───────┐    ┌──────────────────┐   │
│  │ Agent    │    │ PTY Service  │    │ Watcher Service  │   │
│  │ Service  │    │ (creack/pty) │    │ (fsnotify)       │   │
│  └──────────┘    └──────┬───────┘    └──────────────────┘   │
│                         │                                    │
│  ┌──────────┐    ┌──────┴───────┐    ┌──────────────────┐   │
│  │ SQLite   │    │ Tmux Service │    │ Auth / JWT       │   │
│  │ (WAL)    │    │              │    │                  │   │
│  └──────────┘    └──────┬───────┘    └──────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ PTY (pseudo-terminal)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  tmux session                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Claude Code / Gemini CLI / Codex CLI / Custom        │  │
│  │  (alternate screen buffer + mouse tracking)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 터미널 I/O 흐름

**입력 (사용자 → 에이전트):**
```
Browser: TerminalInput/키보드 → agentDeckWS.send('terminal:input', data)
Server:  hub.handleMessage() → ptySvc.Write(agentId, data)
PTY:     session.Ptmx.Write() → tmux → Claude Code stdin
```

**출력 (에이전트 → 사용자):**
```
PTY:     session.Ptmx.Read() → ReadPump callback
Server:  hub.BroadcastToAgent(agentId, 'terminal:output', data)
Browser: agentDeckWS.on('terminal:output') → xterm.write(data)
```

### WebSocket 이벤트

| 방향 | 이벤트 | 설명 |
|------|--------|------|
| C→S | `terminal:attach` | 터미널 연결 (agentId, cols, rows) |
| C→S | `terminal:detach` | 터미널 해제 |
| C→S | `terminal:input` | 키 입력 전송 |
| C→S | `terminal:resize` | 터미널 크기 변경 |
| C→S | `file:watch` | 파일 감시 시작 |
| S→C | `terminal:output` | 터미널 출력 스트림 |
| S→C | `agent:list/status/created/destroyed` | 에이전트 상태 변경 |
| S→C | `file:changed` | 파일 변경 알림 |

### 빌드 파이프라인

```
client/src/ ──(vite build)──▶ client/dist/
                                    │
                              (cp to server/static/)
                                    │
server/*.go + server/static/ ──(go build + embed)──▶ ./agentdeck
                                                        │
                                                  (pm2 restart)
```

### 인증

```
PIN 입력 → POST /api/auth/login → JWT (7일) + Refresh Token (30일)
         → localStorage 저장
         → API: Authorization: Bearer <token>
         → WS:  /ws?token=<token>
         → 만료 시 자동 refresh
```

---

## 라이선스

MIT
