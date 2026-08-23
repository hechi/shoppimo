package com.shoppinglist.mcp

import com.shoppinglist.repository.ItemRepositoryImpl
import com.shoppinglist.repository.ListRepositoryImpl
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.modelcontextprotocol.kotlin.sdk.types.ToolSchema
import kotlinx.serialization.json.*
import java.util.*

/**
 * Registers all Shoppimo shopping list tools with the MCP server.
 * Tools allow AI assistants to create, read, and manage shopping lists.
 */
object ShoppimoTools {

    private val listRepository = ListRepositoryImpl()
    private val itemRepository = ItemRepositoryImpl()

    fun register(server: Server) {
        registerCreateList(server)
        registerGetList(server)
        registerAddItem(server)
        registerRemoveItem(server)
        registerCheckItem(server)
        registerUncheckItem(server)
        registerClearCompleted(server)
        registerDeleteList(server)
    }

    private fun registerCreateList(server: Server) {
        server.addTool(
            name = "create_list",
            description = "Create a new shopping list. Returns the list ID that can be shared via URL.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("id") {
                        put("type", "string")
                        put("description", "Optional UUID for the list. If not provided, a random UUID will be generated.")
                    }
                }
            )
        ) { request ->
            val args = request.arguments
            val id = args?.get("id")?.jsonPrimitive?.contentOrNull?.let {
                try {
                    UUID.fromString(it)
                } catch (e: IllegalArgumentException) {
                    return@addTool CallToolResult(
                        isError = true,
                        content = listOf(TextContent(text = "Invalid UUID format: $it"))
                    )
                }
            } ?: UUID.randomUUID()

            val list = listRepository.createList(id)
            CallToolResult(
                content = listOf(TextContent(text = buildJsonObject {
                    put("id", list.id)
                    put("createdAt", list.createdAt)
                    put("message", "Shopping list created successfully. Share URL: /list/${list.id}")
                }.toString()))
            )
        }
    }

    private fun registerGetList(server: Server) {
        server.addTool(
            name = "get_list",
            description = "Get a shopping list with all its items by list ID.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list to retrieve.")
                    }
                },
                required = listOf("list_id")
            )
        ) { request ->
            val listIdStr = request.arguments?.get("list_id")?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)

            val list = listRepository.getListWithExpiration(listId)
                ?: return@addTool errorResult("Shopping list not found: $listIdStr")

            CallToolResult(
                content = listOf(TextContent(text = buildJsonObject {
                    put("id", list.id)
                    put("alias", list.alias?.let { JsonPrimitive(it) } ?: JsonNull)
                    put("createdAt", list.createdAt)
                    put("lastModified", list.lastModified)
                    put("expiresAt", list.expiresAt?.let { JsonPrimitive(it) } ?: JsonNull)
                    put("itemCount", list.items.size)
                    putJsonArray("items") {
                        list.items.forEach { item ->
                            addJsonObject {
                                put("id", item.id)
                                put("text", item.text)
                                put("completed", item.completed)
                                put("order", item.order)
                            }
                        }
                    }
                }.toString()))
            )
        }
    }

    private fun registerAddItem(server: Server) {
        server.addTool(
            name = "add_item",
            description = "Add a new item to a shopping list.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                    putJsonObject("text") {
                        put("type", "string")
                        put("description", "The text/name of the item to add.")
                    }
                },
                required = listOf("list_id", "text")
            )
        ) { request ->
            val args = request.arguments ?: return@addTool errorResult("Arguments required")

            val listIdStr = args["list_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")
            val text = args["text"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("text is required")

            if (text.isBlank()) return@addTool errorResult("Item text cannot be empty")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)

            if (!listRepository.listExists(listId)) {
                return@addTool errorResult("Shopping list not found: $listIdStr")
            }

            val item = itemRepository.createItem(listId, text.trim())
            listRepository.updateListModified(listId)

            CallToolResult(
                content = listOf(TextContent(text = buildJsonObject {
                    put("id", item.id)
                    put("text", item.text)
                    put("completed", item.completed)
                    put("order", item.order)
                    put("message", "Item '${item.text}' added to list $listIdStr")
                }.toString()))
            )
        }
    }

    private fun registerRemoveItem(server: Server) {
        server.addTool(
            name = "remove_item",
            description = "Remove an item from a shopping list by item ID.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                    putJsonObject("item_id") {
                        put("type", "string")
                        put("description", "The UUID of the item to remove.")
                    }
                },
                required = listOf("list_id", "item_id")
            )
        ) { request ->
            val args = request.arguments ?: return@addTool errorResult("Arguments required")

            val listIdStr = args["list_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")
            val itemIdStr = args["item_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("item_id is required")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)
            val itemId = parseUuid(itemIdStr) ?: return@addTool uuidError(itemIdStr)

            if (!listRepository.listExists(listId)) {
                return@addTool errorResult("Shopping list not found: $listIdStr")
            }

            val deleted = itemRepository.deleteItem(itemId)
            if (!deleted) return@addTool errorResult("Item not found: $itemIdStr")

            listRepository.updateListModified(listId)

            CallToolResult(content = listOf(TextContent(text = "Item $itemIdStr removed from list $listIdStr")))
        }
    }

    private fun registerCheckItem(server: Server) {
        server.addTool(
            name = "check_item",
            description = "Mark a shopping list item as completed/checked.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                    putJsonObject("item_id") {
                        put("type", "string")
                        put("description", "The UUID of the item to check off.")
                    }
                },
                required = listOf("list_id", "item_id")
            )
        ) { request ->
            val args = request.arguments ?: return@addTool errorResult("Arguments required")

            val listIdStr = args["list_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")
            val itemIdStr = args["item_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("item_id is required")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)
            val itemId = parseUuid(itemIdStr) ?: return@addTool uuidError(itemIdStr)

            if (!listRepository.listExists(listId)) return@addTool errorResult("Shopping list not found: $listIdStr")

            val updated = itemRepository.updateItem(itemId, text = null, completed = true)
                ?: return@addTool errorResult("Item not found: $itemIdStr")

            listRepository.updateListModified(listId)

            CallToolResult(content = listOf(TextContent(text = "Item '${updated.text}' checked off in list $listIdStr")))
        }
    }

    private fun registerUncheckItem(server: Server) {
        server.addTool(
            name = "uncheck_item",
            description = "Mark a shopping list item as not completed/unchecked.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                    putJsonObject("item_id") {
                        put("type", "string")
                        put("description", "The UUID of the item to uncheck.")
                    }
                },
                required = listOf("list_id", "item_id")
            )
        ) { request ->
            val args = request.arguments ?: return@addTool errorResult("Arguments required")

            val listIdStr = args["list_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")
            val itemIdStr = args["item_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("item_id is required")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)
            val itemId = parseUuid(itemIdStr) ?: return@addTool uuidError(itemIdStr)

            if (!listRepository.listExists(listId)) return@addTool errorResult("Shopping list not found: $listIdStr")

            val updated = itemRepository.updateItem(itemId, text = null, completed = false)
                ?: return@addTool errorResult("Item not found: $itemIdStr")

            listRepository.updateListModified(listId)

            CallToolResult(content = listOf(TextContent(text = "Item '${updated.text}' unchecked in list $listIdStr")))
        }
    }

    private fun registerClearCompleted(server: Server) {
        server.addTool(
            name = "clear_completed",
            description = "Remove all completed/checked items from a shopping list.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                },
                required = listOf("list_id")
            )
        ) { request ->
            val listIdStr = request.arguments?.get("list_id")?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)

            if (!listRepository.listExists(listId)) return@addTool errorResult("Shopping list not found: $listIdStr")

            val deletedCount = itemRepository.clearCompletedItems(listId)
            listRepository.updateListModified(listId)

            CallToolResult(content = listOf(TextContent(text = "Cleared $deletedCount completed item(s) from list $listIdStr")))
        }
    }

    private fun registerDeleteList(server: Server) {
        server.addTool(
            name = "delete_list",
            description = "Permanently delete a shopping list and all its items.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list to delete.")
                    }
                },
                required = listOf("list_id")
            )
        ) { request ->
            val listIdStr = request.arguments?.get("list_id")?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)

            val deleted = listRepository.deleteList(listId)
            if (!deleted) return@addTool errorResult("Shopping list not found: $listIdStr")

            CallToolResult(content = listOf(TextContent(text = "Shopping list $listIdStr deleted permanently")))
        }
    }

    // --- Helpers ---

    private fun toolSchema(
        properties: JsonObject,
        required: List<String> = emptyList()
    ): ToolSchema = ToolSchema(
        properties = properties,
        required = required
    )

    private fun parseUuid(value: String): UUID? = try {
        UUID.fromString(value)
    } catch (e: IllegalArgumentException) {
        null
    }

    private fun errorResult(message: String) = CallToolResult(
        isError = true,
        content = listOf(TextContent(text = message))
    )

    private fun uuidError(value: String) = errorResult("Invalid UUID format: $value")
}
