package services

import (
	"io"
	"log"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
)

type PtySession struct {
	Ptmx    *os.File
	Cmd     *exec.Cmd
	AgentID string
	done    chan struct{}
}

type PtyService struct {
	sessions sync.Map
}

func NewPtyService() *PtyService {
	return &PtyService{}
}

func (s *PtyService) Start(agentID, command string, args []string, workingDir string) (*PtySession, error) {
	cmd := exec.Command(command, args...)
	cmd.Dir = workingDir
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"LANG=ko_KR.UTF-8",
		"LC_ALL=ko_KR.UTF-8",
	)

	ptmx, err := pty.Start(cmd)
	if err != nil {
		return nil, err
	}

	session := &PtySession{
		Ptmx:    ptmx,
		Cmd:     cmd,
		AgentID: agentID,
		done:    make(chan struct{}),
	}
	s.sessions.Store(agentID, session)
	return session, nil
}

func (s *PtyService) AttachTmux(agentID, tmuxSession string, cols, rows uint16) (*PtySession, error) {
	cmd := exec.Command("tmux", "attach", "-t", tmuxSession)
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"LANG=ko_KR.UTF-8",
		"LC_ALL=ko_KR.UTF-8",
	)

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: rows, Cols: cols})
	if err != nil {
		return nil, err
	}

	session := &PtySession{
		Ptmx:    ptmx,
		Cmd:     cmd,
		AgentID: agentID,
		done:    make(chan struct{}),
	}
	s.sessions.Store(agentID, session)
	return session, nil
}

func (s *PtyService) Write(agentID string, data []byte) {
	if val, ok := s.sessions.Load(agentID); ok {
		session := val.(*PtySession)
		session.Ptmx.Write(data)
	}
}

func (s *PtyService) Resize(agentID string, cols, rows uint16) {
	if val, ok := s.sessions.Load(agentID); ok {
		session := val.(*PtySession)
		pty.Setsize(session.Ptmx, &pty.Winsize{Rows: rows, Cols: cols})
	}
}

func (s *PtyService) Close(agentID string) {
	if val, ok := s.sessions.LoadAndDelete(agentID); ok {
		session := val.(*PtySession)
		close(session.done)
		session.Ptmx.Close()
		if session.Cmd.Process != nil {
			session.Cmd.Process.Kill()
		}
	}
}

func (s *PtyService) HasSession(agentID string) bool {
	_, ok := s.sessions.Load(agentID)
	return ok
}

func (s *PtyService) ReadPump(agentID string, onData func(data []byte)) {
	val, ok := s.sessions.Load(agentID)
	if !ok {
		return
	}
	session := val.(*PtySession)

	buf := make([]byte, 4096)
	for {
		select {
		case <-session.done:
			return
		default:
		}

		n, err := session.Ptmx.Read(buf)
		if err != nil {
			if err != io.EOF {
				log.Printf("PTY read error for %s: %v", agentID, err)
			}
			break
		}
		if n > 0 {
			data := make([]byte, n)
			copy(data, buf[:n])
			onData(data)
		}
	}
}
