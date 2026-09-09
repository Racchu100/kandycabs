import React from 'react';
import Link from 'next/link';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';

interface FooterProps {
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-g">
          <div>
            <Link
              href="/"
              className="brand"
              style={{ marginBottom: '16px', display: 'inline-block' }}
              aria-label="Kandy Cabs Home"
            >
              <KandyCabsLogo width={190} height={54} variant="dark" />
            </Link>
            <p style={{ maxWidth: '34ch', lineHeight: '1.6' }}>
              Taxi and travel services across Mangaluru, Udupi and coastal
              Karnataka since 2012. All-India tourist permit.
            </p>
            <p
              style={{
                marginTop: '14px',
                fontSize: '12.5px',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              Inland Impala, Vidyaranyanagar, Ullala, Mangaluru — 575020
            </p>
          </div>

          <div>
            <h5>Services</h5>
            <ul>
              <li>
                <Link href="/booking?mode=oneway">One-way drop</Link>
              </li>
              <li>
                <Link href="/booking?mode=round">Round trip</Link>
              </li>
              <li>
                <Link href="/booking?mode=local">Local rental</Link>
              </li>
              <li>
                <Link href="/booking?mode=airport">Airport transfer</Link>
              </li>
              <li>
                <Link href="/packages">Holiday packages</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5>Top Routes</h5>
            <ul>
              <li>
                <Link href="/booking?route=udupi">Mangaluru to Udupi</Link>
              </li>
              <li>
                <Link href="/booking?route=manipal">Mangaluru to Manipal</Link>
              </li>
              <li>
                <Link href="/booking?route=dharmasthala">
                  Mangaluru to Dharmasthala
                </Link>
              </li>
              <li>
                <Link href="/booking?route=subramanya">
                  Mangaluru to Kukke Subramanya
                </Link>
              </li>
              <li>
                <Link href="/booking?route=coorg">Mangaluru to Madikeri / Coorg</Link>
              </li>
            </ul>
          </div>

          <div>
            <h5>Company & Legal</h5>
            <ul>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/fare-chart">Fare chart</Link>
              </li>
              <li>
                <Link href="/faq">FAQ</Link>
              </li>
              <li>
                <Link href="/privacy-policy">Privacy policy</Link>
              </li>
              <li>
                <Link href="/terms-and-conditions">Terms & conditions</Link>
              </li>
              {onOpenAdmin && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    style={{
                      color: 'var(--accent)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Admin desk
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="ft-b">
          <div>© {new Date().getFullYear()} Kandy Cabs Mangaluru. All rights reserved.</div>
          <div>All fares subject to GST and toll charges at actuals.</div>
        </div>
      </div>
    </footer>
  );
};
