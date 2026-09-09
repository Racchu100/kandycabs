'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  senderName: string;
  messageText: string;
  isRead: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
}

interface Props {
  bookingId: string;
  currentUserRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  otherPartyName: string;
}

export const PlatformChatBox: React.FC<Props> = ({
  bookingId,
  currentUserRole,
  otherPartyName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // 3-second realtime poll
    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem(
        currentUserRole === 'DRIVER' ? 'kc_driver_token' : 'kc_token'
      ) || 'mock_session_token';

      const res = await fetch(`/api/messaging?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setUnreadCount(data.unreadCount || 0);
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const token = localStorage.getItem(
      currentUserRole === 'DRIVER' ? 'kc_driver_token' : 'kc_token'
    ) || 'mock_session_token';

    setIsLoading(true);

    try {
      const res = await fetch('/api/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          messageText: inputMsg,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputMsg('');
      }
    } catch {
      // Offline retry state
      const failedMsg: ChatMessage = {
        id: `failed_${Date.now()}`,
        bookingId,
        senderId: 'self',
        senderRole: currentUserRole,
        senderName: 'You',
        messageText: inputMsg,
        isRead: false,
        status: 'FAILED',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, failedMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card padded style={{ background: '#fff', border: '1px solid var(--line)' }}>
      {/* Header & Status Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '10px', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 className="h4" style={{ margin: 0 }}>
              💬 Chat with {otherPartyName}
            </h4>
            {unreadCount > 0 && (
              <span className="pill red" style={{ fontSize: '11px', padding: '2px 6px' }}>
                {unreadCount} NEW
              </span>
            )}
          </div>
          <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
            🔒 Privacy Active: Direct Platform Relay. Raw phone numbers are auto-redacted.
          </p>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11.5px', fontWeight: 700, color: isConnected ? 'var(--green)' : '#991B1B' }}>
          {isConnected ? '🟢 Realtime Connected' : '🔴 Reconnecting...'}
        </div>
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '6px' }}>
          ✏️ {otherPartyName} is typing...
        </div>
      )}

      {/* Messages Stream */}
      <div
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
          marginBottom: '12px',
        }}
      >
        {messages.map((m) => {
          const isSelf = m.senderRole === currentUserRole;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                background: isSelf ? 'var(--accent-soft)' : 'var(--bg-soft)',
                color: isSelf ? 'var(--accent)' : 'var(--ink)',
                padding: '8px 12px',
                borderRadius: 'var(--r-m)',
                maxWidth: '85%',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, opacity: 0.8, gap: '10px' }}>
                <span>{m.senderName}</span>
                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ marginTop: '4px', wordBreak: 'break-word' }}>{m.messageText}</div>

              {m.status === 'FAILED' && (
                <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '4px', fontWeight: 700 }}>
                  ⚠️ Delivery failed. Tap to retry.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Replies */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px' }}>
        {[
          'I am waiting at pickup location.',
          'Arriving in 5 minutes.',
          'Please confirm vehicle model & color.',
        ].map((qr, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInputMsg(qr)}
            style={{
              background: 'var(--bg-soft)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '11.5px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {qr}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Type a secure message..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
        />
        <Button type="submit" variant="accent" disabled={isLoading} style={{ padding: '8px 16px', fontSize: '13px' }}>
          {isLoading ? 'Sending...' : 'Send 📩'}
        </Button>
      </form>
    </Card>
  );
};
