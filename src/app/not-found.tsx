import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-accent-500">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-50">
          Page not found
        </h1>
        <p className="mt-2 text-gray-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
