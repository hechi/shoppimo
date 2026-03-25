package com.shoppinglist.websocket

import io.ktor.websocket.*
import kotlinx.coroutines.channels.ClosedSendChannelException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

/**
 * Handles broadcasting WebSocket messages to connected clients.
 * Manages message serialization and delivery to multiple sessions.
 */
class MessageBroadcaster(private val connectionManager: ConnectionManager) {
    
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
    
    /**
     * Broadcast a message to all connected clients for a specific list
     */
    suspend fun broadcastToList(listId: String, message: WebSocketMessage) {
        val connections = connectionManager.getConnections(listId)
        if (connections.isEmpty()) {
            println("No connections found for list $listId")
            return
        }
        
        val messageText = json.encodeToString(message)
        println("Broadcasting message to ${connections.size} connections for list $listId: ${message.type}")
        
        val failedConnections = mutableListOf<DefaultWebSocketSession>()
        
        connections.forEach { session ->
            try {
                session.send(Frame.Text(messageText))
            } catch (e: ClosedSendChannelException) {
                println("Connection closed for list $listId, removing from active connections")
                failedConnections.add(session)
            } catch (e: Exception) {
                println("Error sending message to connection for list $listId: ${e.message}")
                failedConnections.add(session)
            }
        }
        
        // Clean up failed connections
        failedConnections.forEach { session ->
            connectionManager.removeConnection(listId, session)
        }
    }
    
    /**
     * Broadcast an item added message
     */
    suspend fun broadcastItemAdded(listId: String, item: JsonElement) {
        val message = WebSocketMessage(
            type = MessageType.ITEM_ADDED,
            listId = listId,
            data = item
        )
        broadcastToList(listId, message)
    }
    
    /**
     * Broadcast an item updated message
     */
    suspend fun broadcastItemUpdated(listId: String, item: JsonElement) {
        val message = WebSocketMessage(
            type = MessageType.ITEM_UPDATED,
            listId = listId,
            data = item
        )
        broadcastToList(listId, message)
    }
    
    /**
     * Broadcast an item deleted message
     */
    suspend fun broadcastItemDeleted(listId: String, itemId: String) {
        val message = WebSocketMessage(
            type = MessageType.ITEM_DELETED,
            listId = listId,
            data = Json.encodeToJsonElement(kotlinx.serialization.serializer(), mapOf("id" to itemId))
        )
        broadcastToList(listId, message)
    }
    
    /**
     * Broadcast items cleared message
     */
    suspend fun broadcastItemsCleared(listId: String, deletedCount: Int) {
        val message = WebSocketMessage(
            type = MessageType.ITEMS_CLEARED,
            listId = listId,
            data = Json.encodeToJsonElement(kotlinx.serialization.serializer(), mapOf("deletedCount" to deletedCount))
        )
        broadcastToList(listId, message)
    }
    
    /**
     * Send a connection established message to a specific session
     */
    suspend fun sendConnectionEstablished(session: DefaultWebSocketSession, listId: String) {
        val message = WebSocketMessage(
            type = MessageType.CONNECTION_ESTABLISHED,
            listId = listId,
            data = Json.encodeToJsonElement(kotlinx.serialization.serializer(), mapOf("status" to "connected"))
        )
        
        try {
            val messageText = json.encodeToString(message)
            session.send(Frame.Text(messageText))
        } catch (e: Exception) {
            println("Error sending connection established message: ${e.message}")
        }
    }
    
    /**
     * Send an error message to a specific session
     */
    suspend fun sendError(session: DefaultWebSocketSession, listId: String, error: String) {
        val message = WebSocketMessage(
            type = MessageType.ERROR,
            listId = listId,
            data = Json.encodeToJsonElement(kotlinx.serialization.serializer(), mapOf("error" to error))
        )
        
        try {
            val messageText = json.encodeToString(message)
            session.send(Frame.Text(messageText))
        } catch (e: Exception) {
            println("Error sending error message: ${e.message}")
        }
    }
}