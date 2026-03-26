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
        val bodyText = when {
            itemText != null -> when (changeType) {
                "ITEM_ADDED" -> "$itemText added"
                "ITEM_UPDATED" -> "$itemText updated"
                "ITEM_DELETED" -> "$itemText removed"
                else -> "List updated"
            }
            else -> "List updated"
        }.take(40)
        return """{"type":"$changeType","listId":"$listId","title":"List updated","body":"$bodyText","url":"/list/$listId"}"""
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
