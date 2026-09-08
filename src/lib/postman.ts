export function generatePostmanCollection() {
  const baseUrl = "{{baseUrl}}";

  return {
    info: {
      name: "Vellum API",
      description: "API for Vellum project management",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: {
      type: "bearer",
      bearer: [
        { key: "token", value: "{{apiToken}}", type: "string" },
      ],
    },
    variable: [
      { key: "baseUrl", value: "http://localhost:3000/api" },
      { key: "apiToken", value: "vellum_your_token_here" },
    ],
    item: [
      {
        name: "Tasks",
        item: [
          {
            name: "List Tasks",
            request: {
              method: "GET",
              url: { raw: `${baseUrl}/tasks?projectId={{projectId}}`, host: [baseUrl], path: ["tasks"], query: [{ key: "projectId", value: "{{projectId}}" }] },
            },
          },
          {
            name: "Create Task",
            request: {
              method: "POST",
              url: { raw: `${baseUrl}/tasks`, host: [baseUrl], path: ["tasks"] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ title: "New task", projectId: "{{projectId}}", priority: "medium" }, null, 2),
              },
            },
          },
          {
            name: "Update Task",
            request: {
              method: "PATCH",
              url: { raw: `${baseUrl}/tasks/{{taskId}}`, host: [baseUrl], path: ["tasks", "{{taskId}}"] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ status: "in_progress" }, null, 2),
              },
            },
          },
          {
            name: "Delete Task",
            request: {
              method: "DELETE",
              url: { raw: `${baseUrl}/tasks/{{taskId}}`, host: [baseUrl], path: ["tasks", "{{taskId}}"] },
            },
          },
        ],
      },
      {
        name: "Agent",
        item: [
          {
            name: "List Tasks",
            request: {
              method: "GET",
              url: { raw: `${baseUrl}/agent/tasks`, host: [baseUrl], path: ["agent", "tasks"] },
            },
          },
          {
            name: "Claim Task",
            request: {
              method: "POST",
              url: { raw: `${baseUrl}/agent/tasks/{{taskId}}/claim`, host: [baseUrl], path: ["agent", "tasks", "{{taskId}}", "claim"] },
            },
          },
          {
            name: "Update Status",
            request: {
              method: "POST",
              url: { raw: `${baseUrl}/agent/tasks/{{taskId}}/status`, host: [baseUrl], path: ["agent", "tasks", "{{taskId}}", "status"] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ status: "review" }, null, 2),
              },
            },
          },
          {
            name: "Add Comment",
            request: {
              method: "POST",
              url: { raw: `${baseUrl}/agent/tasks/{{taskId}}/comment`, host: [baseUrl], path: ["agent", "tasks", "{{taskId}}", "comment"] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ content: "Progress update: working on this" }, null, 2),
              },
            },
          },
          {
            name: "List Projects",
            request: {
              method: "GET",
              url: { raw: `${baseUrl}/agent/projects`, host: [baseUrl], path: ["agent", "projects"] },
            },
          },
        ],
      },
      {
        name: "Tokens",
        item: [
          {
            name: "List Tokens",
            request: {
              method: "GET",
              url: { raw: `${baseUrl}/tokens`, host: [baseUrl], path: ["tokens"] },
            },
          },
          {
            name: "Create Token",
            request: {
              method: "POST",
              url: { raw: `${baseUrl}/tokens`, host: [baseUrl], path: ["tokens"] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ name: "My Integration", expiresInDays: 90 }, null, 2),
              },
            },
          },
          {
            name: "Revoke Token",
            request: {
              method: "DELETE",
              url: { raw: `${baseUrl}/tokens/{{tokenId}}`, host: [baseUrl], path: ["tokens", "{{tokenId}}"] },
            },
          },
        ],
      },
    ],
  };
}
