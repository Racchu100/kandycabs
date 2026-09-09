'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Message {
  id: string;
  bookingId: string;
  senderRole: 'DRIVER' | 'CUSTOMER';
  senderName: string;
  messageText: string;
  createdAt: string;
}

interface Props {
  bookingId: string;
  customerName: string;
}

export const DriverCustomerMessaging: React.FC<Props> = ({ bookingId, customerName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [bookingId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messaging?bookingId=${bookingId}`, {
        headers: { Authorization: `Bearer mock_driver_token` },
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock_driver_token`,
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
    } catch {} finally {
      setIsLoading(false);
    }
  };

  return (
    <Card padded style={{ background: '#fff', marginTop: '16px' }}>
      <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '10px', marginBottom: '12px' }}>
        <h4 className="h4" style={{ margin: 0 }}>
          💬 In-App Platform Messaging — Rider: {customerName}
        </h4>
        <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
          🔒 Privacy Mode Active: Zero phone numbers exposed. Direct secure platform relay.
        </p>
      </div>

      {/* Messages Feed */}
      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
          marginBottom: '12px',
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.senderRole === 'DRIVER' ? 'flex-end' : 'flex-start',
              background: m.senderRole === 'DRIVER' ? 'var(--accent-soft)' : 'var(--bg-soft)',
              color: m.senderRole === 'DRIVER' ? 'var(--accent)' : 'var(--ink)',
              padding: '8px 12px',
              borderRadius: 'var(--r-m)',
              maxWidth: '85%',
              fontSize: '13px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8 }}>
              {m.senderName}
            </div>
            <div style={{ marginTop: '2px' }}>{m.messageText}</div>
          </div>
        ))}
      </div>

      {/* Quick Quick-Replies for Android Chauffeurs */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px' }}>
        {[
          'I have arrived at pickup location.',
          'Stuck in traffic, arriving in 10 mins.',
          'Please provide trip start OTP code.',
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

      {/* Send Form */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Type message to rider..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
        />
        <Button type="submit" variant="accent" disabled={isLoading} style={{ padding: '8px 16px', fontSize: '13px' }}>
          Send 📩
        </Button>
      </form>
    </Card>
  );
};
