import React from 'react';
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
      <div className="max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-xl">
        <h1 className="text-4xl font-black text-orange-600 mb-2">404</h1>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">
          The requested page or route could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded shadow hover:bg-orange-600 transition"
        >
          Return to Home Page
        </Link>
      </div>
    </div>
  );
}
