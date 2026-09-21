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
      {/* 진단용. Sentry DSN 미설정이라 이 화면 외에 에러가 남는 곳이 없다. */}
      <pre className="max-w-[min(40rem,90vw)] overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-left text-xs leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error.message || "(no message)"}
        {error.digest ? `\ndigest: ${error.digest}` : ""}
      </pre>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        다시 시도
      </button>
    </div>
  );
}
