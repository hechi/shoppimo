# Connect Shoppimo via MCP

Shoppimo exposes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server so AI assistants can create, manage, and populate your shopping lists directly.

**Server URL:** `https://api.shoppimo.de/mcp`

No API key or authentication required — just connect and go.

---

## What You Get

Once connected, your AI assistant can:

- Create and manage shopping lists
- Add items (single or batch)
- Check off and remove items
- Look up lists by alias (e.g. "groceries")
- Use prompt templates like **suggest-meals** (meal planning with auto-generated shopping list) and **weekly-groceries** (populate weekly staples)

Lists are shareable via `https://shoppimo.de/list/{id}` — no account needed.

---

## Setup by Client

### Claude Code

```bash
claude mcp add --transport http shoppimo https://api.shoppimo.de/mcp
```

Done. Start a session and ask Claude to manage your shopping list.

---

### Claude Desktop

**Option A: Custom Connector (recommended)**

1. Open **Settings** → **Connectors** → **Add Custom Connector**
2. Name: `Shoppimo`
3. URL: `https://api.shoppimo.de/mcp`
4. Save

**Option B: Config file with mcp-remote bridge**

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "shoppimo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.shoppimo.de/mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

---

### Cursor

Add to your `.cursor/mcp.json` or global MCP settings:

```json
{
  "mcpServers": {
    "shoppimo": {
      "url": "https://api.shoppimo.de/mcp",
      "type": "http"
    }
  }
}
```

---

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "shoppimo": {
      "url": "https://api.shoppimo.de/mcp",
      "type": "http"
    }
  }
}
```

---

### Windsurf

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "shoppimo": {
      "url": "https://api.shoppimo.de/mcp",
      "type": "http"
    }
  }
}
```

---

### Kiro

Add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "shoppimo": {
      "url": "https://api.shoppimo.de/mcp"
    }
  }
}
```

---

### ChatGPT Desktop

1. Open **Settings** → **MCP Servers** → **Add Server**
2. Paste URL: `https://api.shoppimo.de/mcp`
3. Save

---

### Generic MCP Client (JSON config)

```json
{
  "mcpServers": {
    "shoppimo": {
      "url": "https://api.shoppimo.de/mcp",
      "type": "http"
    }
  }
}
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `create_list` | Create a new shopping list |
| `get_list` | Get a list with all items by UUID |
| `get_list_by_alias` | Look up a list by alias (e.g. "groceries") |
| `set_alias` | Set a human-friendly alias for a list |
| `add_item` | Add a single item |
| `add_items` | Add multiple items in batch (up to 50) |
| `remove_item` | Remove an item |
| `check_item` | Mark item as completed |
| `uncheck_item` | Mark item as not completed |
| `clear_completed` | Remove all checked items |
| `delete_list` | Permanently delete a list |

## Available Prompts

| Prompt | Description |
|--------|-------------|
| `weekly-groceries` | Populate a list with typical weekly staples, scaled to household size |
| `suggest-meals` | Suggest meals for the week and add ingredients (excludes pantry basics) |

## Resources

| URI Pattern | Description |
|-------------|-------------|
| `shoppimo://list/{listId}` | Read-only access to a shopping list and its items |

---

## Verify It Works

After connecting, ask your AI assistant:

> "Create a new shopping list called 'groceries' and add milk, eggs, and bread"

If it works, you're all set.

---

## Troubleshooting

**"Server does not support server/discover"** — This is normal. The inspector or client tried the newer 2026-07-28 protocol; Shoppimo falls back to the standard handshake automatically.

**Connection refused** — Make sure you're using `https://api.shoppimo.de/mcp` (not `/mcp/` with trailing slash).

**Claude Desktop won't connect** — Claude Desktop's native config only supports stdio. Use the Custom Connector UI or the `mcp-remote` bridge (see above).

---

## Links

- App: [shoppimo.de](https://shoppimo.de)
- MCP endpoint: `https://api.shoppimo.de/mcp`
- Source: [github.com/hechi/shoppimo](https://github.com/hechi/shoppimo)
