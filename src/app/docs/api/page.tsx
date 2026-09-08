export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Vellum API Reference</h1>
        <p className="text-text-dim mb-8">
          Complete reference for the Vellum REST API. All endpoints support session cookie authentication.
          Endpoints marked with [Token] also support Bearer token authentication.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Authentication</h2>
            <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4 space-y-3">
              <div>
                <h3 className="font-medium text-text-primary">Session Cookie</h3>
                <p className="text-sm text-text-dim">Login via <code className="bg-overlay-10 px-1 rounded">POST /api/auth/login</code> to receive a <code className="bg-overlay-10 px-1 rounded">tf_session</code> cookie. All subsequent requests are authenticated automatically.</p>
              </div>
              <div>
                <h3 className="font-medium text-text-primary">Bearer Token [Token]</h3>
                <p className="text-sm text-text-dim">Create a token in Settings → API Tokens. Include it in the <code className="bg-overlay-10 px-1 rounded">Authorization</code> header:</p>
                <pre className="bg-surface-strong/50 border border-border-subtle rounded p-3 mt-2 text-sm font-mono text-text-muted">
{`Authorization: Bearer vellum_a1b2c3d4e5f67890abcd`}
                </pre>
                <p className="text-sm text-text-dim mt-2">Tokens inherit your account permissions. They can be revoked at any time from Settings.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Tasks</h2>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/tasks" description="List tasks. Query: projectId, status, assigneeId" token />
              <Endpoint method="POST" path="/api/tasks" description="Create a task. Body: title (required), projectId (required), description, priority, status, assigneeId, dueDate" token />
              <Endpoint method="PATCH" path="/api/tasks/:id" description="Update a task. Body: title, description, status, priority, assigneeId, dueDate" token />
              <Endpoint method="DELETE" path="/api/tasks/:id" description="Soft-delete a task" token />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Agent Endpoints</h2>
            <p className="text-sm text-text-dim mb-3">Optimized for programmatic/agent use. Token auth required.</p>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/agent/tasks" description="List tasks with project info. Query: projectId, status, assigneeId" token />
              <Endpoint method="POST" path="/api/agent/tasks/:id/claim" description="Claim a task (assign to self + set in_progress)" token />
              <Endpoint method="POST" path="/api/agent/tasks/:id/status" description="Update task status. Body: status (required)" token />
              <Endpoint method="POST" path="/api/agent/tasks/:id/comment" description="Add a comment. Body: content (required)" token />
              <Endpoint method="GET" path="/api/agent/projects" description="List accessible projects with task counts" token />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Tokens</h2>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/tokens" description="List your API tokens" />
              <Endpoint method="POST" path="/api/tokens" description="Create a new token. Body: name (required), expiresInDays" />
              <Endpoint method="DELETE" path="/api/tokens/:id" description="Revoke a token" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Projects</h2>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/projects" description="List projects" />
              <Endpoint method="POST" path="/api/projects" description="Create a project" />
              <Endpoint method="PATCH" path="/api/projects/:id" description="Update a project" />
              <Endpoint method="DELETE" path="/api/projects/:id" description="Delete a project" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Comments</h2>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/comments?taskId=:id" description="List comments for a task" />
              <Endpoint method="POST" path="/api/comments" description="Add a comment. Body: content, taskId, parentId (optional)" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Machine-Readable Specs</h2>
            <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4 space-y-2">
              <p className="text-sm text-text-dim">
                <code className="bg-overlay-10 px-1 rounded">GET /api/docs</code> — OpenAPI 3.0 JSON spec
              </p>
              <p className="text-sm text-text-dim">
                <code className="bg-overlay-10 px-1 rounded">GET /api/docs/postman</code> — Postman Collection v2.1 JSON
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Error Responses</h2>
            <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4">
              <pre className="text-sm font-mono text-text-muted">
{`{ "error": "Unauthorized" }   // 401
{ "error": "Forbidden" }      // 403
{ "error": "Not found" }      // 404
{ "error": "Validation..." }  // 400`}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Endpoint({ method, path, description, token }: {
  method: string;
  path: string;
  description: string;
  token?: boolean;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    POST: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    PATCH: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  return (
    <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${methodColors[method] || ""}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-text-primary">{path}</code>
        {token && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-brand-500/15 text-brand-400 border-brand-500/20">
            Token
          </span>
        )}
      </div>
      <p className="text-sm text-text-dim ml-16">{description}</p>
    </div>
  );
}
