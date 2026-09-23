import { customerApiClient } from './api';

export type CustomerEventType = 'DRIVER_LOCATION' | 'BOOKING_STATUS' | 'PAYMENT_RECEIVED' | 'connected';

type EventListener = (data: any) => void;

class CustomerRealtimeTracker {
  private xhr: XMLHttpRequest | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private reconnectTimer: any = null;
  private isConnected = false;
  private currentBookingId: string | null = null;
  private processedIndex = 0;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 15000;

  public on(event: CustomerEventType, listener: EventListener) {
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
          console.error(`Error in customer realtime listener for ${event}:`, e);
        }
      });
    }
  }

  public trackBooking(bookingId: string) {
    if (this.currentBookingId === bookingId && this.isConnected) {
      return;
    }
    this.stop();
    this.currentBookingId = bookingId;
    this.connect();
  }

  public stop() {
    this.currentBookingId = null;
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
    if (!this.currentBookingId) return;

    const baseUrl = customerApiClient.getBaseUrl();
    const url = `${baseUrl}/api/customer/events?bookingId=${this.currentBookingId}`;

    try {
      const xhr = new XMLHttpRequest();
      this.xhr = xhr;
      this.processedIndex = 0;

      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('Cache-Control', 'no-cache');

      xhr.onreadystatechange = () => {
        if (!this.currentBookingId) return;

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
          if (this.currentBookingId) {
            this.scheduleReconnect();
          }
        }
      };

      xhr.onerror = () => {
        this.isConnected = false;
        if (this.currentBookingId) {
          this.scheduleReconnect();
        }
      };

      xhr.send();
    } catch (err) {
      console.warn('Customer SSE connection error:', err);
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
          // Heartbeat ping
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
            this.reconnectDelay = 2000;
          }
          this.emitLocal(eventType, parsed);
        } catch {
          this.emitLocal(eventType, dataStr);
        }
      }
    }
  }

  private scheduleReconnect() {
    if (!this.currentBookingId || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }
}

export const customerRealtimeTracker = new CustomerRealtimeTracker();
