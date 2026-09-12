'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-xl">
          <h2 className="text-3xl font-black text-red-500 mb-2">Application Error</h2>
          <p className="text-xs text-gray-500 mb-6">
            {error?.message || 'An unexpected application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded shadow hover:bg-orange-600 transition"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
