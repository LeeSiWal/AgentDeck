package services

import (
	"log"
	"path/filepath"
	"strings"
	"sync"

	"github.com/fsnotify/fsnotify"
)

type FileChange struct {
	Path      string `json:"path"`
	Operation string `json:"operation"` // create, write, remove, rename
}

type WatcherService struct {
	watchers   sync.Map // map[string]*fsnotify.Watcher (agentID -> watcher)
	onChangeFn func(agentID string, change FileChange)
}

func NewWatcherService() *WatcherService {
	return &WatcherService{}
}

func (s *WatcherService) SetOnChange(fn func(agentID string, change FileChange)) {
	s.onChangeFn = fn
}

func (s *WatcherService) Watch(agentID, dirPath string) error {
	// Stop existing watcher for this agent
	s.Unwatch(agentID)

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	s.watchers.Store(agentID, watcher)

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				// Skip hidden files and common noise
				base := filepath.Base(event.Name)
				if strings.HasPrefix(base, ".") || strings.HasSuffix(base, "~") {
					continue
				}
				if ignoredDirs[base] {
					continue
				}

				var op string
				switch {
				case event.Has(fsnotify.Create):
					op = "create"
				case event.Has(fsnotify.Write):
					op = "write"
				case event.Has(fsnotify.Remove):
					op = "remove"
				case event.Has(fsnotify.Rename):
					op = "rename"
				default:
					continue
				}

				if s.onChangeFn != nil {
					s.onChangeFn(agentID, FileChange{
						Path:      event.Name,
						Operation: op,
					})
				}

			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Printf("Watcher error for %s: %v", agentID, err)
			}
		}
	}()

	return watcher.Add(dirPath)
}

func (s *WatcherService) Unwatch(agentID string) {
	if val, ok := s.watchers.LoadAndDelete(agentID); ok {
		watcher := val.(*fsnotify.Watcher)
		watcher.Close()
	}
}
