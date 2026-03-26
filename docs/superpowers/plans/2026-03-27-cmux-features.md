# cmux-Style Features + Scroll Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cmux-style UX features (scroll fix, notifications, smart sidebar, CLI, browser panel, command palette, panel zoom, markdown preview) to AgentDeck.

**Architecture:** Server-side Go services poll git/port metadata and push via WebSocket. Client-side React hooks parse terminal output for notifications. CLI reuses REST API. All scroll contexts isolated with min-height:0 + overflow patterns.

**Tech Stack:** Go (gorilla/mux, gorilla/websocket, go-sqlite3), React 18 (zustand, xterm.js, react-markdown, remark-gfm), TypeScript, Tailwind CSS

---

## File Structure

### New Server Files
- `server/services/git.go` — Git branch/dirty/ahead polling per agent
- `server/services/port_scanner.go` — Listening port detection per agent
- `server/services/notification.go` — Notification CRUD (SQLite)
- `server/handlers/meta.go` — Agent metadata + send REST endpoints
- `server/handlers/notification.go` — Notification REST endpoints
- `server/cli/root.go` — CLI subcommand router
- `server/cli/agents.go` — list/create/delete/send/status commands
- `server/cli/auth.go` — login/token management

### New Client Files
- `client/src/styles/scroll.css` — Global scroll isolation styles
- `client/src/styles/notifications.css` — Notification ring animations
- `client/src/hooks/useAgentNotification.ts` — Terminal output parsing for notifications
- `client/src/hooks/useAgentMeta.ts` — Git/port/notification metadata subscription
- `client/src/hooks/useCommandPalette.ts` — Command palette state + keyboard handling
- `client/src/components/CommandPalette.tsx` — Command palette UI
- `client/src/components/notification/NotificationRing.tsx` — Card ring animation wrapper
- `client/src/components/notification/NotificationBadge.tsx` — Unread count badge
- `client/src/components/sidebar/AgentMeta.tsx` — Git/port/notification display in cards
- `client/src/components/browser/BrowserPanel.tsx` — iframe localhost preview
- `client/src/components/file/MarkdownPreview.tsx` — Rendered markdown viewer

### Modified Files
- `server/main.go` — CLI routing, new services, new routes
- `server/db/migrations.go` — notifications table
- `server/ws/message.go` — New event constants + payload types
- `server/ws/hub.go` — Broadcast meta events, handle send command
- `server/services/agent.go` — Add SendKeys method
- `client/src/main.tsx` — Import scroll.css
- `client/src/styles/globals.css` — Scroll fixes for html/body/#root
- `client/src/stores/appStore.ts` — notifications, meta, zoomedPanel state
- `client/src/lib/ws.ts` — New event type handling
- `client/src/lib/api.ts` — New API methods
- `client/src/App.tsx` — Mount CommandPalette
- `client/src/components/terminal/TerminalView.tsx` — Wheel isolation, expose fitAddon
- `client/src/components/file/FilePreview.tsx` — Markdown routing + Raw/Preview toggle
- `client/src/components/agent/AgentCard.tsx` — NotificationRing + AgentMeta
- `client/src/components/layout/Sidebar.tsx` — NotificationBadge
- `client/src/components/layout/BottomNav.tsx` — NotificationBadge
- `client/src/components/animation/SubAgentPanel.tsx` — Browser tab toggle
- `client/src/pages/TerminalPage.tsx` — Zoom state, browser panel, Cmd+K
- `client/src/pages/DashboardPage.tsx` — Scroll fix

---

### Task 1: Scroll Fix — Global CSS

**Files:**
- Create: `client/src/styles/scroll.css`
- Modify: `client/src/styles/globals.css`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Create scroll.css with global scroll isolation styles**

```css
/* client/src/styles/scroll.css */

/* ===== Scroll Context Isolation =====
   Each panel scrolls independently. Parent chain must have
   explicit height + min-height:0 for flex children.
*/

/* App shell */
html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

/* Scrollbar — unified thin style */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
}

/* Terminal: touch events handled by xterm.js */
.terminal-scroll-container {
  touch-action: none;
}

/* Non-terminal panels: allow vertical touch scroll */
.panel-scroll {
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

/* Flex scroll child pattern:
   parent: display:flex; flex-direction:column; overflow:hidden; min-height:0;
   child:  flex:1; overflow-y:auto; min-height:0;
*/
.flex-scroll-parent {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.flex-scroll-child {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
```

- [ ] **Step 2: Update globals.css — replace old scrollbar styles, fix body/root**

In `client/src/styles/globals.css`, replace the existing scrollbar and body styles. The `@layer base` block should become:

```css
@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    @apply bg-deck-bg text-deck-text antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overscroll-behavior: none;
    overflow: hidden;
    height: 100vh;
    height: 100dvh;
  }

  #root {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* iOS safe areas */
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Focus ring */
  *:focus-visible {
    outline: 2px solid theme('colors.deck.accent');
    outline-offset: 2px;
  }
}
```

Remove the old `::-webkit-scrollbar` rules from `@layer base` since `scroll.css` now owns them.

- [ ] **Step 3: Import scroll.css in main.tsx**

In `client/src/main.tsx`, add before the existing style imports:

```typescript
import './styles/scroll.css';
```

- [ ] **Step 4: Verify build compiles**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/styles/scroll.css client/src/styles/globals.css client/src/main.tsx
git commit -m "fix: add global scroll isolation styles and unified scrollbar"
```

---

### Task 2: Scroll Fix — Panel Layout

**Files:**
- Modify: `client/src/pages/TerminalPage.tsx`
- Modify: `client/src/pages/DashboardPage.tsx`
- Modify: `client/src/components/terminal/TerminalView.tsx`

- [ ] **Step 1: Fix TerminalPage desktop layout — add min-height:0 to all flex containers**

In `client/src/pages/TerminalPage.tsx`, the desktop layout's three-panel container (line 342):

Replace:
```tsx
<div className="flex flex-1 min-h-0 overflow-hidden">
```
With:
```tsx
<div className="flex flex-1 min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
```

The left panel file explorer container (line 346-348):
Replace:
```tsx
<div className="shrink-0 overflow-hidden flex flex-col" style={{ width: `${leftWidth}px`, borderRight: '1px solid var(--deck-border, #1e293b)' }}>
  <div className="flex-1 overflow-hidden">
```
With:
```tsx
<div className="shrink-0 flex flex-col" style={{ width: `${leftWidth}px`, borderRight: '1px solid var(--deck-border, #1e293b)', overflow: 'hidden', minHeight: 0 }}>
  <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
```

The center panel (line 367):
Replace:
```tsx
<div className="flex-1 min-w-0 flex flex-col">
```
With:
```tsx
<div className="flex-1 min-w-0 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
```

The right panel (line 428):
Replace:
```tsx
<div className="shrink-0 overflow-hidden" style={{ width: `${rightWidth}px`, borderLeft: '1px solid var(--deck-border, #1e293b)' }}>
```
With:
```tsx
<div className="shrink-0 flex flex-col" style={{ width: `${rightWidth}px`, borderLeft: '1px solid var(--deck-border, #1e293b)', overflow: 'hidden', minHeight: 0 }}>
```

- [ ] **Step 2: Fix DashboardPage — ensure main area scrolls**

In `client/src/pages/DashboardPage.tsx`, the main element (line 69):
Replace:
```tsx
<main className="flex-1 overflow-y-auto">
```
With:
```tsx
<main className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
```

- [ ] **Step 3: Add wheel event isolation to TerminalView**

In `client/src/components/terminal/TerminalView.tsx`, add a wheel event handler inside the main useEffect (after the ResizeObserver setup, around line 133):

```typescript
// Isolate xterm.js wheel events from parent scroll contexts
const termContainer = termRef.current;
const handleWheel = (e: WheelEvent) => {
  e.stopPropagation();
};
termContainer.addEventListener('wheel', handleWheel, { passive: false });
```

And in the cleanup return (before `terminal.dispose()`):
```typescript
termContainer.removeEventListener('wheel', handleWheel);
```

Note: `termContainer` must be captured at the top of the effect where `termRef.current` is checked.

- [ ] **Step 4: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/TerminalPage.tsx client/src/pages/DashboardPage.tsx client/src/components/terminal/TerminalView.tsx
git commit -m "fix: isolate scroll contexts across all panels"
```

---

### Task 3: DB Schema — Notifications Table

**Files:**
- Modify: `server/db/migrations.go`

- [ ] **Step 1: Add notifications migration**

In `server/db/migrations.go`, add a new const after `colorMigration`:

```go
const notificationMigration = `
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(agent_id, read);
`
```

- [ ] **Step 2: Execute migration in Migrate function**

In the `Migrate` function, add after the color columns loop:

