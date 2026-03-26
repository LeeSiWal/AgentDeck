package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	Pin         string
	JWTSecret   string
	Port        string
	DBPath      string
	CORSOrigins string
	SetupMode   bool // true if first run (no .env found)
}

func Load() *Config {
	// Find .env relative to the executable
	envPath := findEnvFile()
	if envPath != "" {
		godotenv.Load(envPath)
	}

	cfg := &Config{
		Pin:         os.Getenv("AGENTDECK_PIN"),
		JWTSecret:   os.Getenv("AGENTDECK_JWT_SECRET"),
		Port:        os.Getenv("AGENTDECK_PORT"),
		DBPath:      os.Getenv("AGENTDECK_DB_PATH"),
		CORSOrigins: os.Getenv("AGENTDECK_CORS_ORIGINS"),
	}

	// First run: no .env and no PIN → auto-generate everything
	if cfg.Pin == "" {
		cfg.SetupMode = true
		cfg.Pin = generatePin()

		// Also generate JWT secret
		b := make([]byte, 32)
		rand.Read(b)
		cfg.JWTSecret = hex.EncodeToString(b)

		// Save .env so next time it persists
		saveEnvFile(cfg)

		log.Printf("First run detected — generated PIN: %s", cfg.Pin)
	}

	if cfg.JWTSecret == "" {
		b := make([]byte, 32)
		rand.Read(b)
		cfg.JWTSecret = hex.EncodeToString(b)

		// Update .env with the JWT secret
		updateEnvValue("AGENTDECK_JWT_SECRET", cfg.JWTSecret)
	}

	if cfg.Port == "" {
		cfg.Port = "33033"
	}

	if cfg.DBPath == "" {
		cfg.DBPath = resolveDBPath()
	}

	if cfg.CORSOrigins == "" {
		cfg.CORSOrigins = fmt.Sprintf("http://localhost:%s", cfg.Port)
	}

	return cfg
}

func generatePin() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

func findEnvFile() string {
	// 1. Check next to executable
	exe, err := os.Executable()
	if err == nil {
		p := filepath.Join(filepath.Dir(exe), ".env")
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	// 2. Check current directory
	if _, err := os.Stat(".env"); err == nil {
		return ".env"
	}
	return ""
}

func resolveDBPath() string {
	// Store DB next to executable if possible
	exe, err := os.Executable()
	if err == nil {
		return filepath.Join(filepath.Dir(exe), "agentdeck.db")
	}
	return "./agentdeck.db"
}

func saveEnvFile(cfg *Config) {
	// Save next to executable
	envPath := ".env"
	exe, err := os.Executable()
	if err == nil {
		envPath = filepath.Join(filepath.Dir(exe), ".env")
	}

	content := fmt.Sprintf(`AGENTDECK_PIN=%s
AGENTDECK_JWT_SECRET=%s
AGENTDECK_PORT=%s
AGENTDECK_DB_PATH=%s
AGENTDECK_CORS_ORIGINS=
`, cfg.Pin, cfg.JWTSecret, cfg.Port, cfg.DBPath)

	os.WriteFile(envPath, []byte(content), 0600)
}

func updateEnvValue(key, value string) {
	envPath := findEnvFile()
	if envPath == "" {
		return
	}
	data, err := os.ReadFile(envPath)
	if err != nil {
		return
	}
	env, _ := godotenv.Unmarshal(string(data))
	env[key] = value
	result := ""
	for k, v := range env {
		result += fmt.Sprintf("%s=%s\n", k, v)
	}
	os.WriteFile(envPath, []byte(result), 0600)
}
