import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <h1 className="text-9xl font-bold text-fuchsia-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white font-semibold rounded-lg hover:brightness-110 transition"
        >
          <Home className="w-4 h-4" />
          Go to Homepage
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
