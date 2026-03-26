package com.shoppinglist.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import com.shoppinglist.models.*
import com.shoppinglist.repository.ListRepositoryImpl
import com.shoppinglist.repository.ItemRepositoryImpl
import com.shoppinglist.plugins.WebSocketServiceKey
import com.shoppinglist.services.PushNotificationService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.*

@Serializable
data class ErrorResponse(
    val error: String,
    val message: String
)

@Serializable
data class ClearCompletedResponse(val deletedCount: Int)

fun Route.listRoutes(pushNotificationService: PushNotificationService? = null) {
    val listRepository = ListRepositoryImpl()
    val itemRepository = ItemRepositoryImpl()
    val json = Json { ignoreUnknownKeys = true }
    
    route("/lists") {
        // POST /api/lists - Create new shopping list
        post {
            try {
                val request = try {
                    call.receiveNullable<CreateShoppingListRequest>()
                } catch (e: Exception) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_request", "Invalid request body")
                    )
                    return@post
                }
                val listId = if (request?.id != null) {
                    try {
                        UUID.fromString(request.id)
                    } catch (e: IllegalArgumentException) {
                        call.respond(
                            HttpStatusCode.BadRequest,
                            ErrorResponse("invalid_id", "Invalid UUID format for list ID")
                        )
                        return@post
                    }
                } else {
                    UUID.randomUUID()
                }
                
                val newList = listRepository.createList(listId)
                call.respond(HttpStatusCode.Created, newList)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("server_error", "Failed to create shopping list")
                )
            }
        }
        
        // GET /api/lists/{id} - Get shopping list by ID
        get("/{id}") {
            try {
                val idParam = call.parameters["id"]
                if (idParam == null) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("missing_id", "List ID is required")
                    )
                    return@get
                }
                
                val listId = try {
                    UUID.fromString(idParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_id", "Invalid UUID format for list ID")
                    )
                    return@get
                }
                
                val list = listRepository.getListWithExpiration(listId)
                if (list == null) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("list_not_found", "Shopping list not found")
                    )
                    return@get
                }
                
                call.respond(HttpStatusCode.OK, list)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("server_error", "Failed to retrieve shopping list")
                )
            }
        }
        
        // POST /api/lists/{id}/items - Add new item to list
        post("/{id}/items") {
            try {
                val idParam = call.parameters["id"]
                if (idParam == null) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("missing_id", "List ID is required")
                    )
                    return@post
                }
                
                val listId = try {
                    UUID.fromString(idParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_id", "Invalid UUID format for list ID")
                    )
                    return@post
                }
                
                // Check if list exists
                if (!listRepository.listExists(listId)) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("list_not_found", "Shopping list not found")
                    )
                    return@post
                }
                
                val request = try {
                    call.receive<CreateItemRequest>()
                } catch (e: Exception) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_request", "Invalid request body")
                    )
                    return@post
                }
                
                if (request.text.isBlank()) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_text", "Item text cannot be empty")
                    )
                    return@post
                }
                
                val newItem = itemRepository.createItem(listId, request.text.trim())
                listRepository.updateListModified(listId)
                
                // Broadcast item addition to WebSocket clients
                try {
                    val webSocketService = call.application.attributes.getOrNull(WebSocketServiceKey)
                    webSocketService?.let { service ->
                        val itemJson = json.encodeToJsonElement(ListItem.serializer(), newItem)
                        service.getMessageBroadcaster().broadcastItemAdded(listId.toString(), itemJson)
                    }
                } catch (e: Exception) {
                    call.application.log.warn("Error broadcasting item addition: ${e.message}")
                }

                val deviceId = call.request.queryParameters["deviceId"]
                call.application.launch(Dispatchers.Default) {
                    pushNotificationService?.notifyListChange(listId, deviceId, "ITEM_ADDED", newItem.text)
                }

                call.respond(HttpStatusCode.Created, newItem)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("server_error", "Failed to create item")
                )
            }
        }
        
        // PUT /api/lists/{id}/items/{itemId} - Update existing item
        put("/{id}/items/{itemId}") {
            try {
                val idParam = call.parameters["id"]
                val itemIdParam = call.parameters["itemId"]
                
                if (idParam == null || itemIdParam == null) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("missing_parameters", "List ID and Item ID are required")
                    )
                    return@put
                }
                
                val listId = try {
                    UUID.fromString(idParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_list_id", "Invalid UUID format for list ID")
                    )
                    return@put
                }
                
                val itemId = try {
                    UUID.fromString(itemIdParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_item_id", "Invalid UUID format for item ID")
                    )
                    return@put
                }
                
                // Check if list exists
                if (!listRepository.listExists(listId)) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("list_not_found", "Shopping list not found")
                    )
                    return@put
                }
                
                val request = try {
                    call.receive<UpdateItemRequest>()
                } catch (e: Exception) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_request", "Invalid request body")
                    )
                    return@put
                }
                
                // Validate text if provided
                if (request.text != null && request.text.isBlank()) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_text", "Item text cannot be empty")
                    )
                    return@put
                }
                
                val updatedItem = itemRepository.updateItem(
                    itemId, 
                    request.text?.trim(), 
                    request.completed
                )
                
                if (updatedItem == null) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("item_not_found", "Item not found")
                    )
                    return@put
                }
                
                listRepository.updateListModified(listId)
                
                // Broadcast item update to WebSocket clients
                try {
                    val webSocketService = call.application.attributes.getOrNull(WebSocketServiceKey)
                    webSocketService?.let { service ->
                        val itemJson = json.encodeToJsonElement(ListItem.serializer(), updatedItem)
                        service.getMessageBroadcaster().broadcastItemUpdated(listId.toString(), itemJson)
                    }
                } catch (e: Exception) {
                    call.application.log.warn("Error broadcasting item update: ${e.message}")
                }

                val deviceId = call.request.queryParameters["deviceId"]
                val pushChangeType = when {
                    request.completed != null -> if (updatedItem.completed) "ITEM_CHECKED" else "ITEM_UNCHECKED"
                    else -> "ITEM_UPDATED"
                }
                call.application.launch(Dispatchers.Default) {
                    pushNotificationService?.notifyListChange(listId, deviceId, pushChangeType, updatedItem.text)
                }

                call.respond(HttpStatusCode.OK, updatedItem)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("server_error", "Failed to update item")
                )
            }
        }
        
        // DELETE /api/lists/{id}/items/{itemId} - Delete item
        delete("/{id}/items/{itemId}") {
            try {
                val idParam = call.parameters["id"]
                val itemIdParam = call.parameters["itemId"]
                
                if (idParam == null || itemIdParam == null) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("missing_parameters", "List ID and Item ID are required")
                    )
                    return@delete
                }
                
                val listId = try {
                    UUID.fromString(idParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_list_id", "Invalid UUID format for list ID")
                    )
                    return@delete
                }
                
                val itemId = try {
                    UUID.fromString(itemIdParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_item_id", "Invalid UUID format for item ID")
                    )
                    return@delete
                }
                
                // Check if list exists
                if (!listRepository.listExists(listId)) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("list_not_found", "Shopping list not found")
                    )
                    return@delete
                }
                
                val itemToDelete = itemRepository.getItemById(itemId)
                val deleted = itemRepository.deleteItem(itemId)
                if (!deleted) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("item_not_found", "Item not found")
                    )
                    return@delete
                }
                
                listRepository.updateListModified(listId)
                
                // Broadcast item deletion to WebSocket clients
                try {
                    val webSocketService = call.application.attributes.getOrNull(WebSocketServiceKey)
                    webSocketService?.let { service ->
                        service.getMessageBroadcaster().broadcastItemDeleted(listId.toString(), itemId.toString())
                    }
                } catch (e: Exception) {
                    call.application.log.warn("Error broadcasting item deletion: ${e.message}")
                }

                val deviceId = call.request.queryParameters["deviceId"]
                call.application.launch(Dispatchers.Default) {
                    pushNotificationService?.notifyListChange(listId, deviceId, "ITEM_DELETED", itemToDelete?.text)
                }

                call.respond(HttpStatusCode.NoContent)
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("server_error", "Failed to delete item")
                )
            }
        }
        
        // POST /api/lists/{id}/clear-completed - Clear completed items
        post("/{id}/clear-completed") {
            try {
                val idParam = call.parameters["id"]
                if (idParam == null) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("missing_id", "List ID is required")
                    )
                    return@post
                }
                
                val listId = try {
                    UUID.fromString(idParam)
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("invalid_id", "Invalid UUID format for list ID")
                    )
                    return@post
                }
                
                // Check if list exists
                if (!listRepository.listExists(listId)) {
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("list_not_found", "Shopping list not found")
                    )
                    return@post
                }
                
                val deletedCount = itemRepository.clearCompletedItems(listId)
                listRepository.updateListModified(listId)
                
                // Broadcast items cleared to WebSocket clients
                try {
                    val webSocketService = call.application.attributes.getOrNull(WebSocketServiceKey)
                    webSocketService?.let { service ->
                        service.getMessageBroadcaster().broadcastItemsCleared(listId.toString(), deletedCount)
                    }
                } catch (e: Exception) {
                    call.application.log.warn("Error broadcasting items cleared: ${e.message}")
                }

                val deviceId = call.request.queryParameters["deviceId"]
                call.application.launch(Dispatchers.Default) {
                    pushNotificationService?.notifyListChange(listId, deviceId, "ITEMS_CLEARED", null)
                }

                call.respond(HttpStatusCode.OK, ClearCompletedResponse(deletedCount))
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("server_error", "Failed to clear completed items")
                )
            }
        }
    }
}