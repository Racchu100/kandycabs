import React from 'react';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  lede,
  action,
  className = '',
}) => {
  return (
    <div
      className={`sec-hd ${
        action ? 'flex-action' : ''
      } ${className}`.trim()}
      style={
        action
          ? {
              display: 'flex',
              alignItems: 'flex-end',
              gap: '16px',
              flexWrap: 'wrap',
            }
          : undefined
      }
    >
      <div>
        <p className="eb">{eyebrow}</p>
        <h2 className="h2">{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  );
};
