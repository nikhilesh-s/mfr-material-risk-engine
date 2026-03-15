# MCP (Model Context Protocol) — This project

Cursor can call MCP tools in this workspace. Use this command to see what’s available.

## Enabled server

| Server   | ID           | Purpose                          |
|----------|--------------|-----------------------------------|
| **Render** | `user-render` | Deploy and manage Render services |

## Render (`user-render`) — tools

**Workspace**
- `select_workspace` — Set the workspace for all actions (ask user before calling).
- `get_selected_workspace` — Return the currently selected workspace.
- `list_workspaces` — List workspaces in your Render account.

**Services**
- `list_services` — List all services (optionally include previews).
- `get_service` — Get a service by ID.
- `get_deploy` / `list_deploys` — Inspect deploys.
- `list_logs` / `list_log_label_values` — View logs.
- `get_metrics` — Get service metrics.

**Web & static**
- `create_web_service` — Create a web service (name, runtime, buildCommand, startCommand, repo, branch, envVars, plan, region, autoDeploy).
- `update_web_service` — Update an existing web service.
- `create_static_site` / `update_static_site` — Create or update static sites.

**Cron**
- `create_cron_job` / `update_cron_job` — Create or update cron jobs.

**Config**
- `update_environment_variables` — Update env vars for a service.

**Postgres**
- `list_postgres_instances` — List Postgres instances.
- `get_postgres` — Get a Postgres instance.
- `create_postgres` — Create a Postgres instance.
- `query_render_postgres` — Run a **read-only** SQL query (postgresId, sql).

**Key-value**
- `list_key_value` / `get_key_value` / `create_key_value` — List, get, or create key-value stores.

---

Tool schemas (parameters, required fields):  
`mcps/user-render/tools/<tool-name>.json`

To use a tool, the agent must read the schema first, then call `call_mcp_tool` with `server: "user-render"`, `toolName`, and the correct `arguments`.
