'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-black text-orange-500 mb-4">500</h1>
      <h2 className="text-2xl font-bold mb-2">Something Went Wrong</h2>
      <p className="text-slate-400 max-w-md mb-8 text-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition shadow-lg shadow-orange-600/20 text-sm"
      >
        Try Again
      </button>
    </div>
  );
}
