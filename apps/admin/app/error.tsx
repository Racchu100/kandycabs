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
    console.error('Admin Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-black text-amber-500 mb-4">500</h1>
      <h2 className="text-2xl font-bold mb-2">Admin Dashboard Error</h2>
      <p className="text-slate-400 max-w-md mb-8 text-sm">
        An error occurred while loading this admin view.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm"
      >
        Retry Action
      </button>
    </div>
  );
}
