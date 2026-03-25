package com.shoppinglist.websocket

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import java.time.Instant

@Serializable
data class WebSocketMessage(
    val type: MessageType,
    val listId: String,
    val data: JsonElement,
    val timestamp: String = Instant.now().toString()
)

@Serializable
enum class MessageType {
    ITEM_ADDED,
    ITEM_UPDATED,
    ITEM_DELETED,
    ITEMS_CLEARED,
    LIST_UPDATED,
    CONNECTION_ESTABLISHED,
    ERROR
}