```go
// Notifications table
db.Exec(notificationMigration)
```

- [ ] **Step 3: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add server/db/migrations.go
git commit -m "feat: add notifications table schema"
```

---

### Task 4: WebSocket Events — New Types

**Files:**
- Modify: `server/ws/message.go`

- [ ] **Step 1: Add new event constants and payload types**

In `server/ws/message.go`, add to the Server -> Client constants block:

```go
// Server -> Client events (continued)
const (
	EventAgentNotification      = "agent:notification"
	EventAgentNotificationClear = "agent:notification:clear"
	EventAgentMeta              = "agent:meta"
	EventAgentMetaStatus        = "agent:meta:status"
	EventAgentMetaProgress      = "agent:meta:progress"
	EventAgentMetaLog           = "agent:meta:log"
)
```

Add new payload structs after the existing ones:

```go
type AgentNotificationPayload struct {
	AgentID   string `json:"agentId"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

type AgentNotificationClearPayload struct {
	AgentID string `json:"agentId"`
}

type AgentMetaPayload struct {
	AgentID        string   `json:"agentId"`
	GitBranch      string   `json:"gitBranch,omitempty"`
	GitDirty       bool     `json:"gitDirty"`
	GitAhead       int      `json:"gitAhead"`
	ListeningPorts []int    `json:"listeningPorts,omitempty"`
}

type AgentMetaStatusPayload struct {
	AgentID string `json:"agentId"`
	Key     string `json:"key"`
	Text    string `json:"text"`
	Color   string `json:"color,omitempty"`
}

type AgentMetaProgressPayload struct {
	AgentID string  `json:"agentId"`
	Value   float64 `json:"value"`
	Label   string  `json:"label,omitempty"`
}

type AgentMetaLogPayload struct {
	AgentID   string `json:"agentId"`
	Level     string `json:"level"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}
```

- [ ] **Step 2: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/ws/message.go
git commit -m "feat: add WebSocket event types for notifications and agent metadata"
```

---

### Task 5: Notification Service (Server)

**Files:**
- Create: `server/services/notification.go`

- [ ] **Step 1: Create notification service**

```go
// server/services/notification.go
package services

import (
	"database/sql"
	"time"
)

type Notification struct {
	ID        int    `json:"id"`
	AgentID   string `json:"agentId"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Read      bool   `json:"read"`
	CreatedAt string `json:"createdAt"`
}

type NotificationService struct {
	db *sql.DB
}

func NewNotificationService(db *sql.DB) *NotificationService {
	return &NotificationService{db: db}
}

func (s *NotificationService) Create(agentID, reason, message string) (*Notification, error) {
	now := time.Now().Format("2006-01-02T15:04:05Z")
	result, err := s.db.Exec(
		"INSERT INTO notifications (agent_id, reason, message, created_at) VALUES (?, ?, ?, ?)",
		agentID, reason, message, now,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	return &Notification{
		ID:        int(id),
		AgentID:   agentID,
		Reason:    reason,
		Message:   message,
		Read:      false,
		CreatedAt: now,
	}, nil
}

func (s *NotificationService) ListUnread(agentID string) ([]Notification, error) {
	query := "SELECT id, agent_id, reason, message, read, created_at FROM notifications WHERE read = FALSE"
	args := []interface{}{}
	if agentID != "" {
		query += " AND agent_id = ?"
		args = append(args, agentID)
	}
	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.AgentID, &n.Reason, &n.Message, &n.Read, &n.CreatedAt); err != nil {
			continue
		}
		notifications = append(notifications, n)
	}
	if notifications == nil {
		notifications = []Notification{}
	}
	return notifications, nil
}

func (s *NotificationService) MarkRead(agentID string) error {
	_, err := s.db.Exec("UPDATE notifications SET read = TRUE WHERE agent_id = ? AND read = FALSE", agentID)
	return err
}

func (s *NotificationService) ClearAll() error {
	_, err := s.db.Exec("UPDATE notifications SET read = TRUE WHERE read = FALSE")
	return err
}
```

- [ ] **Step 2: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/services/notification.go
git commit -m "feat: add notification service for CRUD operations"
```

---

### Task 6: Git Service (Server)

**Files:**
- Create: `server/services/git.go`

- [ ] **Step 1: Create git service**

```go
// server/services/git.go
package services

import (
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

type GitInfo struct {
	Branch string `json:"branch"`
	Dirty  bool   `json:"dirty"`
	Ahead  int    `json:"ahead"`
}

type GitService struct {
	mu    sync.RWMutex
	cache map[string]*GitInfo // agentID -> GitInfo
}

func NewGitService() *GitService {
	return &GitService{
		cache: make(map[string]*GitInfo),
	}
}

func (s *GitService) GetInfo(agentID string) *GitInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cache[agentID]
}

func (s *GitService) Poll(agentID, workingDir string) *GitInfo {
	info := &GitInfo{}

	// Check if it's a git repo
	absDir, err := filepath.Abs(workingDir)
	if err != nil {
		return info
	}

	// Branch
	out, err := exec.Command("git", "-C", absDir, "branch", "--show-current").Output()
	if err != nil {
		return info // not a git repo
	}
	info.Branch = strings.TrimSpace(string(out))

	// Dirty
	out, err = exec.Command("git", "-C", absDir, "status", "--porcelain").Output()
	if err == nil {
		info.Dirty = len(strings.TrimSpace(string(out))) > 0
	}

	// Ahead count
	out, err = exec.Command("git", "-C", absDir, "rev-list", "--count", "@{upstream}..HEAD").Output()
	if err == nil {
		if n, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			info.Ahead = n
		}
	}

	s.mu.Lock()
	s.cache[agentID] = info
	s.mu.Unlock()

	return info
}

func (s *GitService) Remove(agentID string) {
	s.mu.Lock()
	delete(s.cache, agentID)
	s.mu.Unlock()
}
```

- [ ] **Step 2: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/services/git.go
git commit -m "feat: add git service for branch/dirty/ahead polling"
```

---

### Task 7: Port Scanner Service (Server)

**Files:**
- Create: `server/services/port_scanner.go`

- [ ] **Step 1: Create port scanner service**

```go
// server/services/port_scanner.go
package services

import (
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
)

type PortScanner struct {
	mu    sync.RWMutex
	cache map[string][]int // agentID -> listening ports
}

func NewPortScanner() *PortScanner {
	return &PortScanner{
		cache: make(map[string][]int),
	}
}

func (s *PortScanner) GetPorts(agentID string) []int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cache[agentID]
}

// Poll scans for listening TCP ports owned by processes in the given tmux session's pgroup.
// tmuxSession is the tmux session name used to find child PIDs.
func (s *PortScanner) Poll(agentID, tmuxSession string) []int {
	var ports []int

	if runtime.GOOS == "darwin" {
		ports = s.scanDarwin()
	} else {
		ports = s.scanLinux()
	}

	// Filter to common dev ports (1024-65535) to reduce noise
	var filtered []int
	for _, p := range ports {
		if p >= 1024 {
			filtered = append(filtered, p)
		}
	}

	s.mu.Lock()
	s.cache[agentID] = filtered
	s.mu.Unlock()

	return filtered
}

var portRegex = regexp.MustCompile(`:(\d+)\s`)

func (s *PortScanner) scanDarwin() []int {
	out, err := exec.Command("lsof", "-iTCP", "-sTCP:LISTEN", "-P", "-n").Output()
	if err != nil {
		return nil
	}
	return parsePortsFromLsof(string(out))
}

func (s *PortScanner) scanLinux() []int {
	out, err := exec.Command("ss", "-tlnp").Output()
	if err != nil {
		// Fallback to lsof
		return s.scanDarwin()
	}
	return parsePortsFromSS(string(out))
}

func parsePortsFromLsof(output string) []int {
	seen := make(map[int]bool)
	var ports []int
	for _, line := range strings.Split(output, "\n") {
		// Match pattern like *:3000 or 127.0.0.1:5173
		fields := strings.Fields(line)
		if len(fields) < 9 {
			continue
		}
		addr := fields[8] // NAME column
		parts := strings.Split(addr, ":")
		if len(parts) < 2 {
			continue
		}
		portStr := parts[len(parts)-1]
		if p, err := strconv.Atoi(portStr); err == nil && !seen[p] {
			seen[p] = true
			ports = append(ports, p)
		}
	}
	return ports
}

func parsePortsFromSS(output string) []int {
	seen := make(map[int]bool)
	var ports []int
	for _, line := range strings.Split(output, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		addr := fields[3] // Local Address:Port
		parts := strings.Split(addr, ":")
		if len(parts) < 2 {
			continue
		}
		portStr := parts[len(parts)-1]
		if p, err := strconv.Atoi(portStr); err == nil && !seen[p] {
			seen[p] = true
			ports = append(ports, p)
		}
	}
	return ports
}

