package com.shoppinglist.models

import kotlinx.serialization.Serializable
import java.time.Instant

@Serializable
data class ShoppingList(
    val id: String,
    val items: List<ListItem> = emptyList(),
    val createdAt: String,
    val lastModified: String,
    val expiresAt: String? = null
)

@Serializable
data class CreateShoppingListRequest(
    val id: String? = null
)

@Serializable
data class ShoppingListResponse(
    val id: String,
    val items: List<ListItem>,
    val createdAt: String,
    val lastModified: String,
    val expiresAt: String? = null
)