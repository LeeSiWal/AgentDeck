package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type LogEntry struct {
	ID        int    `json:"id"`
	AgentID   string `json:"agentId"`
	Data      string `json:"data"`
	CreatedAt string `json:"createdAt"`
}

func SearchLogs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		limitStr := r.URL.Query().Get("limit")
		limit := 100
		if limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 1000 {
				limit = l
			}
		}

		var rows *sql.Rows
		var err error

		if query != "" {
			// Try FTS5 first
			rows, err = db.Query(
				"SELECT l.id, l.agent_id, l.data, l.created_at FROM logs l JOIN logs_fts f ON l.id = f.rowid WHERE logs_fts MATCH ? ORDER BY l.created_at DESC LIMIT ?",
				query, limit,
			)
			if err != nil {
				// Fallback to LIKE
				rows, err = db.Query(
					"SELECT id, agent_id, data, created_at FROM logs WHERE data LIKE ? ORDER BY created_at DESC LIMIT ?",
					"%"+query+"%", limit,
				)
			}
		} else {
			rows, err = db.Query(
				"SELECT id, agent_id, data, created_at FROM logs ORDER BY created_at DESC LIMIT ?",
				limit,
			)
		}

		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var logs []LogEntry
		for rows.Next() {
			var l LogEntry
			if err := rows.Scan(&l.ID, &l.AgentID, &l.Data, &l.CreatedAt); err != nil {
				continue
			}
			logs = append(logs, l)
		}
		if logs == nil {
			logs = []LogEntry{}
		}
		jsonResponse(w, logs)
	}
}

func AgentLogs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		agentID := mux.Vars(r)["agentId"]
		limitStr := r.URL.Query().Get("limit")
		limit := 100
		if limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 1000 {
				limit = l
			}
		}

		rows, err := db.Query(
			"SELECT id, agent_id, data, created_at FROM logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?",
			agentID, limit,
		)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var logs []LogEntry
		for rows.Next() {
			var l LogEntry
			if err := rows.Scan(&l.ID, &l.AgentID, &l.Data, &l.CreatedAt); err != nil {
				continue
			}
			logs = append(logs, l)
		}
		if logs == nil {
			logs = []LogEntry{}
		}
		jsonResponse(w, logs)
	}
}
