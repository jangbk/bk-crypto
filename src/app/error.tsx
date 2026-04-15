"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold">문제가 발생했습니다</h2>
      <p className="text-muted-foreground max-w-md">
        예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        다시 시도
      </button>
    </div>
  );
}
