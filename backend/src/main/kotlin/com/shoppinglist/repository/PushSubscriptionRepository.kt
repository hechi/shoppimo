package com.shoppinglist.repository

import com.shoppinglist.models.PushSubscription
import java.util.*

interface PushSubscriptionRepository {
    suspend fun subscribe(
        listId: UUID,
        endpoint: String,
        p256dh: String,
        auth: String,
        deviceId: String
    ): PushSubscription

    suspend fun unsubscribe(endpoint: String, listId: UUID): Boolean

    suspend fun getSubscriptionsForList(listId: UUID): List<PushSubscription>

    suspend fun getSubscriptionsForListExcludingDevice(
        listId: UUID,
        deviceId: String
    ): List<PushSubscription>

    suspend fun incrementFailure(subscriptionId: UUID): Boolean

    suspend fun deleteSubscription(subscriptionId: UUID): Boolean

    suspend fun deleteStaleSubscriptions(maxFailures: Int = 3): Int
}
