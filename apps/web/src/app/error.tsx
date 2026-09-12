'use client';

import React from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-kandy-bg p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-card border border-kandy-border shadow-card">
        <h2 className="text-3xl font-black text-red-500 mb-2">Error</h2>
        <h3 className="text-lg font-bold text-kandy-ink mb-2">Something Went Wrong</h3>
        <p className="text-xs text-kandy-muted mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-kandy-ink text-white font-bold text-xs uppercase rounded"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-kandy-orange text-white font-bold text-xs uppercase rounded"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