func (s *PortScanner) Remove(agentID string) {
	s.mu.Lock()
	delete(s.cache, agentID)
	s.mu.Unlock()
}
```

- [ ] **Step 2: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/services/port_scanner.go
git commit -m "feat: add port scanner service for listening port detection"
```

---

### Task 8: Meta Polling Loop + Hub Integration

**Files:**
- Modify: `server/ws/hub.go`
- Modify: `server/main.go`

- [ ] **Step 1: Add git/port services to Hub and start polling loop**

In `server/ws/hub.go`, update the Hub struct and NewHub:

```go
type Hub struct {
	clients        sync.Map
	ptySvc         *services.PtyService
	watcherSvc     *services.WatcherService
	agentSvc       *services.AgentService
	gitSvc         *services.GitService
	portScanner    *services.PortScanner
	notifSvc       *services.NotificationService
}

func NewHub(ptySvc *services.PtyService, watcherSvc *services.WatcherService, agentSvc *services.AgentService, gitSvc *services.GitService, portScanner *services.PortScanner, notifSvc *services.NotificationService) *Hub {
	h := &Hub{
		ptySvc:      ptySvc,
		watcherSvc:  watcherSvc,
		agentSvc:    agentSvc,
		gitSvc:      gitSvc,
		portScanner: portScanner,
		notifSvc:    notifSvc,
	}

	watcherSvc.SetOnChange(func(agentID string, change services.FileChange) {
		h.BroadcastToAgent(agentID, EventFileChanged, change)
	})

	return h
}
```

Update the `Run` method to start the meta polling loop:

```go
func (h *Hub) Run() {
	// Git polling every 10 seconds
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			h.pollMeta()
		}
	}()
}

func (h *Hub) pollMeta() {
	agents, err := h.agentSvc.List()
	if err != nil {
		return
	}
	for _, agent := range agents {
		if agent.Status != "running" {
			continue
		}

		gitInfo := h.gitSvc.Poll(agent.ID, agent.WorkingDir)
		ports := h.portScanner.Poll(agent.ID, agent.TmuxSession)

		payload := AgentMetaPayload{
			AgentID:        agent.ID,
			GitBranch:      gitInfo.Branch,
			GitDirty:       gitInfo.Dirty,
			GitAhead:       gitInfo.Ahead,
			ListeningPorts: ports,
		}
		h.BroadcastAll(EventAgentMeta, payload)
	}
}
```

Add `"time"` to the import list in hub.go.

- [ ] **Step 2: Update main.go — init new services and pass to Hub**

In `server/main.go`, add after existing service initialization (after line 41):

```go
gitSvc := services.NewGitService()
portScanner := services.NewPortScanner()
notifSvc := services.NewNotificationService(database)
```

Update the Hub creation (line 44):
```go
hub := ws.NewHub(ptySvc, watcherSvc, agentSvc, gitSvc, portScanner, notifSvc)
```

- [ ] **Step 3: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add server/ws/hub.go server/main.go
git commit -m "feat: add meta polling loop for git/port data broadcast"
```

---

### Task 9: Notification + Meta REST Handlers

**Files:**
- Create: `server/handlers/notification.go`
- Create: `server/handlers/meta.go`
- Modify: `server/main.go`
- Modify: `server/services/agent.go`

- [ ] **Step 1: Create notification handler**

```go
// server/handlers/notification.go
package handlers

import (
	"net/http"

	"agentdeck/services"

	"github.com/gorilla/mux"
)

func ListNotifications(notifSvc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		agentID := r.URL.Query().Get("agentId")
		notifs, err := notifSvc.ListUnread(agentID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		jsonResponse(w, notifs)
	}
}

func ClearNotifications(notifSvc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		agentID := r.URL.Query().Get("agentId")
		if agentID != "" {
			notifSvc.MarkRead(agentID)
		} else {
			notifSvc.ClearAll()
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func MarkAgentNotificationsRead(notifSvc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		notifSvc.MarkRead(id)
		w.WriteHeader(http.StatusNoContent)
	}
}
```

- [ ] **Step 2: Create meta handler**

```go
// server/handlers/meta.go
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"agentdeck/services"
	"agentdeck/ws"

	"github.com/gorilla/mux"
)

func GetAgentMeta(gitSvc *services.GitService, portScanner *services.PortScanner, notifSvc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		git := gitSvc.GetInfo(id)
		ports := portScanner.GetPorts(id)
		notifs, _ := notifSvc.ListUnread(id)

		result := map[string]interface{}{
			"agentId":        id,
			"gitBranch":      "",
			"gitDirty":       false,
			"gitAhead":       0,
			"listeningPorts": ports,
			"notifications":  notifs,
		}
		if git != nil {
			result["gitBranch"] = git.Branch
			result["gitDirty"] = git.Dirty
			result["gitAhead"] = git.Ahead
		}
		jsonResponse(w, result)
	}
}

func SendToAgent(agentSvc *services.AgentService, hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		var body struct {
			Data string `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid body", http.StatusBadRequest)
			return
		}

		agent, err := agentSvc.Get(id)
		if err != nil {
			jsonError(w, "agent not found", http.StatusNotFound)
			return
		}

		// Send via tmux send-keys
		if err := agentSvc.SendKeys(agent.TmuxSession, body.Data); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func SetAgentMetaStatus(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		var body struct {
			Key   string `json:"key"`
			Text  string `json:"text"`
			Color string `json:"color,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid body", http.StatusBadRequest)
			return
		}
		hub.BroadcastAll(ws.EventAgentMetaStatus, ws.AgentMetaStatusPayload{
			AgentID: id,
			Key:     body.Key,
			Text:    body.Text,
			Color:   body.Color,
		})
		w.WriteHeader(http.StatusNoContent)
	}
}

func SetAgentMetaProgress(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		var body struct {
			Value float64 `json:"value"`
			Label string  `json:"label,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid body", http.StatusBadRequest)
			return
		}
		hub.BroadcastAll(ws.EventAgentMetaProgress, ws.AgentMetaProgressPayload{
			AgentID: id,
			Value:   body.Value,
			Label:   body.Label,
		})
		w.WriteHeader(http.StatusNoContent)
	}
}

func AddAgentMetaLog(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		var body struct {
			Level   string `json:"level"`
			Message string `json:"message"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid body", http.StatusBadRequest)
			return
		}
		hub.BroadcastAll(ws.EventAgentMetaLog, ws.AgentMetaLogPayload{
			AgentID:   id,
			Level:     body.Level,
			Message:   body.Message,
			Timestamp: time.Now().Format("2006-01-02T15:04:05Z"),
		})
		w.WriteHeader(http.StatusNoContent)
	}
}
```

- [ ] **Step 3: Add SendKeys to AgentService**

In `server/services/agent.go`, add after the `UpdateStatus` method:

```go
func (s *AgentService) SendKeys(tmuxSession, data string) error {
	return s.tmuxSvc.SendKeys(tmuxSession, data)
}
```

- [ ] **Step 4: Register routes in main.go**

In `server/main.go`, add after the logs routes (around line 102):

```go
// Notifications
api.HandleFunc("/notifications", handlers.ListNotifications(notifSvc)).Methods("GET")
api.HandleFunc("/notifications/clear", handlers.ClearNotifications(notifSvc)).Methods("POST")

// Agent meta + send
api.HandleFunc("/agents/{id}/send", handlers.SendToAgent(agentSvc, hub)).Methods("POST")
api.HandleFunc("/agents/{id}/meta", handlers.GetAgentMeta(gitSvc, portScanner, notifSvc)).Methods("GET")
api.HandleFunc("/agents/{id}/meta/status", handlers.SetAgentMetaStatus(hub)).Methods("POST")
api.HandleFunc("/agents/{id}/meta/progress", handlers.SetAgentMetaProgress(hub)).Methods("POST")
api.HandleFunc("/agents/{id}/meta/log", handlers.AddAgentMetaLog(hub)).Methods("POST")
api.HandleFunc("/agents/{id}/notifications/read", handlers.MarkAgentNotificationsRead(notifSvc)).Methods("POST")
```

- [ ] **Step 5: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add server/handlers/notification.go server/handlers/meta.go server/services/agent.go server/main.go
git commit -m "feat: add REST endpoints for notifications, meta, and agent send"
```

---

### Task 10: Client — Store + API + WS Updates

**Files:**
- Modify: `client/src/stores/appStore.ts`
- Modify: `client/src/lib/api.ts`
- Modify: `client/src/lib/ws.ts`
- Modify: `client/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Extend appStore with notifications, meta, and zoom state**

In `client/src/stores/appStore.ts`, add new interfaces before AppState:

```typescript
export interface AgentNotification {
  id?: number;
  agentId: string;
  reason: 'permission_request' | 'waiting_input' | 'error' | 'task_complete';
  message: string;
  timestamp: string;
}

