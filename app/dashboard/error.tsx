"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-stone-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
          <svg
            className="w-7 h-7 text-rose-600 dark:text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-1">
          Something went wrong
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
          The dashboard couldn&apos;t load. This can happen if the connection to the server failed or your session expired.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90 transition"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-surface-border dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
          >
            Reload dashboard
          </Link>
          <Link
            href="/login"
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-accent hover:text-accent-hover transition"
          >
            Sign in again
          </Link>
        </div>
      </div>
    </div>
  );
}
