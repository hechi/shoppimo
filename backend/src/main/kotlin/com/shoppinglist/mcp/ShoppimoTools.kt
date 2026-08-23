package com.shoppinglist.mcp

import com.shoppinglist.models.ListItem
import com.shoppinglist.repository.ItemRepositoryImpl
import com.shoppinglist.repository.ListRepositoryImpl
import com.shoppinglist.websocket.MessageBroadcaster
import com.shoppinglist.websocket.WebSocketService
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.modelcontextprotocol.kotlin.sdk.types.ToolSchema
import kotlinx.serialization.json.*
import org.slf4j.LoggerFactory
import java.util.*

/**
 * Registers all Shoppimo shopping list tools with the MCP server.
 * Tools allow AI assistants to create, read, and manage shopping lists.
 */
object ShoppimoTools {

    private val logger = LoggerFactory.getLogger(ShoppimoTools::class.java)
    private val listRepository = ListRepositoryImpl()
    private val itemRepository = ItemRepositoryImpl()
    private val json = Json { ignoreUnknownKeys = true }

    private var broadcaster: MessageBroadcaster? = null

    fun register(server: Server, webSocketService: WebSocketService? = null) {
        broadcaster = webSocketService?.getMessageBroadcaster()
        logger.info("Registering MCP tools... (WebSocket broadcasting: {})", broadcaster != null)
        registerCreateList(server)
        registerGetList(server)
        registerGetListByAlias(server)
        registerSetAlias(server)
        registerAddItem(server)
        registerRemoveItem(server)
        registerCheckItem(server)
        registerUncheckItem(server)
        registerClearCompleted(server)
        registerDeleteList(server)
        registerAddItems(server)
        logger.info("All MCP tools registered successfully")
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
            logger.info("MCP tool 'create_list' called with args: {}", request.arguments)
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
            logger.info("MCP tool 'get_list' called with args: {}", request.arguments)
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

    private fun registerGetListByAlias(server: Server) {
        server.addTool(
            name = "get_list_by_alias",
            description = "Look up a shopping list by its human-friendly alias (e.g. 'groceries', 'yey'). Returns the list with all items, same as get_list but accepts an alias instead of a UUID.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("alias") {
                        put("type", "string")
                        put("description", "The alias of the shopping list (e.g. 'groceries').")
                    }
                },
                required = listOf("alias")
            )
        ) { request ->
            val alias = request.arguments?.get("alias")?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("alias is required")

            logger.info("MCP tool 'get_list_by_alias' called with alias='{}'", alias)

            if (alias.isBlank()) return@addTool errorResult("alias cannot be empty")

            val list = listRepository.getListByAlias(alias.trim().lowercase())
                ?: return@addTool errorResult("No shopping list found with alias: $alias")

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

    private fun registerSetAlias(server: Server) {
        server.addTool(
            name = "set_alias",
            description = "Set or update a human-friendly alias for a shopping list (e.g. 'groceries', 'hornbach'). Aliases must be lowercase, alphanumeric with hyphens, max 64 chars. Pass null/empty to remove an existing alias.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                    putJsonObject("alias") {
                        put("type", "string")
                        put("description", "The alias to set (lowercase, alphanumeric, hyphens allowed, max 64 chars). Send empty string or omit to remove the alias.")
                    }
                },
                required = listOf("list_id")
            )
        ) { request ->
            val args = request.arguments ?: return@addTool errorResult("Arguments required")

            val listIdStr = args["list_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")
            val aliasInput = args["alias"]?.jsonPrimitive?.contentOrNull

            logger.info("MCP tool 'set_alias' called with list_id={}, alias='{}'", listIdStr, aliasInput)

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)

            if (!listRepository.listExists(listId)) {
                return@addTool errorResult("Shopping list not found: $listIdStr")
            }

            // Normalize and validate alias
            val normalizedAlias = aliasInput?.trim()?.lowercase()?.ifBlank { null }

            if (normalizedAlias != null) {
                val aliasRegex = Regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?\$")
                if (!aliasRegex.matches(normalizedAlias) || normalizedAlias.length > 64) {
                    return@addTool errorResult("Alias must be 1-64 characters, lowercase alphanumeric and hyphens only, cannot start or end with a hyphen")
                }

                val uuidRegex = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\$")
                if (uuidRegex.matches(normalizedAlias)) {
                    return@addTool errorResult("Alias cannot be in UUID format")
                }

                if (listRepository.aliasExists(normalizedAlias)) {
                    val currentList = listRepository.getListWithExpiration(listId)
                    if (currentList?.alias != normalizedAlias) {
                        return@addTool errorResult("Alias '$normalizedAlias' is already in use by another list")
                    }
                }
            }

            listRepository.updateAlias(listId, normalizedAlias)

            val message = if (normalizedAlias != null) {
                "Alias '$normalizedAlias' set for list $listIdStr"
            } else {
                "Alias removed from list $listIdStr"
            }

            CallToolResult(content = listOf(TextContent(text = message)))
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

            // Broadcast to WebSocket clients
            broadcastItemAdded(listIdStr, item)

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

            // Broadcast to WebSocket clients
            broadcastItemDeleted(listIdStr, itemIdStr)

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

            // Broadcast to WebSocket clients
            broadcastItemUpdated(listIdStr, updated)

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

            // Broadcast to WebSocket clients
            broadcastItemUpdated(listIdStr, updated)

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

            // Broadcast to WebSocket clients
            broadcastItemsCleared(listIdStr, deletedCount)

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

    private fun registerAddItems(server: Server) {
        server.addTool(
            name = "add_items",
            description = "Add multiple items to a shopping list in a single batch operation. More efficient than calling add_item repeatedly.",
            inputSchema = toolSchema(
                properties = buildJsonObject {
                    putJsonObject("list_id") {
                        put("type", "string")
                        put("description", "The UUID of the shopping list.")
                    }
                    putJsonObject("items") {
                        put("type", "array")
                        put("description", "Array of item texts to add to the list.")
                        putJsonObject("items") {
                            put("type", "string")
                        }
                    }
                },
                required = listOf("list_id", "items")
            )
        ) { request ->
            val args = request.arguments ?: return@addTool errorResult("Arguments required")

            val listIdStr = args["list_id"]?.jsonPrimitive?.contentOrNull
                ?: return@addTool errorResult("list_id is required")
            val itemsArray = args["items"]?.jsonArray
                ?: return@addTool errorResult("items is required and must be an array")

            if (itemsArray.isEmpty()) return@addTool errorResult("items array cannot be empty")
            if (itemsArray.size > 50) return@addTool errorResult("Cannot add more than 50 items at once")

            val listId = parseUuid(listIdStr) ?: return@addTool uuidError(listIdStr)

            if (!listRepository.listExists(listId)) {
                return@addTool errorResult("Shopping list not found: $listIdStr")
            }

            val addedItems = mutableListOf<ListItem>()
            val errors = mutableListOf<String>()

            for (element in itemsArray) {
                val text = element.jsonPrimitive.contentOrNull?.trim()
                if (text.isNullOrBlank()) {
                    errors.add("Skipped empty item")
                    continue
                }
                val item = itemRepository.createItem(listId, text)
                addedItems.add(item)
                broadcastItemAdded(listIdStr, item)
            }

            listRepository.updateListModified(listId)

            CallToolResult(
                content = listOf(TextContent(text = buildJsonObject {
                    put("added", addedItems.size)
                    put("skipped", errors.size)
                    put("list_id", listIdStr)
                    putJsonArray("items") {
                        addedItems.forEach { item ->
                            addJsonObject {
                                put("id", item.id)
                                put("text", item.text)
                                put("order", item.order)
                            }
                        }
                    }
                    put("message", "Added ${addedItems.size} item(s) to list $listIdStr")
                }.toString()))
            )
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

    // --- WebSocket broadcasting helpers ---

    private suspend fun broadcastItemAdded(listId: String, item: ListItem) {
        try {
            broadcaster?.let { b ->
                val itemJson = json.encodeToJsonElement(ListItem.serializer(), item)
                b.broadcastItemAdded(listId, itemJson)
                logger.debug("Broadcast item_added for list {}", listId)
            }
        } catch (e: Exception) {
            logger.warn("Error broadcasting item addition via MCP: {}", e.message)
        }
    }

    private suspend fun broadcastItemUpdated(listId: String, item: ListItem) {
        try {
            broadcaster?.let { b ->
                val itemJson = json.encodeToJsonElement(ListItem.serializer(), item)
                b.broadcastItemUpdated(listId, itemJson)
                logger.debug("Broadcast item_updated for list {}", listId)
            }
        } catch (e: Exception) {
            logger.warn("Error broadcasting item update via MCP: {}", e.message)
        }
    }

    private suspend fun broadcastItemDeleted(listId: String, itemId: String) {
        try {
            broadcaster?.broadcastItemDeleted(listId, itemId)
            logger.debug("Broadcast item_deleted for list {}", listId)
        } catch (e: Exception) {
            logger.warn("Error broadcasting item deletion via MCP: {}", e.message)
        }
    }

    private suspend fun broadcastItemsCleared(listId: String, deletedCount: Int) {
        try {
            broadcaster?.broadcastItemsCleared(listId, deletedCount)
            logger.debug("Broadcast items_cleared for list {}", listId)
        } catch (e: Exception) {
            logger.warn("Error broadcasting items cleared via MCP: {}", e.message)
        }
    }
}
