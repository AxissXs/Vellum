export function generateOpenAPISpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Vellum API",
      description: "API for Vellum project management. Supports session cookie and Bearer token authentication.",
      version: "1.0.0",
    },
    servers: [
      { url: "/api", description: "Vellum API" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "tf_session",
          description: "Session cookie from browser login",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API token: vellum_<hex>",
        },
      },
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            projectId: { type: "string", format: "uuid" },
            assigneeId: { type: "string", format: "uuid", nullable: true },
            creatorId: { type: "string", format: "uuid" },
            dueDate: { type: "string", format: "date-time", nullable: true },
            position: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            assigneeName: { type: "string", nullable: true },
            assigneeAvatar: { type: "string", nullable: true },
            projectName: { type: "string", nullable: true },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            status: { type: "string" },
            taskCount: { type: "integer" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            content: { type: "string" },
            taskId: { type: "string", format: "uuid" },
            authorId: { type: "string", format: "uuid" },
            parentId: { type: "string", format: "uuid", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            authorName: { type: "string", nullable: true },
            authorAvatar: { type: "string", nullable: true },
          },
        },
        ApiToken: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            prefix: { type: "string" },
            lastUsedAt: { type: "string", format: "date-time", nullable: true },
            expiresAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/tasks": {
        get: {
          summary: "List tasks",
          tags: ["Tasks"],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { name: "projectId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] } },
            { name: "assigneeId", in: "query", schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "List of tasks",
              content: { "application/json": { schema: { type: "object", properties: { tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } } } } } },
            },
          },
        },
        post: {
          summary: "Create a task",
          tags: ["Tasks"],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "projectId"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    projectId: { type: "string", format: "uuid" },
                    status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    assigneeId: { type: "string", format: "uuid" },
                    dueDate: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Task created", content: { "application/json": { schema: { type: "object", properties: { task: { $ref: "#/components/schemas/Task" } } } } } },
          },
        },
      },
      "/tasks/{id}": {
        patch: {
          summary: "Update a task",
          tags: ["Tasks"],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    assigneeId: { type: "string", format: "uuid" },
                    dueDate: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Task updated", content: { "application/json": { schema: { type: "object", properties: { task: { $ref: "#/components/schemas/Task" } } } } } },
          },
        },
        delete: {
          summary: "Delete a task (soft delete)",
          tags: ["Tasks"],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Task deleted" },
          },
        },
      },
      "/agent/tasks": {
        get: {
          summary: "List tasks (agent-optimized)",
          tags: ["Agent"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "projectId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] } },
            { name: "assigneeId", in: "query", schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "List of tasks with project info",
              content: { "application/json": { schema: { type: "object", properties: { tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } } } } } },
            },
          },
        },
      },
      "/agent/tasks/{id}/claim": {
        post: {
          summary: "Claim a task (assign to self + in_progress)",
          tags: ["Agent"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Task claimed", content: { "application/json": { schema: { type: "object", properties: { task: { $ref: "#/components/schemas/Task" } } } } } },
          },
        },
      },
      "/agent/tasks/{id}/status": {
        post: {
          summary: "Update task status",
          tags: ["Agent"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: { type: "string", enum: ["backlog", "todo", "in_progress", "review", "done"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Status updated", content: { "application/json": { schema: { type: "object", properties: { task: { $ref: "#/components/schemas/Task" } } } } } },
          },
        },
      },
      "/agent/tasks/{id}/comment": {
        post: {
          summary: "Add a comment to a task",
          tags: ["Agent"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["content"],
                  properties: {
                    content: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Comment added", content: { "application/json": { schema: { type: "object", properties: { comment: { $ref: "#/components/schemas/Comment" } } } } } },
          },
        },
      },
      "/agent/projects": {
        get: {
          summary: "List accessible projects",
          tags: ["Agent"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of projects",
              content: { "application/json": { schema: { type: "object", properties: { projects: { type: "array", items: { $ref: "#/components/schemas/Project" } } } } } },
            },
          },
        },
      },
      "/tokens": {
        get: {
          summary: "List your API tokens",
          tags: ["Tokens"],
          security: [{ cookieAuth: [] }],
          responses: {
            "200": {
              description: "List of tokens",
              content: { "application/json": { schema: { type: "object", properties: { tokens: { type: "array", items: { $ref: "#/components/schemas/ApiToken" } } } } } },
            },
          },
        },
        post: {
          summary: "Create a new API token",
          tags: ["Tokens"],
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    expiresInDays: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Token created (full token shown once)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string", description: "Full token - shown only once" },
                      tokenInfo: { $ref: "#/components/schemas/ApiToken" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/tokens/{id}": {
        delete: {
          summary: "Revoke an API token",
          tags: ["Tokens"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Token revoked" },
          },
        },
      },
    },
  };
}
