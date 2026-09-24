import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-black text-amber-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Admin Page Not Found</h2>
      <p className="text-slate-400 max-w-md mb-8 text-sm">
        The administration page you requested does not exist.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
