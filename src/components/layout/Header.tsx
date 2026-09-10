'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MobileNav } from './MobileNav';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';
import { getDriverByPhoneOrUsername } from '@/lib/driverAccountEngine';

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'booking', label: 'Book a cab', href: '/booking' },
  { id: 'fleet', label: 'Fleet', href: '/fleet' },
  { id: 'fare-chart', label: 'Fare chart', href: '/fare-chart' },
  { id: 'packages', label: 'Packages', href: '/packages' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'contact', label: 'Contact', href: '/contact' },
];

export const Header: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const toggleMobileNav = () => setMobileNavOpen((prev) => !prev);
  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const adminUser = localStorage.getItem('kc_admin_user');
        const custUser = localStorage.getItem('kc_user');
        const driverUser = localStorage.getItem('kc_driver_user');

        if (adminUser) {
          const parsed = JSON.parse(adminUser);
          setUser({ name: parsed.name || 'Super Admin (9481086058)', role: 'ADMIN' });
        } else if (driverUser) {
          const parsed = JSON.parse(driverUser);
          const matchedDriver = getDriverByPhoneOrUsername(parsed.id || parsed.phone || parsed.username || parsed.fullName);
          if (matchedDriver) {
            setUser({ name: matchedDriver.fullName || 'Driver', role: 'DRIVER' });
          } else {
            // Driver is deleted in Admin Panel! Remove stale session and do not show Driver Dashboard button
            localStorage.removeItem('kc_driver_user');
            localStorage.removeItem('kc_driver_token');
            setUser(null);
          }
        } else if (custUser) {
          const parsed = JSON.parse(custUser);
          const matchedDriver = parsed.phone ? getDriverByPhoneOrUsername(parsed.phone) : null;
          if (parsed.role === 'ADMIN' || parsed.phone === '9481086058' || (parsed.name && parsed.name.includes('9481086058'))) {
            setUser({ name: parsed.name || 'Super Admin (9481086058)', role: 'ADMIN' });
          } else if (matchedDriver) {
            setUser({ name: matchedDriver.fullName, role: 'DRIVER' });
          } else {
            const displayName = (parsed.fullName && parsed.fullName !== 'Customer Rider') ? parsed.fullName : 'My Account';
            setUser({ name: displayName, role: 'CUSTOMER' });
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('auth_change', checkAuth);
    window.addEventListener('driver_account_deleted', checkAuth);
    window.addEventListener('driver_account_updated', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth_change', checkAuth);
      window.removeEventListener('driver_account_deleted', checkAuth);
      window.removeEventListener('driver_account_updated', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('kc_token');
      localStorage.removeItem('kc_user');
      localStorage.removeItem('kc_admin_token');
      localStorage.removeItem('kc_admin_user');
      localStorage.removeItem('kc_driver_token');
      localStorage.removeItem('kc_driver_user');
      window.dispatchEvent(new Event('auth_change'));
    } catch {}
    setUser(null);
    router.push('/');
  };

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-in">
          <Link href="/" className="brand" onClick={closeMobileNav} aria-label="Kandy Cabs Home">
            <KandyCabsLogo width={180} height={52} variant="light" />
          </Link>

          <nav className="nav" id="nav">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={isActive ? 'on' : ''}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hdr-r">
            <a href="tel:9900887777" className="tel">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.2"
              >
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
              </svg>
              99008 87777
            </a>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.role === 'ADMIN' ? (
                  <>
                    <Link
                      href="/admin/dashboard"
                      className="btn btn-g"
                      style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, background: '#FEF3C7', color: '#92400E' }}
                    >
                      👑 Admin Dashboard
                    </Link>
                    <Link
                      href="/booking"
                      className="btn btn-a"
                      style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '8px', fontWeight: 600 }}
                    >
                      🚗 Book Cab
                    </Link>
                  </>
                ) : user.role === 'DRIVER' ? (
                  <>
                    <Link
                      href="/driver/dashboard"
                      className="btn btn-g"
                      style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, background: '#E0E7FF', color: '#3730A3' }}
                    >
                      🚗 Driver Dashboard
                    </Link>
                    <Link
                      href="/booking"
                      className="btn btn-a"
                      style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '8px', fontWeight: 600 }}
                    >
                      🚖 Book Cab
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/customer/dashboard"
                    className="btn btn-g"
                    style={{ fontSize: '13px', padding: '8px 14px', borderRadius: '8px', fontWeight: 600 }}
                  >
                    👤 {user.name}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn"
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn btn-a">
                Sign In / Login
              </Link>
            )}

            <button
              className={`burg ${mobileNavOpen ? 'on' : ''}`}
              onClick={toggleMobileNav}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileNavOpen}
        items={NAV_ITEMS}
        currentPath={pathname}
        onClose={closeMobileNav}
        user={user}
        onLogout={handleLogout}
      />
    </>
  );
};
