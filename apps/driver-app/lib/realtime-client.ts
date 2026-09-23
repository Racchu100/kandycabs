import { driverApiClient } from './api';

export type DriverEventType = 'DISPATCH_NEW' | 'DISPATCH_REVOKED' | 'TRIP_STATUS' | 'PROFILE_UPDATED' | 'connected';

type EventListener = (data: any) => void;

class DriverRealtimeClient {
  private xhr: XMLHttpRequest | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private reconnectTimer: any = null;
  private isConnected = false;
  private isStopped = true;
  private processedIndex = 0;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 15000;

  public on(event: DriverEventType, listener: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  public emitLocal(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in driver realtime listener for ${event}:`, e);
        }
      });
    }
  }

  public start() {
    this.isStopped = false;
    this.connect();
  }

  public stop() {
    this.isStopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
    }
    this.isConnected = false;
    this.processedIndex = 0;
  }

  private connect() {
    if (this.isStopped) return;

    const token = driverApiClient.getToken();
    if (!token) {
      // Retry in 3 seconds if not authenticated yet
      this.scheduleReconnect(3000);
      return;
    }

    const baseUrl = driverApiClient.getBaseUrl();
    const url = `${baseUrl}/api/driver/events`;

    try {
      const xhr = new XMLHttpRequest();
      this.xhr = xhr;
      this.processedIndex = 0;

      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('Cache-Control', 'no-cache');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onreadystatechange = () => {
        if (this.isStopped) return;

        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const responseText = xhr.responseText || '';
          if (responseText.length > this.processedIndex) {
            const newChunk = responseText.substring(this.processedIndex);
            this.processedIndex = responseText.length;
            this.parseSSEChunk(newChunk);
          }
        }

        if (xhr.readyState === 4) {
          this.isConnected = false;
          if (!this.isStopped) {
            this.scheduleReconnect();
          }
        }
      };

      xhr.onerror = () => {
        this.isConnected = false;
        if (!this.isStopped) {
          this.scheduleReconnect();
        }
      };

      xhr.send();
    } catch (err) {
      console.warn('Driver SSE connection error:', err);
      this.scheduleReconnect();
    }
  }

  private parseSSEChunk(chunk: string) {
    const blocks = chunk.split('\n\n');
    for (const block of blocks) {
      const lines = block.split('\n');
      let eventType = 'message';
      let dataStr = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          // Heartbeat ping or comment
          continue;
        }

        if (trimmed.startsWith('event:')) {
          eventType = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('data:')) {
          dataStr = trimmed.substring(5).trim();
        }
      }

      if (eventType && dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'connected') {
            this.isConnected = true;
            this.reconnectDelay = 2000; // Reset backoff
          }
          this.emitLocal(eventType, parsed);
        } catch {
          this.emitLocal(eventType, dataStr);
        }
      }
    }
  }

  private scheduleReconnect(explicitDelay?: number) {
    if (this.isStopped || this.reconnectTimer) return;

    const delay = explicitDelay || this.reconnectDelay;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }
}

export const driverRealtimeClient = new DriverRealtimeClient();
