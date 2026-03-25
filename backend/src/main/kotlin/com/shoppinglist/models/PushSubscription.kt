package com.shoppinglist.models

import kotlinx.serialization.Serializable
import java.time.Instant

@Serializable
data class PushSubscription(
    val id: String,
    val listId: String,
    val endpoint: String,
    val p256dhKey: String,
    val authKey: String,
    val deviceId: String,
    val createdAt: String,
    val consecutiveFailures: Int = 0
)
