package com.shoppinglist.mcp

import com.shoppinglist.repository.ListRepositoryImpl
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.types.ReadResourceResult
import io.modelcontextprotocol.kotlin.sdk.types.TextResourceContents
import kotlinx.serialization.json.*
import java.util.*

/**
 * Registers MCP resources that expose shopping list data to AI clients.
 * Resources provide read-only access to list state via URI-based addressing.
 */
object ShoppimoResources {

    private val listRepository = ListRepositoryImpl()

    fun register(server: Server) {
        registerListResource(server)
    }

    /**
     * Registers a resource template for accessing individual shopping lists.
     * URI pattern: shoppimo://lists/{listId}
     */
    private fun registerListResource(server: Server) {
        server.addResourceTemplate(
            uriTemplate = "shoppimo://lists/{listId}",
            name = "Shopping List",
            description = "Access a shopping list by its UUID. Returns the list metadata and all items.",
            mimeType = "application/json"
        ) { request, variables ->
            val listIdStr = variables["listId"] ?: request.uri.removePrefix("shoppimo://lists/")

            val listId = try {
                UUID.fromString(listIdStr)
            } catch (e: IllegalArgumentException) {
                return@addResourceTemplate ReadResourceResult(
                    contents = listOf(
                        TextResourceContents(
                            text = """{"error": "Invalid list ID format: $listIdStr"}""",
                            uri = request.uri,
                            mimeType = "application/json"
                        )
                    )
                )
            }

            val list = listRepository.getListWithExpiration(listId)
                ?: return@addResourceTemplate ReadResourceResult(
                    contents = listOf(
                        TextResourceContents(
                            text = """{"error": "Shopping list not found: $listIdStr"}""",
                            uri = request.uri,
                            mimeType = "application/json"
                        )
                    )
                )

            val jsonContent = buildJsonObject {
                put("id", list.id)
                put("alias", list.alias?.let { JsonPrimitive(it) } ?: JsonNull)
                put("createdAt", list.createdAt)
                put("lastModified", list.lastModified)
                put("expiresAt", list.expiresAt?.let { JsonPrimitive(it) } ?: JsonNull)
                put("totalItems", list.items.size)
                put("completedItems", list.items.count { it.completed })
                put("pendingItems", list.items.count { !it.completed })
                putJsonArray("items") {
                    list.items.forEach { item ->
                        addJsonObject {
                            put("id", item.id)
                            put("text", item.text)
                            put("completed", item.completed)
                            put("order", item.order)
                            put("createdAt", item.createdAt)
                        }
                    }
                }
            }

            ReadResourceResult(
                contents = listOf(
                    TextResourceContents(
                        text = Json.encodeToString(JsonObject.serializer(), jsonContent),
                        uri = request.uri,
                        mimeType = "application/json"
                    )
                )
            )
        }
    }
}
