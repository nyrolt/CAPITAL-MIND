import { LiveMarketTick, MarketProviderStatus } from '../types';
import { apiClient } from './apiClient';

type TickListener = (tick: LiveMarketTick) => void;
type StatusListener = (status: MarketProviderStatus) => void;

class MarketDataWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private isExplicitlyClosed = false;

  // Active subscriptions with reference count: instrument_key -> count
  private subscriptionCounts: Map<string, number> = new Map();

  // Cached latest ticks: symbol and instrument_key -> LiveMarketTick
  private latestTicks: Map<string, LiveMarketTick> = new Map();

  // Listeners
  private tickListeners: Set<TickListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  public connectionState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' = 'DISCONNECTED';
  public providerStatus: MarketProviderStatus | null = null;

  constructor() {
    // Lazily connected on first subscription or component mount
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.connectionState = this.connectionState === 'DISCONNECTED' ? 'CONNECTING' : 'RECONNECTING';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend runs on port 8000
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `${window.location.hostname}:8000`
      : window.location.host;

    const wsUrl = `${protocol}//${host}/ws/market`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connectionState = 'CONNECTED';
        this.reconnectDelay = 2000;

        // Start ping heartbeat every 25 seconds
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);

        // Resubscribe all active keys
        const allKeys = Array.from(this.subscriptionCounts.keys());
        if (allKeys.length > 0 && this.ws) {
          this.ws.send(JSON.stringify({ action: 'subscribe', instrument_keys: allKeys }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'market_tick' && msg.data) {
            const tick: LiveMarketTick = msg.data;
            this.latestTicks.set(tick.instrument_key, tick);
            this.latestTicks.set(tick.symbol.toUpperCase(), tick);
            this.notifyTickListeners(tick);
          } else if (msg.type === 'status' && msg.data) {
            this.providerStatus = msg.data;
            this.notifyStatusListeners(msg.data);
          }
        } catch (e) {
          // ignore malformed frame
        }
      };

      this.ws.onerror = () => {
        // Handled in onclose
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.pingTimer) clearInterval(this.pingTimer);

        if (!this.isExplicitlyClosed) {
          this.connectionState = 'RECONNECTING';
          this.scheduleReconnect();
        } else {
          this.connectionState = 'DISCONNECTED';
        }
      };

    } catch (e) {
      this.connectionState = 'DISCONNECTED';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  public subscribe(keys: string[]) {
    this.connect();
    const newKeysToSend: string[] = [];

    for (const key of keys) {
      const upper = key.trim().toUpperCase();
      if (!upper) continue;
      const count = this.subscriptionCounts.get(upper) || 0;
      this.subscriptionCounts.set(upper, count + 1);
      if (count === 0) {
        newKeysToSend.push(upper);
      }
    }

    if (newKeysToSend.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', instrument_keys: newKeysToSend }));
    }
  }

  public unsubscribe(keys: string[]) {
    const keysToUnsub: string[] = [];

    for (const key of keys) {
      const upper = key.trim().toUpperCase();
      const count = this.subscriptionCounts.get(upper) || 0;
      if (count <= 1) {
        this.subscriptionCounts.delete(upper);
        keysToUnsub.push(upper);
      } else {
        this.subscriptionCounts.set(upper, count - 1);
      }
    }

    if (keysToUnsub.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', instrument_keys: keysToUnsub }));
    }
  }

  public getCachedTick(symbolOrKey: string): LiveMarketTick | undefined {
    const upper = symbolOrKey.trim().toUpperCase();
    return this.latestTicks.get(upper);
  }

  public addTickListener(listener: TickListener) {
    this.tickListeners.add(listener);
  }

  public removeTickListener(listener: TickListener) {
    this.tickListeners.delete(listener);
  }

  public addStatusListener(listener: StatusListener) {
    this.statusListeners.add(listener);
  }

  public removeStatusListener(listener: StatusListener) {
    this.statusListeners.delete(listener);
  }

  private notifyTickListeners(tick: LiveMarketTick) {
    for (const listener of this.tickListeners) {
      try {
        listener(tick);
      } catch (e) {}
    }
  }

  private notifyStatusListeners(status: MarketProviderStatus) {
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (e) {}
    }
  }

  // --- REST Helpers ---

  public async getLiveQuote(symbolOrKey: string): Promise<LiveMarketTick | null> {
    try {
      return await apiClient.get<LiveMarketTick>(`/market/quote/${encodeURIComponent(symbolOrKey)}`);
    } catch {
      return null;
    }
  }

  public async searchInstruments(query: string, limit = 15): Promise<any[]> {
    if (!query || query.trim().length === 0) return [];
    return apiClient.get<any[]>(`/market/instruments/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
  }

  public async getProviderStatus(): Promise<MarketProviderStatus> {
    return apiClient.get<MarketProviderStatus>('/market/provider-status');
  }
}

export const marketDataService = new MarketDataWebSocketService();