export interface AgentMeta {
  gitBranch: string;
  gitDirty: boolean;
  gitAhead: number;
  listeningPorts: number[];
  customStatus?: { key: string; text: string; color?: string };
  progress?: { value: number; label?: string };
}
```

Add to the AppState interface:

```typescript
  // Notifications
  notifications: Map<string, AgentNotification[]>;
  addNotification: (n: AgentNotification) => void;
  clearNotifications: (agentId: string) => void;
  unreadCount: () => number;

  // Agent meta
  agentMeta: Map<string, AgentMeta>;
  setAgentMeta: (agentId: string, meta: AgentMeta) => void;
  updateAgentMetaStatus: (agentId: string, status: { key: string; text: string; color?: string }) => void;
  updateAgentMetaProgress: (agentId: string, progress: { value: number; label?: string }) => void;

  // Panel zoom
  zoomedPanel: 'terminal' | 'files' | 'subagent' | 'browser' | null;
  setZoomedPanel: (panel: 'terminal' | 'files' | 'subagent' | 'browser' | null) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;
```

Add implementations in the create function:

```typescript
  notifications: new Map(),
  addNotification: (n) =>
    set((s) => {
      const m = new Map(s.notifications);
      const existing = m.get(n.agentId) || [];
      m.set(n.agentId, [...existing.slice(-19), n]); // Keep last 20
      return { notifications: m };
    }),
  clearNotifications: (agentId) =>
    set((s) => {
      const m = new Map(s.notifications);
      m.delete(agentId);
      return { notifications: m };
    }),
  unreadCount: () => {
    let count = 0;
    useAppStore.getState().notifications.forEach((notifs) => {
      count += notifs.length;
    });
    return count;
  },

  agentMeta: new Map(),
  setAgentMeta: (agentId, meta) =>
    set((s) => {
      const m = new Map(s.agentMeta);
      m.set(agentId, { ...m.get(agentId), ...meta } as AgentMeta);
      return { agentMeta: m };
    }),
  updateAgentMetaStatus: (agentId, status) =>
    set((s) => {
      const m = new Map(s.agentMeta);
      const existing = m.get(agentId) || { gitBranch: '', gitDirty: false, gitAhead: 0, listeningPorts: [] };
      m.set(agentId, { ...existing, customStatus: status });
      return { agentMeta: m };
    }),
  updateAgentMetaProgress: (agentId, progress) =>
    set((s) => {
      const m = new Map(s.agentMeta);
      const existing = m.get(agentId) || { gitBranch: '', gitDirty: false, gitAhead: 0, listeningPorts: [] };
      m.set(agentId, { ...existing, progress });
      return { agentMeta: m };
    }),

  zoomedPanel: null,
  setZoomedPanel: (panel) => set({ zoomedPanel: panel }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
```

- [ ] **Step 2: Add API methods**

In `client/src/lib/api.ts`, add after the logs section:

```typescript
  // Notifications
  listNotifications: (agentId?: string) =>
    apiFetch(`/notifications${agentId ? `?agentId=${agentId}` : ''}`),
  clearNotifications: (agentId?: string) =>
    apiFetch(`/notifications/clear${agentId ? `?agentId=${agentId}` : ''}`, { method: 'POST' }),
  markNotificationsRead: (agentId: string) =>
    apiFetch(`/agents/${agentId}/notifications/read`, { method: 'POST' }),

  // Agent meta
  getAgentMeta: (id: string) => apiFetch(`/agents/${id}/meta`),
  sendToAgent: (id: string, data: string) =>
    apiFetch(`/agents/${id}/send`, { method: 'POST', body: JSON.stringify({ data }) }),
  setAgentStatus: (id: string, key: string, text: string, color?: string) =>
    apiFetch(`/agents/${id}/meta/status`, { method: 'POST', body: JSON.stringify({ key, text, color }) }),
  setAgentProgress: (id: string, value: number, label?: string) =>
    apiFetch(`/agents/${id}/meta/progress`, { method: 'POST', body: JSON.stringify({ value, label }) }),
  addAgentLog: (id: string, level: string, message: string) =>
    apiFetch(`/agents/${id}/meta/log`, { method: 'POST', body: JSON.stringify({ level, message }) }),
```

- [ ] **Step 3: Add WebSocket event subscriptions in useWebSocket.ts**

Read the current `useWebSocket.ts` first, then add listeners for new events. In the useEffect that sets up WS listeners, add:

```typescript
const unsubMeta = agentDeckWS.on('agent:meta', (payload: any) => {
  useAppStore.getState().setAgentMeta(payload.agentId, {
    gitBranch: payload.gitBranch || '',
    gitDirty: payload.gitDirty || false,
    gitAhead: payload.gitAhead || 0,
    listeningPorts: payload.listeningPorts || [],
  });
});

const unsubMetaStatus = agentDeckWS.on('agent:meta:status', (payload: any) => {
  useAppStore.getState().updateAgentMetaStatus(payload.agentId, {
    key: payload.key,
    text: payload.text,
    color: payload.color,
  });
});

const unsubMetaProgress = agentDeckWS.on('agent:meta:progress', (payload: any) => {
  useAppStore.getState().updateAgentMetaProgress(payload.agentId, {
    value: payload.value,
    label: payload.label,
  });
});

const unsubNotification = agentDeckWS.on('agent:notification', (payload: any) => {
  useAppStore.getState().addNotification({
    agentId: payload.agentId,
    reason: payload.reason,
    message: payload.message,
    timestamp: payload.timestamp,
  });
});

const unsubNotificationClear = agentDeckWS.on('agent:notification:clear', (payload: any) => {
  useAppStore.getState().clearNotifications(payload.agentId);
});
```

Add all unsub calls to the cleanup return.

- [ ] **Step 4: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/stores/appStore.ts client/src/lib/api.ts client/src/hooks/useWebSocket.ts
git commit -m "feat: add client state, API methods, and WS handlers for meta/notifications"
```

---

### Task 11: Notification Ring + Badge Components

**Files:**
- Create: `client/src/styles/notifications.css`
- Create: `client/src/components/notification/NotificationRing.tsx`
- Create: `client/src/components/notification/NotificationBadge.tsx`
- Create: `client/src/hooks/useAgentNotification.ts`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Create notification animations CSS**

```css
/* client/src/styles/notifications.css */

@keyframes ring-waiting {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  50% { box-shadow: 0 0 12px 3px rgba(59, 130, 246, 0.4); }
}

@keyframes ring-permission {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  50% { box-shadow: 0 0 16px 4px rgba(245, 158, 11, 0.5); }
}

@keyframes ring-error {
  0%, 20%, 40%, 60%, 80%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  10%, 30%, 50% { box-shadow: 0 0 12px 3px rgba(239, 68, 68, 0.5); }
}

@keyframes ring-complete {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  30% { box-shadow: 0 0 16px 4px rgba(16, 185, 129, 0.5); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.notification-ring-waiting { animation: ring-waiting 2s ease-in-out infinite; }
.notification-ring-permission { animation: ring-permission 1.5s ease-in-out infinite; }
.notification-ring-error { animation: ring-error 1s ease-in-out infinite; }
.notification-ring-complete { animation: ring-complete 2s ease-out forwards; }
```

- [ ] **Step 2: Create useAgentNotification hook**

```typescript
// client/src/hooks/useAgentNotification.ts
import { useEffect, useRef } from 'react';
import { agentDeckWS } from '../lib/ws';
import { useAppStore, AgentNotification } from '../stores/appStore';

const PERMISSION_PATTERNS = [/Allow/i, /Y\/n/i, /Do you want/i, /\(y\/N\)/i];
const ERROR_PATTERNS = [/Error/i, /FAILED/i, /panic:/];
const COMPLETE_PATTERNS = [/✓/, /Done/i, /Success/i, /Complete/i];
const PROMPT_ENDINGS = ['> ', '$ ', '% ', '# ', '❯ '];

function detectNotification(text: string): { reason: AgentNotification['reason']; message: string } | null {
  // Check permission requests first (highest priority)
  for (const p of PERMISSION_PATTERNS) {
    const match = text.match(p);
    if (match) {
      const line = text.split('\n').find(l => p.test(l)) || text.slice(0, 80);
      return { reason: 'permission_request', message: line.trim().slice(0, 120) };
    }
  }

  // Check errors
  for (const p of ERROR_PATTERNS) {
    if (p.test(text)) {
      const line = text.split('\n').find(l => p.test(l)) || text.slice(0, 80);
      return { reason: 'error', message: line.trim().slice(0, 120) };
    }
  }

  // Check completion
  for (const p of COMPLETE_PATTERNS) {
    if (p.test(text)) {
      return { reason: 'task_complete', message: 'Task completed' };
    }
  }

  // Check prompt waiting
  const lastLine = text.trimEnd().split('\n').pop() || '';
  for (const ending of PROMPT_ENDINGS) {
    if (lastLine.endsWith(ending.trim())) {
      return { reason: 'waiting_input', message: 'Waiting for input' };
    }
  }

  return null;
}

export function useAgentNotification(agentId: string | null) {
  const lastNotifRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!agentId) return;

    const unsub = agentDeckWS.on('terminal:output', (payload: any) => {
      if (payload.agentId !== agentId) return;

      // Debounce to avoid spam from rapid output
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const result = detectNotification(payload.data);
        if (!result) return;

        // Dedup: don't repeat the same notification
        const key = `${result.reason}:${result.message}`;
        if (key === lastNotifRef.current) return;
        lastNotifRef.current = key;

        // Reset dedup after 10 seconds
        setTimeout(() => { lastNotifRef.current = ''; }, 10000);

        useAppStore.getState().addNotification({
          agentId,
          reason: result.reason,
          message: result.message,
          timestamp: new Date().toISOString(),
        });

        // Browser notification if tab is hidden
        if (document.hidden && Notification.permission === 'granted') {
          const n = new Notification(`AgentDeck: ${result.reason}`, {
            body: result.message,
            tag: `agentdeck-${agentId}-${result.reason}`,
            requireInteraction: result.reason === 'permission_request',
          });
          n.onclick = () => { window.focus(); n.close(); };
        }
      }, 500);
    });

    return () => {
      unsub();
      clearTimeout(debounceRef.current);
    };
  }, [agentId]);
}
```

- [ ] **Step 3: Create NotificationRing component**

```tsx
// client/src/components/notification/NotificationRing.tsx
import { useAppStore } from '../../stores/appStore';

interface NotificationRingProps {
  agentId: string;
  children: React.ReactNode;
  className?: string;
}

export function NotificationRing({ agentId, children, className = '' }: NotificationRingProps) {
  const notifications = useAppStore((s) => s.notifications.get(agentId));
  const latest = notifications?.[notifications.length - 1];

  let ringClass = '';
  if (latest) {
    switch (latest.reason) {
      case 'permission_request': ringClass = 'notification-ring-permission'; break;
      case 'waiting_input': ringClass = 'notification-ring-waiting'; break;
      case 'error': ringClass = 'notification-ring-error'; break;
      case 'task_complete': ringClass = 'notification-ring-complete'; break;
    }
  }

  return (
    <div className={`rounded-xl ${ringClass} ${className}`}>
      {children}
      {latest && (
        <div className="px-3 py-1.5 border-t border-deck-border text-xs truncate" style={{
          color: latest.reason === 'error' ? '#ef4444'
            : latest.reason === 'permission_request' ? '#f59e0b'
            : latest.reason === 'task_complete' ? '#10b981'
            : '#3b82f6',
        }}>
          {latest.reason === 'permission_request' ? '💬 ' : latest.reason === 'error' ? '❌ ' : ''}
          {latest.message}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create NotificationBadge component**

```tsx
// client/src/components/notification/NotificationBadge.tsx
import { useAppStore } from '../../stores/appStore';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const count = useAppStore((s) => {
    let c = 0;
    s.notifications.forEach((notifs) => { c += notifs.length; });
    return c;
  });

  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

- [ ] **Step 5: Import notifications.css in main.tsx**

In `client/src/main.tsx`, add:
```typescript
import './styles/notifications.css';
```

- [ ] **Step 6: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/styles/notifications.css client/src/hooks/useAgentNotification.ts client/src/components/notification/NotificationRing.tsx client/src/components/notification/NotificationBadge.tsx client/src/main.tsx
git commit -m "feat: add notification ring, badge, and terminal output detection"
```

---

### Task 12: AgentMeta Component + Card/Sidebar Integration

**Files:**
- Create: `client/src/components/sidebar/AgentMeta.tsx`
- Modify: `client/src/components/agent/AgentCard.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Create AgentMeta component**

```tsx
// client/src/components/sidebar/AgentMeta.tsx
import { useAppStore } from '../../stores/appStore';

interface AgentMetaProps {
  agentId: string;
  compact?: boolean;
}

export function AgentMeta({ agentId, compact = false }: AgentMetaProps) {
  const meta = useAppStore((s) => s.agentMeta.get(agentId));

  if (!meta) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-deck-text-dim truncate">
        {meta.gitBranch && (
          <span className="flex items-center gap-0.5">
            🌿{meta.gitBranch}
            {meta.gitDirty && <span className="text-amber-400">●</span>}
          </span>
        )}
        {meta.listeningPorts.length > 0 && (
          <span className="flex items-center gap-0.5">
            🔌{meta.listeningPorts.map(p => `:${p}`).join(' ')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 space-y-0.5 text-[11px] text-deck-text-dim border-t border-deck-border/50">
      {meta.gitBranch && (
        <div className="flex items-center gap-1 truncate">
          <span>🌿</span>
          <span className="font-mono">{meta.gitBranch}</span>
          {meta.gitAhead > 0 && <span className="text-blue-400">(+{meta.gitAhead})</span>}
          {meta.gitDirty && <span className="text-amber-400">●</span>}
        </div>
      )}
      {meta.listeningPorts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>🔌</span>
          {meta.listeningPorts.map((port) => (
            <a
              key={port}
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noopener"
              className="font-mono text-blue-400 hover:underline cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              :{port}
            </a>
          ))}
        </div>
      )}
      {meta.customStatus && (
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.customStatus.color || '#6366f1' }} />
          <span>{meta.customStatus.text}</span>
        </div>
      )}
      {meta.progress && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-deck-border overflow-hidden">
            <div className="h-full rounded-full bg-deck-accent transition-all" style={{ width: `${meta.progress.value * 100}%` }} />
          </div>
          {meta.progress.label && <span className="text-[10px]">{meta.progress.label}</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AgentCard with NotificationRing and AgentMeta**

In `client/src/components/agent/AgentCard.tsx`, add imports:

```typescript
import { NotificationRing } from '../notification/NotificationRing';
import { AgentMeta } from '../sidebar/AgentMeta';
import { useAgentNotification } from '../../hooks/useAgentNotification';
```

Wrap the card's outer div with NotificationRing. Replace the entire component return:

```tsx
export function AgentCard({ agent, onDestroy }: AgentCardProps) {
  const IC = AGENT_ICON_MAP[agent.preset];
  useAgentNotification(agent.id);

  return (
    <NotificationRing agentId={agent.id}>
      <div className="card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-deck-border">
          <div className="flex items-center gap-2">
            {IC && <IC size={18} />}
            <span className="font-medium text-sm text-deck-text">{agent.name}</span>
            <StatusBadge status={agent.status} />
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to={`/agents/${agent.id}`}
              className="text-xs px-2 py-0.5 rounded bg-deck-bg text-deck-text hover:bg-deck-border"
            >
              Open
            </Link>
            <button
              onClick={() => onDestroy(agent.id)}
              className="text-xs px-2 py-0.5 rounded bg-deck-danger/20 text-deck-danger hover:bg-deck-danger/30"
            >
              Kill
            </button>
          </div>
        </div>

        <AgentMeta agentId={agent.id} />

        <SubAgentBar agentId={agent.id} />

        <div className="flex-1 min-h-[200px]">
          <TerminalView agentId={agent.id} fontSize={11} />
        </div>
      </div>
    </NotificationRing>
  );
}
```

- [ ] **Step 3: Add NotificationBadge to Sidebar**

In `client/src/components/layout/Sidebar.tsx`, add import:
```typescript
import { NotificationBadge } from '../notification/NotificationBadge';
```

In the "Dashboard" nav item, add the badge. Change the NAV_ITEMS to include a badge flag, or simply add inline after the Dashboard link label. The simplest approach: add after the brand header:

```tsx
<div className="p-4 border-b border-deck-border flex items-center justify-between">
  <span className="text-sm font-bold text-deck-text">AgentDeck</span>
  <NotificationBadge />
</div>
```

- [ ] **Step 4: Add NotificationBadge to BottomNav**

In `client/src/components/layout/BottomNav.tsx`, add import:
```typescript
import { NotificationBadge } from '../notification/NotificationBadge';
```

Add badge to the Dashboard nav item. Wrap the Icon in a relative container for the first item:

```tsx
{NAV_ITEMS.map((item) => {
  const active = pathname === item.href;
  return (
    <Link
      key={item.href}
      to={item.href}
      className="flex flex-col items-center gap-1 py-3 px-6 text-xs relative"
      style={{ color: active ? '#6366f1' : '#64748b' }}
    >
      <div className="relative">
        <item.Icon size={22} />
        {item.href === '/dashboard' && (
          <NotificationBadge className="absolute -top-1.5 -right-2.5" />
        )}
      </div>
      <span>{item.label}</span>
    </Link>
  );
})}
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/sidebar/AgentMeta.tsx client/src/components/agent/AgentCard.tsx client/src/components/layout/Sidebar.tsx client/src/components/layout/BottomNav.tsx
git commit -m "feat: add agent meta display, notification ring on cards, badges on nav"
```

---

### Task 13: Markdown Preview

**Files:**
- Create: `client/src/components/file/MarkdownPreview.tsx`
- Modify: `client/src/components/file/FilePreview.tsx`

- [ ] **Step 1: Install dependencies**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm add react-markdown remark-gfm`

- [ ] **Step 2: Create MarkdownPreview component**

```tsx
// client/src/components/file/MarkdownPreview.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`markdown-preview p-4 text-sm leading-relaxed text-deck-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClass, children, ...props }) {
            return (
              <code
                className={`${codeClass || ''} bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto text-[13px] my-2">
                {children}
              </pre>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener" className="text-blue-400 underline">
                {children}
              </a>
            );
          },
          h1({ children }) { return <h1 className="text-xl font-semibold mt-5 mb-2">{children}</h1>; },
          h2({ children }) { return <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>; },
          h3({ children }) { return <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>; },
          p({ children }) { return <p className="my-2">{children}</p>; },
          ul({ children }) { return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>; },
          ol({ children }) { return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>; },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-3 border-slate-600 pl-3 text-deck-text-dim my-2">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return <table className="border-collapse w-full my-2 text-[13px]">{children}</table>;
          },
          th({ children }) {
            return <th className="border border-slate-700 px-2 py-1 text-left bg-slate-800/50">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-slate-700 px-2 py-1">{children}</td>;
          },
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update FilePreview to route .md files to MarkdownPreview**

Replace the entire `client/src/components/file/FilePreview.tsx`:

```tsx
import { useState } from 'react';
import { MarkdownPreview } from './MarkdownPreview';

interface FilePreviewProps {
  path: string;
  content: string;
  onEdit?: () => void;
}

export function FilePreview({ path, content, onEdit }: FilePreviewProps) {
  const fileName = path.split('/').pop() || path;
  const isMarkdown = /\.(md|markdown|mdx)$/i.test(fileName);
  const [viewMode, setViewMode] = useState<'raw' | 'preview'>(isMarkdown ? 'preview' : 'raw');

  return (
    <div className="flex flex-col h-full bg-deck-bg">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-deck-border shrink-0">
        <span className="text-xs font-mono text-deck-text-dim truncate">{fileName}</span>
        <div className="flex items-center gap-1.5">
          {isMarkdown && (
            <button
              onClick={() => setViewMode(viewMode === 'raw' ? 'preview' : 'raw')}
              className="text-xs px-2 py-0.5 rounded bg-deck-surface text-deck-text-dim hover:bg-deck-border"
            >
              {viewMode === 'raw' ? 'Preview' : 'Raw'}
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="text-xs px-2 py-0.5 rounded bg-deck-surface text-deck-text hover:bg-deck-border">
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {isMarkdown && viewMode === 'preview' ? (
          <MarkdownPreview content={content} />
        ) : (
          <pre className="p-3 text-xs font-mono text-deck-text leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/file/MarkdownPreview.tsx client/src/components/file/FilePreview.tsx client/package.json client/pnpm-lock.yaml
git commit -m "feat: add markdown live preview for .md files"
```

---

### Task 14: Command Palette

**Files:**
- Create: `client/src/components/CommandPalette.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create CommandPalette component**

```tsx
// client/src/components/CommandPalette.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  action: () => void;
  keywords?: string[];
}

function fuzzyMatch(query: string, text: string): boolean {
  let qi = 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, agents, setZoomedPanel, zoomedPanel } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // Agent commands
    agents.forEach((agent, i) => {
      cmds.push({
        id: `agent-${agent.id}`,
        label: `${agent.name} 열기`,
        shortcut: i < 9 ? `⌘${i + 1}` : undefined,
        category: '에이전트',
        action: () => navigate(`/agents/${agent.id}`),
        keywords: [agent.preset, agent.workingDir],
      });
    });

    cmds.push({
      id: 'new-agent',
      label: '새 에이전트 만들기',
      shortcut: '⌘N',
      category: '에이전트',
      action: () => navigate('/'),
    });

    // Navigation
    cmds.push(
      { id: 'nav-dashboard', label: '대시보드', shortcut: '⌘D', category: '이동', action: () => navigate('/dashboard') },
      { id: 'nav-projects', label: '프로젝트 선택', shortcut: '⌘O', category: '이동', action: () => navigate('/') },
      { id: 'nav-logs', label: '로그', shortcut: '⌘L', category: '이동', action: () => navigate('/logs') },
      { id: 'nav-settings', label: '설정', category: '이동', action: () => navigate('/settings') },
    );

    // View
    cmds.push(
      {
        id: 'zoom-toggle',
        label: zoomedPanel ? '패널 줌 해제' : '패널 줌 토글',
        shortcut: '⌘⇧Z',
        category: '보기',
        action: () => setZoomedPanel(zoomedPanel ? null : 'terminal'),
      },
    );

    return cmds;
  }, [agents, navigate, zoomedPanel, setZoomedPanel]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands.filter((cmd) => {
      const searchText = `${cmd.label} ${cmd.keywords?.join(' ') || ''}`;
      return fuzzyMatch(query, searchText);
    });
  }, [commands, query]);

  // Reset on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setCommandPaletteOpen(false);
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  }, [filtered, selectedIndex, setCommandPaletteOpen]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Group by category
  let lastCategory = '';

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setCommandPaletteOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-deck-surface border border-deck-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-deck-border">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#64748b"><circle cx="7" cy="7" r="5.5" stroke="#64748b" strokeWidth="1.5" fill="none"/><line x1="11" y1="11" x2="14" y2="14" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="검색..."
            className="flex-1 bg-transparent text-sm outline-none text-deck-text placeholder-deck-text-dim"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-deck-bg text-deck-text-dim border border-deck-border">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2" style={{ minHeight: 0 }}>
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-deck-text-dim">결과 없음</div>
          )}
          {filtered.map((cmd, i) => {
            const showCategory = cmd.category !== lastCategory;
            lastCategory = cmd.category;
            return (
              <div key={cmd.id}>
                {showCategory && (
                  <div className="px-4 py-1 text-[10px] font-medium uppercase tracking-wider text-deck-text-dim">
                    {cmd.category}
                  </div>
                )}
                <button
                  onClick={() => { cmd.action(); setCommandPaletteOpen(false); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                    i === selectedIndex ? 'bg-deck-accent/10 text-deck-text' : 'text-deck-text-dim hover:bg-deck-border/30'
                  }`}
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-deck-bg text-deck-text-dim border border-deck-border ml-2">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount CommandPalette in App.tsx**

In `client/src/App.tsx`, add import:
```typescript
import { CommandPalette } from './components/CommandPalette';
```

Inside the `<WebSocketProvider>` wrapper, add `<CommandPalette />` right before `<Routes>`:

```tsx
<WebSocketProvider>
  <CommandPalette />
  <Routes>
    ...
  </Routes>
</WebSocketProvider>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/CommandPalette.tsx client/src/App.tsx
git commit -m "feat: add command palette with Cmd+K activation and fuzzy search"
```

---

### Task 15: Panel Zoom

**Files:**
- Modify: `client/src/pages/TerminalPage.tsx`

- [ ] **Step 1: Add zoom state and keyboard shortcut to TerminalPage**

In `client/src/pages/TerminalPage.tsx`, add import:
```typescript
import { useAppStore } from '../stores/appStore';
```

Inside the component, add:
```typescript
const { zoomedPanel, setZoomedPanel } = useAppStore();
```

Add keyboard shortcut effect (after the existing keyboard effect):
```typescript
// Cmd+Shift+Z: panel zoom toggle
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      setZoomedPanel(zoomedPanel ? null : 'terminal');
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [zoomedPanel, setZoomedPanel]);
```

- [ ] **Step 2: Update desktop layout to support zoom**

In the desktop layout's three-panel container, replace the entire panel rendering block.

For the left panel, wrap the visibility check:
```tsx
{leftPanelOpen && !zoomedPanel && (
  // ... existing left panel code ...
)}
```

For the right panel:
```tsx
{rightPanelOpen && !zoomedPanel && (
  // ... existing right panel code ...
)}
```

Add a zoom button to the header (after the Anim button):
```tsx
<button
  onClick={() => setZoomedPanel(zoomedPanel ? null : 'terminal')}
  className={`text-xs px-2 py-0.5 rounded transition-colors ${
    zoomedPanel ? 'bg-amber-500/20 text-amber-400' : 'bg-deck-bg text-deck-text-dim'
  }`}
  title="Cmd+Shift+Z"
>
  {zoomedPanel ? '⛶' : '⛶'}
</button>
```

- [ ] **Step 3: Trigger fitAddon after zoom transition**

The TerminalView already has a ResizeObserver that calls fitAddon.fit(), so the zoom will automatically trigger a refit when the container size changes. No additional code needed.

- [ ] **Step 4: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/TerminalPage.tsx
git commit -m "feat: add panel zoom toggle with Cmd+Shift+Z"
```

---

### Task 16: Browser Panel

**Files:**
- Create: `client/src/components/browser/BrowserPanel.tsx`
- Modify: `client/src/pages/TerminalPage.tsx`

- [ ] **Step 1: Create BrowserPanel component**

```tsx
// client/src/components/browser/BrowserPanel.tsx
import { useState, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import { IconClose } from '../icons';

interface BrowserPanelProps {
  agentId: string;
  onClose: () => void;
}

export function BrowserPanel({ agentId, onClose }: BrowserPanelProps) {
  const meta = useAppStore((s) => s.agentMeta.get(agentId));
  const ports = meta?.listeningPorts || [];
  const defaultUrl = ports.length > 0 ? `http://localhost:${ports[0]}` : '';
  const [url, setUrl] = useState(defaultUrl);
  const [inputUrl, setInputUrl] = useState(defaultUrl);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = (newUrl: string) => {
    let normalized = newUrl.trim();
    if (normalized && !normalized.startsWith('http')) {
      normalized = `http://${normalized}`;
    }
    setUrl(normalized);
    setInputUrl(normalized);
    setError(false);
  };

  return (
    <div className="flex flex-col h-full bg-deck-surface">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-deck-border shrink-0">
        <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1 rounded hover:bg-deck-border/50 text-deck-text-dim text-xs">◀</button>
        <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1 rounded hover:bg-deck-border/50 text-deck-text-dim text-xs">▶</button>
        <button onClick={() => { if (iframeRef.current) iframeRef.current.src = url; }} className="p-1 rounded hover:bg-deck-border/50 text-deck-text-dim text-xs">↻</button>

        <form onSubmit={(e) => { e.preventDefault(); navigate(inputUrl); }} className="flex-1 flex">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 bg-deck-bg border border-deck-border rounded px-2 py-0.5 text-xs outline-none text-deck-text"
          />
        </form>

        <button onClick={onClose} className="p-1 rounded hover:bg-deck-border/50">
          <IconClose size={12} />
        </button>
      </div>

      {/* Port shortcuts */}
      {ports.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-deck-border/50 shrink-0">
          {ports.map((port) => (
            <button
              key={port}
              onClick={() => navigate(`http://localhost:${port}`)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                url.includes(`:${port}`) ? 'bg-deck-accent/20 text-deck-accent' : 'bg-deck-bg text-deck-text-dim hover:bg-deck-border/30'
              }`}
            >
              :{port}
            </button>
          ))}
        </div>
      )}

      {/* iframe */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        {url ? (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-sm text-deck-text-dim mb-2">이 페이지는 iframe에서 열 수 없습니다.</p>
                <a href={url} target="_blank" rel="noopener" className="text-xs text-blue-400 underline">새 탭에서 열기</a>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={url}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                onError={() => setError(true)}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-deck-text-dim">
            {ports.length === 0 ? '감지된 포트 없음' : 'URL을 입력하세요'}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add browser panel tab toggle to TerminalPage desktop layout**

In `client/src/pages/TerminalPage.tsx`, add import:
```typescript
import { BrowserPanel } from '../components/browser/BrowserPanel';
```

Add state for the right panel tab:
```typescript
const [rightTab, setRightTab] = useState<'subagent' | 'browser'>('subagent');
```

In the desktop header, replace the "Anim" button with two tab buttons or modify it to toggle between anim/browser:
```tsx
<button
  onClick={() => { setRightPanelOpen(!rightPanelOpen); setRightTab('subagent'); }}
  className={`text-xs px-2 py-0.5 rounded transition-colors ${
    rightPanelOpen && rightTab === 'subagent' ? 'bg-purple-500/20 text-purple-400' : 'bg-deck-bg text-deck-text-dim'
  }`}
>
  Anim
</button>
<button
  onClick={() => { setRightPanelOpen(!rightPanelOpen || rightTab !== 'browser'); setRightTab('browser'); }}
  className={`text-xs px-2 py-0.5 rounded transition-colors ${
    rightPanelOpen && rightTab === 'browser' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-deck-bg text-deck-text-dim'
  }`}
>
  🌐
</button>
```

In the right panel content area, switch based on rightTab:
```tsx
{rightPanelOpen && !zoomedPanel && (
  <>
    <div
      className="w-1 cursor-col-resize shrink-0 hover:opacity-100 opacity-0 transition-opacity bg-purple-500"
      onMouseDown={(e) => handleMouseDown('right', e)}
    />
    <div className="shrink-0 flex flex-col" style={{ width: `${rightWidth}px`, borderLeft: '1px solid var(--deck-border, #1e293b)', overflow: 'hidden', minHeight: 0 }}>
      {rightTab === 'browser' ? (
        <BrowserPanel agentId={agentId} onClose={() => setRightPanelOpen(false)} />
      ) : (
        <SubAgentPanel subAgents={subAgents} palette={generatePalette(agent?.colorHue ?? 220)} onClose={() => setRightPanelOpen(false)} />
      )}
    </div>
  </>
)}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/browser/BrowserPanel.tsx client/src/pages/TerminalPage.tsx
git commit -m "feat: add embedded browser panel with port shortcuts"
```

---

### Task 17: CLI Subcommands

**Files:**
- Create: `server/cli/root.go`
- Create: `server/cli/agents.go`
- Create: `server/cli/auth.go`
- Modify: `server/main.go`

- [ ] **Step 1: Create CLI root with subcommand router**

```go
// server/cli/root.go
package cli

import (
	"fmt"
	"os"
	"strings"
)

var serverURL = "http://localhost:33033"

func Run(args []string) {
	if len(args) == 0 {
		return // No subcommand → run server (handled by main.go)
	}

	cmd := args[0]
	rest := args[1:]

	switch cmd {
	case "list":
		cmdList()
	case "create":
		cmdCreate(rest)
	case "delete":
		cmdDelete(rest)
	case "send":
		cmdSend(rest)
	case "status":
		cmdStatus(rest)
	case "login":
		cmdLogin()
	case "open":
		cmdOpen()
	case "ping":
		cmdPing()
	case "--version", "version":
		fmt.Println("agentdeck v0.1.0")
	case "--help", "help":
		printHelp()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", cmd)
		printHelp()
		os.Exit(1)
	}
	os.Exit(0)
}

// IsSubcommand returns true if args contain a known CLI subcommand (not the server).
func IsSubcommand(args []string) bool {
	if len(args) < 2 {
		return false
	}
	cmds := []string{"list", "create", "delete", "send", "status", "login", "open", "ping", "version", "help", "--version", "--help"}
	for _, c := range cmds {
		if args[1] == c {
			return true
		}
	}
	return false
}

func printHelp() {
	help := `AgentDeck — AI Agent Terminal Manager

Usage: agentdeck [command]

Commands:
  (no command)     Start the server
  list             List agents
  create           Create a new agent
  delete <id>      Delete an agent
  send <id> <text> Send text to an agent
  status [id]      Show agent status
  login            Authenticate CLI
  open             Open browser
  ping             Check server status
  version          Show version
  help             Show this help

Options:
  --version        Show version
  --help           Show this help`
	fmt.Println(help)
}

func requireToken() string {
	token := loadToken()
	if token == "" {
		fmt.Fprintln(os.Stderr, "Not authenticated. Run: agentdeck login")
		os.Exit(1)
	}
	return token
}

func parseFlags(args []string) map[string]string {
	flags := make(map[string]string)
	for i := 0; i < len(args); i++ {
		if strings.HasPrefix(args[i], "--") {
			key := strings.TrimPrefix(args[i], "--")
			if i+1 < len(args) && !strings.HasPrefix(args[i+1], "--") {
				flags[key] = args[i+1]
				i++
			} else {
				flags[key] = "true"
			}
		}
	}
	return flags
}

func positionalArgs(args []string) []string {
	var pos []string
	for i := 0; i < len(args); i++ {
		if strings.HasPrefix(args[i], "--") {
			i++ // skip value
			continue
		}
		pos = append(pos, args[i])
	}
	return pos
}
```

- [ ] **Step 2: Create agent CLI commands**

```go
// server/cli/agents.go
package cli

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

func cmdList() {
	token := requireToken()
	resp, err := apiGet("/api/agents", token)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}

	var agents []map[string]interface{}
	json.Unmarshal(resp, &agents)

	if len(agents) == 0 {
		fmt.Println("No agents running.")
		return
	}

	for _, a := range agents {
		status := a["status"]
		name := a["name"]
		id := a["id"]
		dir := a["workingDir"]
		fmt.Printf("  %s  %-20s  %-8s  %s\n", id, name, status, dir)
	}
}

func cmdCreate(args []string) {
	token := requireToken()
	flags := parseFlags(args)

	preset := flags["preset"]
	if preset == "" {
		preset = "claude-code"
	}
	dir := flags["dir"]
	if dir == "" {
		dir, _ = os.Getwd()
	}
	name := flags["name"]
	if name == "" {
		name = fmt.Sprintf("%s agent", preset)
	}

	body := fmt.Sprintf(`{"preset":"%s","name":"%s","workingDir":"%s","command":"%s","args":[]}`, preset, name, dir, preset)
	resp, err := apiPost("/api/agents", token, body)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}

	var agent map[string]interface{}
	json.Unmarshal(resp, &agent)
	fmt.Printf("Created agent: %s (%s)\n", agent["id"], agent["name"])
}

func cmdDelete(args []string) {
	token := requireToken()
	pos := positionalArgs(args)
	if len(pos) == 0 {
		fmt.Fprintln(os.Stderr, "Usage: agentdeck delete <id>")
		os.Exit(1)
	}
	_, err := apiDelete("/api/agents/"+pos[0], token)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
	fmt.Println("Deleted.")
}

func cmdSend(args []string) {
	token := requireToken()
	pos := positionalArgs(args)
	if len(pos) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: agentdeck send <id> <text>")
		os.Exit(1)
	}
	id := pos[0]
	text := strings.Join(pos[1:], " ")

	flags := parseFlags(args)
	if flags["ctrl-c"] == "true" {
		text = "\x03"
	}

	body := fmt.Sprintf(`{"data":"%s\n"}`, strings.ReplaceAll(text, `"`, `\"`))
	_, err := apiPost("/api/agents/"+id+"/send", token, body)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
	fmt.Println("Sent.")
}

func cmdStatus(args []string) {
	token := requireToken()
	pos := positionalArgs(args)
	if len(pos) > 0 {
		resp, err := apiGet("/api/agents/"+pos[0]+"/meta", token)
		if err != nil {
			fmt.Fprintln(os.Stderr, "Error:", err)
			os.Exit(1)
		}
		fmt.Println(string(resp))
		return
	}
	// All agents
	cmdList()
}

func cmdPing() {
	resp, err := http.Get(serverURL + "/api/auth/health")
	if err != nil {
		fmt.Println("Server is not running.")
		os.Exit(1)
	}
	defer resp.Body.Close()
	fmt.Println("Server is running.")
}

func cmdOpen() {
	url := serverURL
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	default:
		cmd = exec.Command("cmd", "/c", "start", url)
	}
	cmd.Start()
	fmt.Println("Opening browser...")
}

// HTTP helpers
func apiGet(path, token string) ([]byte, error) {
	req, _ := http.NewRequest("GET", serverURL+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func apiPost(path, token, body string) ([]byte, error) {
	req, _ := http.NewRequest("POST", serverURL+path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func apiDelete(path, token string) ([]byte, error) {
	req, _ := http.NewRequest("DELETE", serverURL+path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
```

- [ ] **Step 3: Create CLI auth (token storage)**

```go
// server/cli/auth.go
package cli

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func tokenPath() string {
	var dir string
	switch runtime.GOOS {
	case "darwin":
		dir = filepath.Join(os.Getenv("HOME"), "Library", "Application Support", "agentdeck")
	case "windows":
		dir = filepath.Join(os.Getenv("APPDATA"), "agentdeck")
	default:
		dir = filepath.Join(os.Getenv("HOME"), ".config", "agentdeck")
	}
	os.MkdirAll(dir, 0700)
	return filepath.Join(dir, "token.json")
}

func loadToken() string {
	data, err := os.ReadFile(tokenPath())
	if err != nil {
		return ""
	}
	var tok struct {
		AccessToken string `json:"accessToken"`
	}
	json.Unmarshal(data, &tok)
	return tok.AccessToken
}

func saveToken(access, refresh string) error {
	data, _ := json.Marshal(map[string]string{
		"accessToken":  access,
		"refreshToken": refresh,
	})
	path := tokenPath()
	if err := os.WriteFile(path, data, 0600); err != nil {
		return err
	}
	return nil
}

func cmdLogin() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter PIN: ")
	pin, _ := reader.ReadString('\n')
	pin = strings.TrimSpace(pin)

	body := fmt.Sprintf(`{"pin":"%s"}`, pin)
	resp, err := apiPost("/api/auth/login", "", body)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Login failed:", err)
		os.Exit(1)
	}

	var tokens struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.Unmarshal(resp, &tokens); err != nil || tokens.AccessToken == "" {
		fmt.Fprintln(os.Stderr, "Login failed: invalid PIN")
		os.Exit(1)
	}

	if err := saveToken(tokens.AccessToken, tokens.RefreshToken); err != nil {
		fmt.Fprintln(os.Stderr, "Failed to save token:", err)
		os.Exit(1)
	}
	fmt.Println("Logged in successfully.")
}
```

- [ ] **Step 4: Update main.go to route CLI subcommands**

In `server/main.go`, add import:
```go
"agentdeck/cli"
```

At the very beginning of the `main()` function (before `cfg := config.Load()`):
```go
if cli.IsSubcommand(os.Args) {
    cli.Run(os.Args[1:])
    return
}
```

- [ ] **Step 5: Verify server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add server/cli/root.go server/cli/agents.go server/cli/auth.go server/main.go
git commit -m "feat: add CLI subcommands for agent management and auth"
```

---

### Task 18: Mobile Visual Viewport Fix

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add visualViewport resize handler**

In `client/src/App.tsx`, add the following useEffect inside the App component (before the return):

```typescript
import { useEffect } from 'react';

// Inside App component:
useEffect(() => {
  if (!window.visualViewport) return;

  const handleResize = () => {
    const vh = window.visualViewport!.height;
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
  };

  window.visualViewport.addEventListener('resize', handleResize);
  handleResize();

  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);
```

In `client/src/styles/scroll.css`, add:
```css
/* Mobile keyboard-safe height */
@supports (height: 100dvh) {
  #root {
    height: var(--app-height, 100dvh);
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx client/src/styles/scroll.css
git commit -m "fix: handle mobile virtual keyboard with visualViewport API"
```

---

### Task 19: Final Integration + SendKeys

**Files:**
- Modify: `server/services/tmux.go`

- [ ] **Step 1: Verify SendKeys exists in TmuxService**

Check if `server/services/tmux.go` already has a `SendKeys` method. If it does, verify it works. If not, add:

```go
func (s *TmuxService) SendKeys(session, keys string) error {
	cmd := exec.Command("tmux", "send-keys", "-t", session, keys, "Enter")
	return cmd.Run()
}
```

The `AgentService.SendKeys` wrapper (added in Task 9) calls `s.tmuxSvc.SendKeys(tmuxSession, data)`.

- [ ] **Step 2: Verify full server compiles**

Run: `cd /Users/siwal/code/agentdeck-go/server && go build -o /dev/null ./...`
Expected: Build succeeds.

- [ ] **Step 3: Verify full client compiles**

Run: `cd /Users/siwal/code/agentdeck-go/client && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit if any changes**

```bash
git add -A && git diff --cached --quiet || git commit -m "fix: ensure SendKeys works end-to-end"
```

---

### Task 20: Smoke Test

- [ ] **Step 1: Start dev server**

Run: `cd /Users/siwal/code/agentdeck-go && make dev`
Expected: Server starts on port 33033, client on 5173.

- [ ] **Step 2: Verify API endpoints**

Run:
```bash
curl -s http://localhost:33033/api/auth/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 3: Verify CLI**

Run:
```bash
cd /Users/siwal/code/agentdeck-go/server && go run . --help
```
Expected: Help text printed, exit 0.

- [ ] **Step 4: Verify client loads**

Open `http://localhost:5173` — should show login page with no console errors.

- [ ] **Step 5: Test Cmd+K**

After login, press Cmd+K — command palette should appear.

- [ ] **Step 6: Commit final state**

If any fixes were needed during smoke testing, commit them.
