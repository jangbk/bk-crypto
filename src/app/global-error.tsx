"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            심각한 오류가 발생했습니다
          </h2>
          <p style={{ color: "#666", maxWidth: "28rem" }}>
            애플리케이션에 문제가 발생했습니다. 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              borderRadius: "0.5rem",
              backgroundColor: "#0070f3",
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
