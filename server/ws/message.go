package ws

import "encoding/json"

type WSMessage struct {
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}

// Client -> Server events
const (
	EventTerminalAttach = "terminal:attach"
	EventTerminalDetach = "terminal:detach"
	EventTerminalInput  = "terminal:input"
	EventTerminalResize = "terminal:resize"
	EventFileWatch      = "file:watch"
	EventFileUnwatch    = "file:unwatch"
)

// Server -> Client events
const (
	EventTerminalOutput = "terminal:output"
	EventAgentList      = "agent:list"
	EventAgentStatus    = "agent:status"
	EventAgentCreated   = "agent:created"
	EventAgentDestroyed = "agent:destroyed"
	EventFileChanged    = "file:changed"
	EventFileTree       = "file:tree"
)

type TerminalAttachPayload struct {
	AgentID string `json:"agentId"`
	Cols    uint16 `json:"cols"`
	Rows    uint16 `json:"rows"`
}

type TerminalInputPayload struct {
	AgentID string `json:"agentId"`
	Data    string `json:"data"`
}

type TerminalResizePayload struct {
	AgentID string `json:"agentId"`
	Cols    uint16 `json:"cols"`
	Rows    uint16 `json:"rows"`
}

type TerminalOutputPayload struct {
	AgentID string `json:"agentId"`
	Data    string `json:"data"`
}

type FileWatchPayload struct {
	AgentID string `json:"agentId"`
	Path    string `json:"path"`
}

type AgentStatusPayload struct {
	AgentID string `json:"agentId"`
	Status  string `json:"status"`
}
