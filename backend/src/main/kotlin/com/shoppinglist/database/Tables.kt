package com.shoppinglist.database

import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object ShoppingLists : UUIDTable("shopping_lists") {
    val createdAt = timestamp("created_at").default(Instant.now())
    val lastModified = timestamp("last_modified").default(Instant.now())
}

object ListItems : UUIDTable("list_items") {
    val listId = reference("list_id", ShoppingLists)
    val text = varchar("text", 500)
    val completed = bool("completed").default(false)
    val createdAt = timestamp("created_at").default(Instant.now())
    val itemOrder = integer("item_order")
    
    init {
        index(false, listId)
        index(false, listId, itemOrder)
    }
}

object PushSubscriptions : UUIDTable("push_subscriptions") {
    val listId = reference("list_id", ShoppingLists)
    val endpoint = text("endpoint")
    val p256dhKey = text("p256dh_key")
    val authKey = text("auth_key")
    val deviceId = varchar("device_id", 255)
    val createdAt = timestamp("created_at").default(Instant.now())
    val consecutiveFailures = integer("consecutive_failures").default(0)
    
    init {
        uniqueIndex(endpoint, listId)
        index(false, listId)
        index(false, endpoint)
    }
}