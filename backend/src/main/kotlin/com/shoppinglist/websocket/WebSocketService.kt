package com.shoppinglist.websocket

import com.shoppinglist.repository.ListRepositoryImpl
import io.ktor.websocket.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import java.util.*

/**
 * Service class that handles WebSocket connection lifecycle and message processing.
 * Manages the connection between WebSocket sessions and the shopping list system.
 */
class WebSocketService {
    private val connectionManager = ConnectionManager()
    private val messageBroadcaster = MessageBroadcaster(connectionManager)
    private val listRepository = ListRepositoryImpl()
    
    /**
     * Handle a new WebSocket connection for a specific list
     */
    suspend fun handleConnection(session: DefaultWebSocketSession, listId: String) {
        // Validate list ID format
        val listUuid = try {
            UUID.fromString(listId)
        } catch (e: IllegalArgumentException) {
            messageBroadcaster.sendError(session, listId, "Invalid list ID format")
            session.close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, "Invalid list ID"))
            return
        }
        
        // Check if list exists
        if (!listRepository.listExists(listUuid)) {
            messageBroadcaster.sendError(session, listId, "List not found")
            session.close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, "List not found"))
            return
        }
        
        // Add connection to manager
        connectionManager.addConnection(listId, session)
        
        // Send connection established message
        messageBroadcaster.sendConnectionEstablished(session, listId)
        
        try {
            // Listen for incoming messages
            for (frame in session.incoming) {
                when (frame) {
                    is Frame.Text -> {
                        val text = frame.readText()
                        handleIncomingMessage(session, listId, text)
                    }
                    is Frame.Close -> {
                        println("WebSocket connection closed for list $listId")
                        break
                    }
                    else -> {
                        // Handle other frame types if needed
                    }
                }
            }
        } catch (e: ClosedReceiveChannelException) {
            println("WebSocket connection closed unexpectedly for list $listId")
        } catch (e: Exception) {
            println("WebSocket error for list $listId: ${e.message}")
        } finally {
            // Clean up connection
            connectionManager.removeConnection(listId, session)
        }
    }
    
    /**
     * Handle incoming WebSocket messages from clients
     */
    private suspend fun handleIncomingMessage(session: DefaultWebSocketSession, listId: String, message: String) {
        try {
            // For now, we'll just echo back the message
            // In the future, this could handle client-side operations like typing indicators
            println("Received message from client for list $listId: $message")
            
            // Echo the message back to confirm receipt
            session.send(Frame.Text("Received: $message"))
        } catch (e: Exception) {
            println("Error handling incoming message for list $listId: ${e.message}")
        }
    }
    
    /**
     * Get the message broadcaster instance for use by other services
     */
    fun getMessageBroadcaster(): MessageBroadcaster {
        return messageBroadcaster
    }
    
    /**
     * Get the connection manager instance for monitoring
     */
    fun getConnectionManager(): ConnectionManager {
        return connectionManager
    }
}