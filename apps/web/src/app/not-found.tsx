import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-kandy-bg p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-card border border-kandy-border shadow-card">
        <h2 className="text-3xl font-black text-kandy-orange mb-2">404</h2>
        <h3 className="text-lg font-bold text-kandy-ink mb-2">Page Not Found</h3>
        <p className="text-xs text-kandy-muted mb-6">
          The page or cab booking route you requested does not exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-kandy-orange text-white font-bold text-xs uppercase tracking-wider rounded shadow"
        >
          Return to Home Page
        </Link>
      </div>
    </div>
  );
}
