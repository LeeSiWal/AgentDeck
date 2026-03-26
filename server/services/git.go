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
	cache map[string]*GitInfo
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

	absDir, err := filepath.Abs(workingDir)
	if err != nil {
		return info
	}

	out, err := exec.Command("git", "-C", absDir, "branch", "--show-current").Output()
	if err != nil {
		return info
	}
	info.Branch = strings.TrimSpace(string(out))

	out, err = exec.Command("git", "-C", absDir, "status", "--porcelain").Output()
	if err == nil {
		info.Dirty = len(strings.TrimSpace(string(out))) > 0
	}

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
