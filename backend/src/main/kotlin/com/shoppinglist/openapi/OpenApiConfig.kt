package com.shoppinglist.openapi

import io.ktor.http.ContentType
import io.ktor.openapi.OpenApiDoc
import io.ktor.openapi.OpenApiInfo
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.openapi.hide
import io.ktor.server.routing.openapi.plus
import io.ktor.server.plugins.swagger.swaggerUI
import io.ktor.server.routing.Route
import io.ktor.server.routing.openapi.OpenApiDocSource
import io.ktor.server.routing.routingRoot

const val API_TITLE = "Shoppimo API"
const val API_VERSION = "5.0.0"

/**
 * Markdown description shown at the top of the API documentation.
 * OpenAPI cannot describe WebSockets, so the real-time protocol is documented here.
 */
val API_DESCRIPTION = """
Real-time collaborative shopping lists. There are no accounts. A list is addressed by its UUID (or an optional alias).

## Real-time updates (WebSocket)

OpenAPI cannot model WebSockets, so the protocol is described here.

**Endpoint:** `GET /ws/{listId}` (upgrade to WebSocket). Use `ws://` or `wss://`. `{listId}` is the list UUID.
The path is not under `/api`.

**Direction:** server to client only. The server pushes one JSON text frame per change that was made through
the REST API. Frames sent by a client are not interpreted. The server answers them with a text frame
`Received: <your text>`, which is not JSON and should be ignored.

**Connection:** The server validates the UUID and checks that the list exists. If either check fails, it sends an
`ERROR` message and closes the connection with close code 1003 (`CANNOT_ACCEPT`). The server sends a ping
every 15 seconds.

**Message envelope** (all messages):

| Field | Type | Description |
|---|---|---|
| `type` | string | One of the message types below |
| `listId` | string | UUID of the list the message belongs to |
| `data` | object | Payload, depends on `type` |
| `timestamp` | string | ISO-8601 instant, set by the server |

**Message types:**

| `type` | Sent when | `data` |
|---|---|---|
| `CONNECTION_ESTABLISHED` | Right after a successful connect, to the new client only | `{ "status": "connected" }` |
| `ITEM_ADDED` | `POST /api/lists/{id}/items` | A `ListItem` |
| `ITEM_UPDATED` | `PUT /api/lists/{id}/items/{itemId}` | A `ListItem` |
| `ITEM_DELETED` | `DELETE /api/lists/{id}/items/{itemId}` | `{ "id": "<item uuid>" }` |
| `ITEMS_CLEARED` | `POST /api/lists/{id}/clear-completed` | `{ "deletedCount": <number> }` |
| `ERROR` | Invalid list ID or unknown list, to the connecting client only | `{ "error": "<message>" }` |
| `LIST_UPDATED` | Reserved. The server does not send it yet | not defined |

**Example:**

```json
{
  "type": "ITEM_ADDED",
  "listId": "3f2b8c1e-5a0d-4c2e-9d57-0b1f6f3a7e11",
  "data": {
    "id": "a1b2c3d4-0000-4000-8000-000000000001",
    "text": "Milk",
    "completed": false,
    "createdAt": "2026-01-01T10:00:00Z",
    "order": 0
  },
  "timestamp": "2026-01-01T10:00:00.123Z"
}
```

## Other interfaces

* **MCP (Model Context Protocol):** exposed at `/mcp` (Streamable HTTP transport). See `MCP_INSTALL.md`.
* **Web Push:** see the `Push` endpoints.
""".trimIndent()

/**
 * Serves the generated OpenAPI document and Swagger UI.
 *
 * - `{path}`: Swagger UI (loads its JS/CSS from unpkg.com, so the browser needs internet access)
 * - `{path}/documentation.yaml`: OpenAPI document as YAML (used by Swagger UI)
 * - `/openapi.json`: OpenAPI document as JSON, relative to the route this is installed on
 *
 * Mounted below `/api` so that the frontend proxy forwards it without extra configuration.
 * The document is assembled at request time from the routing tree and its `describe` annotations.
 */
fun Route.openApiDocs(path: String = "/docs") {
    get("/openapi.json") {
        val doc = OpenApiDoc(info = OpenApiInfo(API_TITLE, API_VERSION, API_DESCRIPTION)) +
            call.application.routingRoot.descendants()
        call.respond(doc)
    }.hide()
    swaggerUI(path) {
        info = OpenApiInfo(API_TITLE, API_VERSION, API_DESCRIPTION)
        source = OpenApiDocSource.Routing(ContentType.Application.Json) {
            routingRoot.descendants()
        }
    }
}
