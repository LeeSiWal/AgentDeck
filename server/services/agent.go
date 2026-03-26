package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

type Agent struct {
	ID          string   `json:"id"`
	Preset      string   `json:"preset"`
	Name        string   `json:"name"`
	TmuxSession string   `json:"tmuxSession"`
	WorkingDir  string   `json:"workingDir"`
	Command     string   `json:"command"`
	Args        []string `json:"args"`
	Status      string   `json:"status"`
	ColorHue    int      `json:"colorHue"`
	ColorName   string   `json:"colorName"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

var colorPool = []struct {
	Name string
	Hue  int
}{
	{"blue", 220}, {"amber", 38}, {"emerald", 160}, {"violet", 270},
	{"pink", 330}, {"cyan", 190}, {"orange", 25}, {"teal", 170},
	{"red", 0}, {"lime", 80}, {"indigo", 245}, {"rose", 350},
}

type AgentService struct {
	db      *sql.DB
	tmuxSvc *TmuxService
	ptySvc  *PtyService
}

func NewAgentService(db *sql.DB, tmuxSvc *TmuxService, ptySvc *PtyService) *AgentService {
	return &AgentService{db: db, tmuxSvc: tmuxSvc, ptySvc: ptySvc}
}

func (s *AgentService) List() ([]Agent, error) {
	rows, err := s.db.Query("SELECT id, preset, name, tmux_session, working_dir, command, args, status, COALESCE(color_hue, 220), COALESCE(color_name, 'blue'), created_at, updated_at FROM agents ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// First: read all rows (no DB writes while rows are open — avoids SQLite deadlock)
	var agents []Agent
	for rows.Next() {
		var a Agent
		var argsJSON string
		if err := rows.Scan(&a.ID, &a.Preset, &a.Name, &a.TmuxSession, &a.WorkingDir, &a.Command, &argsJSON, &a.Status, &a.ColorHue, &a.ColorName, &a.CreatedAt, &a.UpdatedAt); err != nil {
			continue
		}
		json.Unmarshal([]byte(argsJSON), &a.Args)
		agents = append(agents, a)
	}
	rows.Close()

	// Second: check tmux status and update DB after rows are closed
	for i := range agents {
		a := &agents[i]
		if s.tmuxSvc.HasSession(a.TmuxSession) {
			if a.Status != "running" {
				a.Status = "running"
				s.db.Exec("UPDATE agents SET status = 'running', updated_at = datetime('now') WHERE id = ?", a.ID)
			}
		} else {
			if a.Status == "running" {
				a.Status = "stopped"
				s.db.Exec("UPDATE agents SET status = 'stopped', updated_at = datetime('now') WHERE id = ?", a.ID)
			}
		}
	}
	return agents, nil
}

func (s *AgentService) Get(id string) (*Agent, error) {
	var a Agent
	var argsJSON string
	err := s.db.QueryRow(
		"SELECT id, preset, name, tmux_session, working_dir, command, args, status, COALESCE(color_hue, 220), COALESCE(color_name, 'blue'), created_at, updated_at FROM agents WHERE id = ?",
		id,
	).Scan(&a.ID, &a.Preset, &a.Name, &a.TmuxSession, &a.WorkingDir, &a.Command, &argsJSON, &a.Status, &a.ColorHue, &a.ColorName, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(argsJSON), &a.Args)
	return &a, nil
}

type CreateAgentRequest struct {
	Preset     string   `json:"preset"`
	Name       string   `json:"name"`
	WorkingDir string   `json:"workingDir"`
	Command    string   `json:"command"`
	Args       []string `json:"args"`
}

func (s *AgentService) assignColor() (int, string) {
	// Get existing hues
	rows, err := s.db.Query("SELECT COALESCE(color_hue, 220) FROM agents")
	if err != nil {
		return colorPool[0].Hue, colorPool[0].Name
	}
	defer rows.Close()

	var existingHues []int
	for rows.Next() {
		var h int
		rows.Scan(&h)
		existingHues = append(existingHues, h)
	}

	bestHue := colorPool[0].Hue
	bestName := colorPool[0].Name
	maxDist := -1

	for _, c := range colorPool {
		if len(existingHues) == 0 {
			return c.Hue, c.Name
		}
		minDist := 360
		for _, h := range existingHues {
			diff := c.Hue - h
			if diff < 0 {
				diff = -diff
			}
			if 360-diff < diff {
				diff = 360 - diff
			}
			if diff < minDist {
				minDist = diff
			}
		}
		if minDist > maxDist {
			maxDist = minDist
			bestHue = c.Hue
			bestName = c.Name
		}
	}
	return bestHue, bestName
}

func (s *AgentService) Create(req CreateAgentRequest) (*Agent, error) {
	b := make([]byte, 4)
	rand.Read(b)
	id := hex.EncodeToString(b)
	tmuxSession := s.tmuxSvc.GenerateSessionName(id)

	argsJSON, _ := json.Marshal(req.Args)

	// Assign color
	colorHue, colorName := s.assignColor()

	// Create tmux session
	if err := s.tmuxSvc.CreateSession(tmuxSession, req.WorkingDir, req.Command, req.Args); err != nil {
		return nil, fmt.Errorf("failed to create tmux session: %w", err)
	}

	now := time.Now().Format("2006-01-02T15:04:05Z")
	agent := &Agent{
		ID:          id,
		Preset:      req.Preset,
		Name:        req.Name,
		TmuxSession: tmuxSession,
		WorkingDir:  req.WorkingDir,
		Command:     req.Command,
		Args:        req.Args,
		Status:      "running",
		ColorHue:    colorHue,
		ColorName:   colorName,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	_, err := s.db.Exec(
		"INSERT INTO agents (id, preset, name, tmux_session, working_dir, command, args, status, color_hue, color_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		agent.ID, agent.Preset, agent.Name, agent.TmuxSession, agent.WorkingDir, agent.Command, string(argsJSON), agent.Status, agent.ColorHue, agent.ColorName,
	)
	if err != nil {
		s.tmuxSvc.KillSession(tmuxSession)
		return nil, err
	}

	return agent, nil
}

func (s *AgentService) Delete(id string) error {
	agent, err := s.Get(id)
	if err != nil {
		return err
	}

	s.ptySvc.Close(id)
	s.tmuxSvc.KillSession(agent.TmuxSession)

	_, err = s.db.Exec("DELETE FROM agents WHERE id = ?", id)
	return err
}

func (s *AgentService) Restart(id string) (*Agent, error) {
	agent, err := s.Get(id)
	if err != nil {
		return nil, err
	}

	s.ptySvc.Close(id)
	s.tmuxSvc.KillSession(agent.TmuxSession)

	if err := s.tmuxSvc.CreateSession(agent.TmuxSession, agent.WorkingDir, agent.Command, agent.Args); err != nil {
		return nil, fmt.Errorf("failed to restart tmux session: %w", err)
	}

	s.db.Exec("UPDATE agents SET status = 'running', updated_at = datetime('now') WHERE id = ?", id)
	agent.Status = "running"
	return agent, nil
}

func (s *AgentService) GetWorkingDir(id string) (string, error) {
	agent, err := s.Get(id)
	if err != nil {
		return "", err
	}
	return agent.WorkingDir, nil
}

func (s *AgentService) UpdateStatus(id, status string) error {
	_, err := s.db.Exec("UPDATE agents SET status = ?, updated_at = datetime('now') WHERE id = ?", status, id)
	return err
}

func (s *AgentService) SendKeys(tmuxSession, data string) error {
	return s.tmuxSvc.SendKeys(tmuxSession, data)
}
