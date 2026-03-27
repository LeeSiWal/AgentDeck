package handlers

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const maxProxyResponseSize = 10 * 1024 * 1024 // 10MB

func ProxyHandler() http.HandlerFunc {
	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			jsonError(w, "only GET allowed", http.StatusMethodNotAllowed)
			return
		}

		targetURL := r.URL.Query().Get("url")
		if targetURL == "" {
			jsonError(w, "url parameter required", http.StatusBadRequest)
			return
		}

		parsed, err := url.Parse(targetURL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			jsonError(w, "invalid URL", http.StatusBadRequest)
			return
		}

		// Block localhost proxying (use direct connection)
		host := strings.ToLower(parsed.Hostname())
		if host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "0.0.0.0" {
			jsonError(w, "use direct connection for localhost", http.StatusBadRequest)
			return
		}

		req, err := http.NewRequest("GET", targetURL, nil)
		if err != nil {
			jsonError(w, "request error", http.StatusBadRequest)
			return
		}

		// Forward a reasonable User-Agent
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; AgentDeck/1.0)")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
		req.Header.Set("Accept-Language", "en-US,en;q=0.9,ko;q=0.8")

		resp, err := client.Do(req)
		if err != nil {
			jsonError(w, "fetch failed: "+err.Error(), http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Remove iframe-blocking headers
		resp.Header.Del("X-Frame-Options")
		resp.Header.Del("Content-Security-Policy")
		resp.Header.Del("Cross-Origin-Embedder-Policy")
		resp.Header.Del("Cross-Origin-Opener-Policy")
		resp.Header.Del("Cross-Origin-Resource-Policy")

		// Copy response headers
		for key, vals := range resp.Header {
			for _, val := range vals {
				w.Header().Add(key, val)
			}
		}

		w.WriteHeader(resp.StatusCode)
		io.Copy(w, io.LimitReader(resp.Body, maxProxyResponseSize))
	}
}
