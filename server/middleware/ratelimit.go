package middleware

import (
	"net/http"
	"sync"
	"time"
)

type visitor struct {
	count    int
	lastSeen time.Time
}

type RateLimiter struct {
	visitors sync.Map
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{limit: limit, window: window}
	// Cleanup old entries periodically
	go func() {
		for {
			time.Sleep(window)
			rl.visitors.Range(func(key, value interface{}) bool {
				v := value.(*visitor)
				if time.Since(v.lastSeen) > window {
					rl.visitors.Delete(key)
				}
				return true
			})
		}
	}()
	return rl
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		val, _ := rl.visitors.LoadOrStore(ip, &visitor{})
		v := val.(*visitor)

		now := time.Now()
		if now.Sub(v.lastSeen) > rl.window {
			v.count = 0
		}

		v.count++
		v.lastSeen = now

		if v.count > rl.limit {
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
