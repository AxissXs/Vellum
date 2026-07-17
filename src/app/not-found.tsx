/**
 * Standalone 404. Avoid next/link and other app imports — Deno Deploy webpack
 * page-data collection has hit "i[a] is not a function" when /_not-found
 * loads shared server chunks.
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#0f172a",
      }}
    >
      <h1 style={{ fontSize: 22, margin: 0 }}>Page not found</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
        The page you requested does not exist.
      </p>
      <a
        href="/dashboard"
        style={{ color: "#0052cc", fontSize: 14, fontWeight: 600 }}
      >
        Back to dashboard
      </a>
    </div>
  );
}
