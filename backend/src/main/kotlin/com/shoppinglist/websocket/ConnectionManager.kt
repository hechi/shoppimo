package com.shoppinglist.websocket

import io.ktor.websocket.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArraySet

/**
 * Manages WebSocket connections for shopping lists.
 * Tracks active sessions per list and provides connection lifecycle management.
 */
class ConnectionManager {
    // Map of listId to set of WebSocket sessions
    private val connections = ConcurrentHashMap<String, CopyOnWriteArraySet<DefaultWebSocketSession>>()
    
    /**
     * Add a new WebSocket session for a specific list
     */
    fun addConnection(listId: String, session: DefaultWebSocketSession) {
        connections.computeIfAbsent(listId) { CopyOnWriteArraySet() }.add(session)
        println("Added connection for list $listId. Total connections: ${getConnectionCount(listId)}")
    }
    
    /**
     * Remove a WebSocket session from a specific list
     */
    fun removeConnection(listId: String, session: DefaultWebSocketSession) {
        connections[listId]?.remove(session)
        // Clean up empty sets
        if (connections[listId]?.isEmpty() == true) {
            connections.remove(listId)
        }
        println("Removed connection for list $listId. Total connections: ${getConnectionCount(listId)}")
    }
    
    /**
     * Get all active sessions for a specific list
     */
    fun getConnections(listId: String): Set<DefaultWebSocketSession> {
        return connections[listId]?.toSet() ?: emptySet()
    }
    
    /**
     * Get the number of active connections for a specific list
     */
    fun getConnectionCount(listId: String): Int {
        return connections[listId]?.size ?: 0
    }
    
    /**
     * Get all active list IDs that have connections
     */
    fun getActiveListIds(): Set<String> {
        return connections.keys.toSet()
    }
    
    /**
     * Clean up closed connections for a specific list
     */
    suspend fun cleanupClosedConnections(listId: String) {
        connections[listId]?.let { sessions ->
            val closedSessions = sessions.filter { session ->
                !isSessionActive(session)
            }
            closedSessions.forEach { session ->
                sessions.remove(session)
            }
            
            // Remove empty sets
            if (sessions.isEmpty()) {
                connections.remove(listId)
            }
        }
    }
    
    /**
     * Clean up all closed connections across all lists
     */
    suspend fun cleanupAllClosedConnections() {
        val listsToCleanup = connections.keys.toList()
        listsToCleanup.forEach { listId ->
            cleanupClosedConnections(listId)
        }
    }
    
    /**
     * Check if a session is still active
     */
    private fun isSessionActive(session: DefaultWebSocketSession): Boolean {
        return try {
            !session.outgoing.isClosedForSend
        } catch (e: Exception) {
            false
        }
    }
}