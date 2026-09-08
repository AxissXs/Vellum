export default function AgentDocsPage() {
  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Connecting AI Agents to Vellum</h1>
        <p className="text-text-dim mb-8">
          Guide for connecting AI coding assistants, custom agents, and automation tools to Vellum via API tokens.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Create an API Token</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
              <li>Log in to Vellum and go to <strong>Settings</strong></li>
              <li>Scroll to the <strong>API Tokens</strong> section</li>
              <li>Enter a name (e.g., &quot;Cursor Agent&quot;, &quot;GitHub Actions&quot;)</li>
              <li>Optionally set an expiry (30d, 90d, 1y, or never)</li>
              <li>Click <strong>Create Token</strong></li>
              <li><strong>Copy the token immediately</strong> — it won&apos;t be shown again</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Authenticate</h2>
            <p className="text-sm text-text-secondary mb-3">
              Include the token in the <code className="bg-overlay-10 px-1 rounded">Authorization</code> header:
            </p>
            <pre className="bg-surface-strong/50 border border-border-subtle rounded p-4 text-sm font-mono text-text-muted">
{`curl -H "Authorization: Bearer vellum_your_token_here" \\
     https://your-vellum-instance.com/api/agent/tasks`}
            </pre>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Available Agent Endpoints</h2>
            <div className="space-y-3">
              <EndpointCard
                method="GET"
                path="/api/agent/tasks"
                description="List tasks visible to your account (project visibility enforced)"
                params="Query: projectId, status, assigneeId (all optional)"
              />
              <EndpointCard
                method="GET"
                path="/api/agent/tasks/search?q=..."
                description="Search tasks by title or description (project visibility enforced)"
                params="Query: q (required, min 2 chars), projectId, status, limit (max 50)"
              />
              <EndpointCard
                method="POST"
                path="/api/agent/tasks/:id/claim"
                description="Claim a task — assigns it to you and sets status to In Progress"
              />
              <EndpointCard
                method="POST"
                path="/api/agent/tasks/:id/status"
                description="Move a task to a different status"
                body={'{ "status": "review" }'}
              />
              <EndpointCard
                method="POST"
                path="/api/agent/tasks/:id/comment"
                description="Add a progress comment to a task"
                body={'{ "content": "Fixed the bug, all tests passing" }'}
              />
              <EndpointCard
                method="GET"
                path="/api/agent/projects"
                description="List projects you have access to (visibility enforced)"
              />
              <EndpointCard
                method="GET"
                path="/api/agent/projects/search?q=..."
                description="Search projects by name or description (visibility enforced)"
                params="Query: q (required, min 2 chars), limit (max 50)"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Workflow Examples</h2>

            <div className="space-y-4">
              <WorkflowExample
                title="Pick up a task and start working"
                steps={[
                  "GET /api/agent/tasks?status=todo — find available tasks",
                  "POST /api/agent/tasks/:id/claim — claim one",
                  "Start working on the task locally",
                  "POST /api/agent/tasks/:id/comment — report progress",
                  "POST /api/agent/tasks/:id/status — move to review when done",
                ]}
              />

              <WorkflowExample
                title="Search for specific work"
                steps={[
                  "GET /api/agent/tasks/search?q=auth — find tasks related to auth",
                  "GET /api/agent/projects/search?q=backend — find backend projects",
                  "GET /api/agent/tasks?projectId=X&status=todo — list todos in a project",
                ]}
              />

              <WorkflowExample
                title="Check what needs to be done"
                steps={[
                  "GET /api/agent/projects — list your projects",
                  "GET /api/agent/tasks?projectId=X&status=todo — find todo tasks in a project",
                  "GET /api/agent/tasks?projectId=X&status=in_progress — check what's in progress",
                ]}
              />

              <WorkflowExample
                title="Update multiple tasks after a batch operation"
                steps={[
                  "POST /api/agent/tasks/:id1/status — move task 1 to done",
                  "POST /api/agent/tasks/:id2/status — move task 2 to done",
                  "POST /api/agent/tasks/:id3/comment — add summary comment",
                ]}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Agent Configuration</h2>

            <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-medium text-text-primary mb-2">opencode</h3>
                <p className="text-sm text-text-dim mb-2">Add to your project&apos;s <code className="bg-overlay-10 px-1 rounded">opencode.jsonc</code>:</p>
                <pre className="bg-surface-strong/50 border border-border-subtle rounded p-3 text-sm font-mono text-text-muted">
{`{
  "mcp": {
    "vellum": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@vellum/mcp-server"],
      "env": {
        "VELLUM_API_TOKEN": "vellum_your_token_here",
        "VELLUM_BASE_URL": "https://your-instance.com"
      },
      "enabled": true
    }
  }
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium text-text-primary mb-2">Cursor</h3>
                <p className="text-sm text-text-dim mb-2">Add to <code className="bg-overlay-10 px-1 rounded">~/.cursor/mcp.json</code>:</p>
                <pre className="bg-surface-strong/50 border border-border-subtle rounded p-3 text-sm font-mono text-text-muted">
{`{
  "mcpServers": {
    "vellum": {
      "command": "npx",
      "args": ["-y", "@vellum/mcp-server"],
      "env": {
        "VELLUM_API_TOKEN": "vellum_your_token_here"
      }
    }
  }
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium text-text-primary mb-2">Custom Scripts</h3>
                <pre className="bg-surface-strong/50 border border-border-subtle rounded p-3 text-sm font-mono text-text-muted">
{`# List tasks assigned to you
curl -H "Authorization: Bearer vellum_your_token" \\
     http://localhost:3000/api/agent/tasks

# Claim a task
curl -X POST -H "Authorization: Bearer vellum_your_token" \\
     http://localhost:3000/api/agent/tasks/TASK_ID/claim

# Update status
curl -X POST -H "Authorization: Bearer vellum_your_token" \\
     -H "Content-Type: application/json" \\
     -d '{ "status": "review" }' \\
     http://localhost:3000/api/agent/tasks/TASK_ID/status`}
                </pre>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Error Handling</h2>
            <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4 space-y-2">
              <ErrorRow code="401" message="Unauthorized — invalid or missing token" />
              <ErrorRow code="403" message="Forbidden — your role doesn&apos;t have permission" />
              <ErrorRow code="404" message="Not found — task or project doesn&apos;t exist" />
              <ErrorRow code="400" message="Bad request — missing or invalid parameters" />
              <ErrorRow code="429" message="Rate limited — slow down (coming soon)" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Activity Attribution</h2>
            <p className="text-sm text-text-secondary">
              All actions performed via API tokens are logged with <code className="bg-overlay-10 px-1 rounded">actorType: &quot;agent&quot;</code> in the activity log.
              Actions via browser sessions show <code className="bg-overlay-10 px-1 rounded">actorType: &quot;user&quot;</code>.
              You can see this in the superadmin audit log — agent actions are clearly distinguished from human actions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function EndpointCard({ method, path, description, params, body }: {
  method: string;
  path: string;
  description: string;
  params?: string;
  body?: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    POST: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };

  return (
    <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-text-primary">{path}</code>
      </div>
      <p className="text-sm text-text-secondary mb-2">{description}</p>
      {params && <p className="text-xs text-text-dim">{params}</p>}
      {body && (
        <pre className="bg-surface-strong/50 border border-border-subtle rounded p-2 mt-2 text-xs font-mono text-text-muted">{body}</pre>
      )}
    </div>
  );
}

function WorkflowExample({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="bg-surface-card/50 border border-border-subtle rounded-lg p-4">
      <h3 className="font-medium text-text-primary mb-2">{title}</h3>
      <ol className="list-decimal list-inside space-y-1">
        {steps.map((step, i) => (
          <li key={i} className="text-sm text-text-secondary font-mono">{step}</li>
        ))}
      </ol>
    </div>
  );
}

function ErrorRow({ code, message }: { code: string; message: string }) {
  return (
    <div className="flex items-center gap-3">
      <code className="text-sm font-mono text-red-400 w-8">{code}</code>
      <span className="text-sm text-text-dim">{message}</span>
    </div>
  );
}
