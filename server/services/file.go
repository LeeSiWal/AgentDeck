package services

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type FileService struct{}

func NewFileService() *FileService {
	return &FileService{}
}

type FileNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Size     int64       `json:"size,omitempty"`
	ModTime  string      `json:"modTime,omitempty"`
	Children []*FileNode `json:"children,omitempty"`
}

type FileStat struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
	Mode    string `json:"mode"`
}

var ignoredDirs = map[string]bool{}

func (s *FileService) ValidatePath(baseDir, requestedPath string) (string, error) {
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return "", err
	}

	absPath, err := filepath.Abs(requestedPath)
	if err != nil {
		return "", err
	}

	// Resolve symlinks for traversal check
	realBase, err := filepath.EvalSymlinks(absBase)
	if err != nil {
		realBase = absBase
	}
	realPath, err := filepath.EvalSymlinks(absPath)
	if err != nil {
		// File might not exist yet (for writes), check parent
		realPath = absPath
	}

	if !strings.HasPrefix(realPath, realBase) {
		return "", fmt.Errorf("path traversal detected")
	}

	return absPath, nil
}

func (s *FileService) GetTree(baseDir string, maxDepth int) (*FileNode, error) {
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, err
	}

	info, err := os.Stat(absBase)
	if err != nil {
		return nil, err
	}

	root := &FileNode{
		Name:  info.Name(),
		Path:  absBase,
		IsDir: true,
	}

	s.buildTree(root, absBase, 0, maxDepth)
	return root, nil
}

func (s *FileService) buildTree(node *FileNode, dir string, depth, maxDepth int) {
	if depth >= maxDepth {
		return
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	// Sort: dirs first, then files, both alphabetical
	sort.Slice(entries, func(i, j int) bool {
		iDir := entries[i].IsDir()
		jDir := entries[j].IsDir()
		if iDir != jDir {
			return iDir
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	for _, entry := range entries {
		name := entry.Name()
		if ignoredDirs[name] {
			continue
		}

		childPath := filepath.Join(dir, name)
		child := &FileNode{
			Name:  name,
			Path:  childPath,
			IsDir: entry.IsDir(),
		}

		if !entry.IsDir() {
			if info, err := entry.Info(); err == nil {
				child.Size = info.Size()
				child.ModTime = info.ModTime().Format("2006-01-02T15:04:05Z")
			}
		}

		if entry.IsDir() {
			s.buildTree(child, childPath, depth+1, maxDepth)
		}

		node.Children = append(node.Children, child)
	}
}

func (s *FileService) ReadFile(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (s *FileService) WriteFile(filePath, content string) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(filePath, []byte(content), 0644)
}

func (s *FileService) Mkdir(dirPath string) error {
	return os.MkdirAll(dirPath, 0755)
}

func (s *FileService) Delete(path string) error {
	return os.RemoveAll(path)
}

func (s *FileService) Rename(oldPath, newPath string) error {
	return os.Rename(oldPath, newPath)
}

func (s *FileService) Stat(filePath string) (*FileStat, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}
	return &FileStat{
		Name:    info.Name(),
		Path:    filePath,
		IsDir:   info.IsDir(),
		Size:    info.Size(),
		ModTime: info.ModTime().Format("2006-01-02T15:04:05Z"),
		Mode:    info.Mode().String(),
	}, nil
}
