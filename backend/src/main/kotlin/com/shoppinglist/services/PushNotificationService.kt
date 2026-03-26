package com.shoppinglist.services

import com.interaso.webpush.VapidKeys
import com.interaso.webpush.WebPush
import com.interaso.webpush.WebPushService
import com.shoppinglist.repository.PushSubscriptionRepository
import com.shoppinglist.util.getEnv
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.*

typealias PushSender = suspend (endpoint: String, payload: String, p256dh: String, auth: String) -> Int?

class PushNotificationService(
    private val repository: PushSubscriptionRepository,
    vapidSubject: String,
    vapidPublicKey: String,
    vapidPrivateKey: String,
    private val pushSender: PushSender = buildDefaultSender(vapidSubject, vapidPublicKey, vapidPrivateKey)
) {
    suspend fun notifyListChange(
        listId: UUID,
        excludeDeviceId: String?,
        changeType: String,
        itemText: String?
    ) {
        val subscriptions = if (excludeDeviceId != null) {
            repository.getSubscriptionsForListExcludingDevice(listId, excludeDeviceId)
        } else {
            repository.getSubscriptionsForList(listId)
        }

        val payload = buildPayload(changeType, listId, itemText)

        coroutineScope {
            for (sub in subscriptions) {
                launch {
                    val subId = UUID.fromString(sub.id)
                    try {
                        val statusCode = pushSender(sub.endpoint, payload, sub.p256dhKey, sub.authKey)
                        when (statusCode) {
                            null -> Unit
                            404, 410 -> repository.deleteSubscription(subId)
                            else -> repository.incrementFailure(subId)
                        }
                    } catch (e: Exception) {
                        repository.incrementFailure(subId)
                    }
                }
            }
        }
    }

    private fun buildPayload(changeType: String, listId: UUID, itemText: String?): String {
        val title = when (changeType) {
            "ITEM_ADDED" -> "Item added"
            "ITEM_CHECKED" -> "Item checked off"
            "ITEM_UNCHECKED" -> "Item unchecked"
            "ITEM_UPDATED" -> "Item updated"
            "ITEM_DELETED" -> "Item removed"
            "ITEMS_CLEARED" -> "Completed items cleared"
            else -> "List updated"
        }
        val bodyText = when (changeType) {
            "ITEM_ADDED" -> itemText?.let { "✚ $it" } ?: "New item added"
            "ITEM_CHECKED" -> itemText?.let { "✓ $it" } ?: "An item was checked off"
            "ITEM_UNCHECKED" -> itemText?.let { "↩ $it" } ?: "An item was unchecked"
            "ITEM_UPDATED" -> itemText?.let { "✎ $it" } ?: "An item was edited"
            "ITEM_DELETED" -> itemText?.let { "✕ $it" } ?: "An item was removed"
            "ITEMS_CLEARED" -> "All completed items were removed"
            else -> "The list was updated"
        }.take(60)
        val escaped = bodyText.replace("\\", "\\\\").replace("\"", "\\\"")
        return """{"type":"$changeType","listId":"$listId","title":"$title","body":"$escaped","url":"/list/$listId"}"""
    }

    companion object {
        fun fromEnvironment(repository: PushSubscriptionRepository): PushNotificationService {
            val subject = getEnv("VAPID_SUBJECT") ?: error("VAPID_SUBJECT not set")
            val publicKey = getEnv("VAPID_PUBLIC_KEY") ?: error("VAPID_PUBLIC_KEY not set")
            val privateKey = getEnv("VAPID_PRIVATE_KEY") ?: error("VAPID_PRIVATE_KEY not set")
            return PushNotificationService(repository, subject, publicKey, privateKey)
        }

        private fun buildDefaultSender(subject: String, publicKey: String, privateKey: String): PushSender {
            val vapidKeys = runCatching {
                VapidKeys.fromUncompressedBytes(publicKey, privateKey)
            }.getOrElse {
                VapidKeys.create(publicKey, privateKey)
            }
            val pushService = WebPushService(subject, vapidKeys)

            return { endpoint, payload, p256dh, auth ->
                withContext(Dispatchers.IO) {
                    val state = pushService.send(
                        payload = payload,
                        endpoint = endpoint,
                        p256dh = p256dh,
                        auth = auth,
                    )
                    if (state == WebPush.SubscriptionState.ACTIVE) null else 410
                }
            }
        }
    }
}
