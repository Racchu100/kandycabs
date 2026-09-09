import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Card padded className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--line2)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px',
          color: 'var(--muted)',
        }}
      >
        🔍
      </div>
      <h3 className="h3" style={{ marginBottom: '8px' }}>
        {title}
      </h3>
      <p className="muted" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
};
