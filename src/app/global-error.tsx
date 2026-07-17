"use client";

/**
 * Standalone global error UI. Must NOT import app layout, brand, CSS modules,
 * or providers — Next prerenders /_global-error outside the root layout.
 * Keep this file dependency-free so Deno Deploy webpack page-data collection
 * does not trip "i[a] is not a function" on shared chunks.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>
            {error.digest
              ? `Error reference: ${error.digest}`
              : "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: 8,
              background: "#0052cc",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
