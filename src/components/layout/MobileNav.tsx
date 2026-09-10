'use client';

import React from 'react';
import Link from 'next/link';
import { NavItem } from './Header';

interface MobileNavProps {
  isOpen: boolean;
  items: NavItem[];
  currentPath: string;
  onClose: () => void;
  user?: { name: string; role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' } | null;
  onLogout?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  items,
  currentPath,
  onClose,
  user,
  onLogout,
}) => {
  return (
    <nav className={`mnav ${isOpen ? 'on' : ''}`} aria-label="Mobile menu">
      {items.map((item) => {
        const isActive =
          item.href === '/'
            ? currentPath === '/'
            : currentPath.startsWith(item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={isActive ? 'on' : ''}
            onClick={onClose}
          >
            {item.label}
          </Link>
        );
      })}

      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {user ? (
          <>
            {user.role === 'ADMIN' ? (
              <>
                <Link
                  href="/admin"
                  onClick={onClose}
                  style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF3C7', fontSize: '15px', fontWeight: 700, color: '#92400E' }}
                >
                  👑 Admin Dashboard ({user.name})
                </Link>
                <Link
                  href="/booking"
                  onClick={onClose}
                  style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--accent)', fontSize: '15px', fontWeight: 700, color: '#fff' }}
                >
                  🚗 Book a Ride as Admin
                </Link>
              </>
            ) : user.role === 'DRIVER' ? (
              <>
                <Link
                  href="/driver/dashboard"
                  onClick={onClose}
                  style={{ padding: '12px 16px', borderRadius: '10px', background: '#E0E7FF', fontSize: '15px', fontWeight: 700, color: '#3730A3' }}
                >
                  🚗 Driver Portal ({user.name})
                </Link>
                <Link
                  href="/booking"
                  onClick={onClose}
                  style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--accent)', fontSize: '15px', fontWeight: 700, color: '#fff' }}
                >
                  🚖 Book a Cab as Driver
                </Link>
              </>
            ) : (
              <Link
                href="/customer/dashboard"
                onClick={onClose}
                style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-soft)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}
              >
                👤 My Account ({user.name})
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#991B1B',
                fontSize: '15px',
                fontWeight: 700,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            style={{
              padding: '13px 16px',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            Sign In / Login
          </Link>
        )}
      </div>
    </nav>
  );
};
