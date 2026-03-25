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