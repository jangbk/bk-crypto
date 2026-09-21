"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // 진단용. NEXT_PUBLIC_SENTRY_DSN 미설정이라 captureException 이 no-op 이고,
  // 이 화면 말고는 에러가 기록되는 곳이 없다. 원인 확정 후 제거한다.
  const detail = [
    error.message || "(no message)",
    error.digest ? `digest: ${error.digest}` : null,
    typeof navigator !== "undefined" ? `ua: ${navigator.userAgent}` : null,
    typeof location !== "undefined" ? `url: ${location.href}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const copyDetail = () => {
    navigator.clipboard?.writeText(detail).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

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
          <pre
            style={{
              maxWidth: "min(40rem, 90vw)",
              overflowX: "auto",
              margin: 0,
              padding: "0.75rem 1rem",
              textAlign: "left",
              fontSize: "0.75rem",
              lineHeight: 1.5,
              color: "#b91c1c",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {detail}
          </pre>
          <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={copyDetail}
            style={{
              borderRadius: "0.5rem",
              backgroundColor: "#fff",
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#333",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            {copied ? "복사됨" : "오류 내용 복사"}
          </button>
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
        </div>
      </body>
    </html>
  );
}
