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
      <body className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-black text-orange-500 mb-4">Error</h1>
        <h2 className="text-2xl font-bold mb-2">Application Error</h2>
        <p className="text-slate-400 max-w-md mb-8 text-sm">
          A critical error occurred. Please refresh or try again.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition text-sm"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
