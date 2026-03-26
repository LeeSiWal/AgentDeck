package db

import "database/sql"

const schema = `
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    preset TEXT NOT NULL,
    name TEXT NOT NULL,
    tmux_session TEXT NOT NULL UNIQUE,
    working_dir TEXT NOT NULL,
    command TEXT NOT NULL,
    args TEXT DEFAULT '[]',
    status TEXT DEFAULT 'stopped',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recent_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_opened_at TEXT DEFAULT (datetime('now')),
    last_agent_preset TEXT,
    open_count INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_recent_projects_last_opened ON recent_projects(last_opened_at DESC);
`

const ftsMigration = `
CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(data, content='logs', content_rowid='id');
`

const colorMigration = `
ALTER TABLE agents ADD COLUMN color_hue INTEGER DEFAULT 220;
ALTER TABLE agents ADD COLUMN color_name TEXT DEFAULT 'blue';
`

func Migrate(db *sql.DB) error {
	if _, err := db.Exec(schema); err != nil {
		return err
	}
	// FTS5 creation may fail on some builds, non-fatal
	db.Exec(ftsMigration)

	// Color columns — may already exist, non-fatal
	for _, stmt := range []string{
		"ALTER TABLE agents ADD COLUMN color_hue INTEGER DEFAULT 220",
		"ALTER TABLE agents ADD COLUMN color_name TEXT DEFAULT 'blue'",
	} {
		db.Exec(stmt)
	}
	return nil
}
