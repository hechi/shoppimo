package com.shoppinglist.models

import kotlinx.serialization.Serializable

@Serializable
data class ListItem(
    val id: String,
    val text: String,
    val completed: Boolean,
    val createdAt: String,
    val order: Int
)

@Serializable
data class CreateItemRequest(
    val text: String
)

@Serializable
data class UpdateItemRequest(
    val text: String? = null,
    val completed: Boolean? = null
)