package com.shoppinglist.plugins

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import io.ktor.util.*
import com.shoppinglist.websocket.WebSocketService
import java.time.Duration

fun Application.configureWebSockets() {
    install(WebSockets) {
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(15)
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }
    
    val webSocketService = WebSocketService()
    
    routing {
        webSocket("/ws/{listId}") {
            val listId = call.parameters["listId"]
            if (listId == null) {
                close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, "Missing list ID"))
                return@webSocket
            }
            
            // Handle WebSocket connection using the service
            webSocketService.handleConnection(this, listId)
        }
    }
    
    // Store the WebSocket service in application attributes for access by other components
    attributes.put(WebSocketServiceKey, webSocketService)
}

// Application attribute key for WebSocket service
val WebSocketServiceKey = AttributeKey<WebSocketService>("WebSocketService")