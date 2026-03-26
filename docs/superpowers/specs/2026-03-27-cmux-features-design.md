# AgentDeck cmux-Style Features + Scroll Fix

## Overview

Add cmux-style UX features to AgentDeck: scroll fix, notification rings, smart sidebar with git/port metadata, CLI + REST API, built-in browser panel, command palette, panel zoom, and markdown preview.

## Phases

### Phase 1: Foundation
1. **Scroll fix** — Independent scroll contexts for 5 areas (file explorer, terminal, subagent panel, file preview, dashboard). Root cause: missing `min-height: 0` on flex containers, no `overflow` isolation, xterm.js wheel event propagation.
2. **DB schema** — Add `notifications` table with agent_id, reason, message, read, created_at.
3. **WebSocket events** — Add agent:notification, agent:notification:clear, agent:meta, agent:meta:status, agent:meta:progress, agent:meta:log event types.

### Phase 2: Backend Services
4. **Notification service** — Client-side terminal output parsing for permission_request, waiting_input, error, task_complete states. Server stores notifications in DB.
5. **Git service** — Poll active agents every 10s: branch, dirty status, ahead count via git CLI.
6. **Port scanner** — Poll every 15s: lsof (macOS) / ss (Linux) for listening ports on agent child processes.
7. **REST API** — POST /api/agents/{id}/send, GET /api/agents/{id}/meta, POST /api/agents/{id}/meta/status, POST /api/agents/{id}/meta/progress, POST /api/agents/{id}/meta/log, GET /api/notifications, POST /api/notifications/clear.

### Phase 3: Frontend Features
8. **Notification ring** — CSS box-shadow pulse animations on agent cards (orange=permission, blue=waiting, red=error, green=complete). Browser Notification API for background tabs. Unread badge on sidebar/bottom nav.
9. **Smart sidebar** — AgentMeta component showing git branch, dirty indicator, ahead count, listening ports (clickable), notification context line.
10. **Markdown preview** — react-markdown + remark-gfm for .md files in file preview area. Raw/Preview toggle. Live update via existing file:changed WebSocket events.
11. **Command palette** — Cmd+K trigger. Fuzzy search across agents, navigation, current agent actions, view toggles. Arrow key navigation, ESC to close.
12. **Panel zoom** — Cmd+Shift+Z or button to maximize any panel. CSS transition with flex animation. xterm.js fit() after transition.
13. **Browser panel** — iframe for localhost preview. Tab toggle with subagent panel. URL bar, nav buttons, port shortcuts. sandbox attribute for security.

### Phase 4: CLI
14. **CLI subcommands** — list, create, delete, send, status, logs, notifications, set-status, set-progress, log, login, open, ping, reset, version, help. Token auth stored at OS data path with 0600 permissions.

## Architecture Decisions

- **Notification detection: client-side** — Parse terminal output in React hook, not server. Reduces server load, simpler implementation.
- **Git/port polling: server-side** — Needs filesystem/process access. Push via WebSocket.
- **CLI: subcommands on same binary** — `agentdeck serve` (default) vs `agentdeck list` etc. Uses existing REST API.
- **Browser panel: iframe only** — No embedded browser engine. Localhost only. X-Frame-Options fallback to new tab link.
- **Scroll fix: CSS-only where possible** — min-height:0, overflow isolation, wheel event stopPropagation for xterm.js.

## Key Technical Details

- All flex scroll containers need `min-height: 0` + `overflow-y: auto`
- xterm.js wheel events: `stopPropagation()` to prevent leaking to parent panels
- Mobile: `touch-action: none` on terminal, `pan-y` on other panels
- Use `100dvh` with `100vh` fallback
- Panel zoom: hide other panels, call `fitAddon.fit()` after 350ms transition
- Command palette: global keydown listener, portal rendering
- Markdown: lazy-load react-markdown to avoid bundle size impact on initial load

## Dependencies Added

- Client: `react-markdown`, `remark-gfm`
- Server: no new Go dependencies (git/lsof via exec, SQLite already present)

## Files to Create/Modify

### New Server Files
- `server/services/git.go` — Git metadata polling
- `server/services/port_scanner.go` — Port scanning
- `server/services/notification.go` — Notification CRUD
- `server/handlers/meta.go` — Meta REST endpoints
- `server/handlers/notification.go` — Notification REST endpoints
- `server/cli/cli.go` — CLI entry point + subcommand router
- `server/cli/agents.go` — Agent CLI commands
- `server/cli/status.go` — Status CLI commands
- `server/cli/auth.go` — CLI auth (pin login, token storage)

### New Client Files
- `client/src/components/CommandPalette.tsx`
- `client/src/components/notification/NotificationRing.tsx`
- `client/src/components/notification/NotificationBadge.tsx`
- `client/src/components/sidebar/AgentMeta.tsx`
- `client/src/components/browser/BrowserPanel.tsx`
- `client/src/components/file/MarkdownPreview.tsx`
- `client/src/hooks/useAgentNotification.ts`
- `client/src/styles/scroll.css`
- `client/src/styles/notifications.css`

### Modified Files
- `server/main.go` — CLI routing, new service init, new routes
- `server/db/migrations.go` — notifications table
- `server/ws/message.go` — new event types
- `server/ws/hub.go` — route new events
- `client/src/styles/globals.css` — scroll fixes
- `client/src/components/terminal/TerminalView.tsx` — wheel isolation, zoom support
- `client/src/components/file/FilePreview.tsx` — markdown routing
- `client/src/components/agent/AgentCard.tsx` — notification ring, meta display
- `client/src/components/layout/Sidebar.tsx` — notification badge
- `client/src/components/layout/BottomNav.tsx` — notification badge
- `client/src/components/animation/SubAgentPanel.tsx` — browser tab toggle
- `client/src/pages/TerminalPage.tsx` — zoom state, command palette, browser panel
- `client/src/pages/DashboardPage.tsx` — scroll fix, notification ring
- `client/src/stores/appStore.ts` — zoom state, notifications, meta
- `client/src/lib/ws.ts` — new event types
- `client/src/App.tsx` — command palette mount
