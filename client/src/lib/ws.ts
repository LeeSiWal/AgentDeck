type EventHandler = (payload: any) => void;

class AgentDeckWS {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<EventHandler>>();
  private reconnectTimer: number | null = null;
  private token: string | null = null;

  connect(token: string) {
    if (
      this.token === token &&
      (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.token = token;
    this.cleanup();

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}/ws?token=${token}`);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      // Emit 'open' to all listeners so components can re-attach
      this.listeners.get('open')?.forEach((fn) => fn({}));
    };

    this.ws.onmessage = (e) => {
      try {
        const { event, payload } = JSON.parse(e.data);
        this.listeners.get(event)?.forEach((fn) => fn(payload));
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      // Emit 'close' to all listeners
      this.listeners.get('close')?.forEach((fn) => fn({}));
      this.reconnectTimer = window.setTimeout(() => {
        if (this.token) this.connect(this.token);
      }, 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  send(event: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
    }
  }

  on(event: string, fn: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return () => {
      this.listeners.get(event)?.delete(fn);
    };
  }

  off(event: string, fn: EventHandler) {
    this.listeners.get(event)?.delete(fn);
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect() {
    this.token = null;
    this.cleanup();
  }
}

export const agentDeckWS = new AgentDeckWS();
