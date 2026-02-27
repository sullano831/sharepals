"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
            We couldn&apos;t load this page. Try again or sign in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-900 dark:bg-white text-white dark:text-stone-900"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 dark:border-stone-700"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
