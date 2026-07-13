import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unauthorized',
};

export default function UnauthorizedPage() {
  return (
    <div className="text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-error">403</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-50">
        Access Denied
      </h1>
      <p className="mt-2 text-gray-400">
        You don&apos;t have permission to access this page.
      </p>
      <div className="mt-6">
        <Link
          href="/login"
          className="inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
        >
          Return to login
        </Link>
      </div>
    </div>
  );
}
