package com.shoppinglist.service

import com.shoppinglist.models.PushSubscription
import com.shoppinglist.repository.PushSubscriptionRepository
import com.shoppinglist.services.PushNotificationService
import com.shoppinglist.services.PushSender
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import java.time.Instant
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PushNotificationServiceTest {

    private class StubPushSubscriptionRepository : PushSubscriptionRepository {
        val subscriptions = mutableListOf<PushSubscription>()
        val deletedIds = mutableListOf<UUID>()
        val incrementedIds = mutableListOf<UUID>()

        override suspend fun subscribe(
            listId: UUID, endpoint: String, p256dh: String, auth: String, deviceId: String
        ): PushSubscription = PushSubscription(
            id = UUID.randomUUID().toString(),
            listId = listId.toString(),
            endpoint = endpoint,
            p256dhKey = p256dh,
            authKey = auth,
            deviceId = deviceId,
            createdAt = Instant.now().toString()
        ).also { subscriptions.add(it) }

        override suspend fun unsubscribe(endpoint: String, listId: UUID): Boolean = true

        override suspend fun getSubscriptionsForList(listId: UUID): List<PushSubscription> =
            subscriptions.filter { it.listId == listId.toString() }

        override suspend fun getSubscriptionsForListExcludingDevice(
            listId: UUID, deviceId: String
        ): List<PushSubscription> =
            subscriptions.filter { it.listId == listId.toString() && it.deviceId != deviceId }

        override suspend fun incrementFailure(subscriptionId: UUID): Boolean {
            incrementedIds.add(subscriptionId)
            return true
        }

        override suspend fun deleteSubscription(subscriptionId: UUID): Boolean {
            deletedIds.add(subscriptionId)
            return true
        }

        override suspend fun deleteStaleSubscriptions(maxFailures: Int): Int = 0
    }

    data class SentPush(val endpoint: String, val payload: String)

    private val sentPushes = mutableListOf<SentPush>()

    private var sendResult: Int? = null

    private lateinit var repo: StubPushSubscriptionRepository
    private lateinit var service: PushNotificationService

    @BeforeEach
    fun setup() {
        sentPushes.clear()
        sendResult = null
        repo = StubPushSubscriptionRepository()
        service = PushNotificationService(
            repository = repo,
            vapidSubject = "mailto:test@example.com",
            vapidPublicKey = "TEST_PUBLIC_KEY",
            vapidPrivateKey = "TEST_PRIVATE_KEY",
            pushSender = { endpoint, payload, _, _ ->
                sentPushes.add(SentPush(endpoint, payload))
                sendResult
            }
        )
    }

    private fun makeSubscription(listId: UUID, deviceId: String, endpoint: String = "https://push.example.com/$deviceId"): PushSubscription =
        PushSubscription(
            id = UUID.randomUUID().toString(),
            listId = listId.toString(),
            endpoint = endpoint,
            p256dhKey = "fakep256dh",
            authKey = "fakeauth",
            deviceId = deviceId,
            createdAt = Instant.now().toString()
        )

    @Test
    fun `sends push to all subscribers for a list`() = runBlocking {
        val listId = UUID.randomUUID()
        val sub1 = makeSubscription(listId, "device-A")
        val sub2 = makeSubscription(listId, "device-B")
        repo.subscriptions.addAll(listOf(sub1, sub2))

        service.notifyListChange(listId, excludeDeviceId = null, changeType = "ITEM_ADDED", itemText = "Milk")

        assertEquals(2, sentPushes.size)
        assertTrue(sentPushes.any { it.endpoint == sub1.endpoint })
        assertTrue(sentPushes.any { it.endpoint == sub2.endpoint })
        val payload = sentPushes.first().payload
        assertTrue(payload.contains("ITEM_ADDED"), "Payload should contain type: $payload")
        assertTrue(payload.contains(listId.toString()), "Payload should contain listId: $payload")
    }

    @Test
    fun `excludes sender device when deviceId provided`() = runBlocking {
        val listId = UUID.randomUUID()
        val senderSub = makeSubscription(listId, "sender-device")
        val otherSub = makeSubscription(listId, "other-device")
        repo.subscriptions.addAll(listOf(senderSub, otherSub))

        service.notifyListChange(listId, excludeDeviceId = "sender-device", changeType = "ITEM_ADDED", itemText = "Bread")

        assertEquals(1, sentPushes.size)
        assertEquals(otherSub.endpoint, sentPushes.first().endpoint)
    }

    @Test
    fun `deletes subscription on 404 or 410 response`() = runBlocking {
        val listId = UUID.randomUUID()
        val sub = makeSubscription(listId, "stale-device")
        repo.subscriptions.add(sub)

        for (statusCode in listOf(404, 410)) {
            repo.deletedIds.clear()
            sentPushes.clear()
            sendResult = statusCode

            service.notifyListChange(listId, excludeDeviceId = null, changeType = "ITEM_DELETED", itemText = null)

            assertEquals(1, repo.deletedIds.size, "Should delete subscription on $statusCode")
            assertEquals(UUID.fromString(sub.id), repo.deletedIds.first())
        }
    }

    @Test
    fun `increments failure count on other network errors`() = runBlocking {
        val listId = UUID.randomUUID()
        val sub = makeSubscription(listId, "flaky-device")
        repo.subscriptions.add(sub)

        sendResult = 500

        service.notifyListChange(listId, excludeDeviceId = null, changeType = "ITEM_UPDATED", itemText = "Eggs")

        assertEquals(1, repo.incrementedIds.size, "Should increment failure for 5xx errors")
        assertEquals(UUID.fromString(sub.id), repo.incrementedIds.first())
        assertTrue(repo.deletedIds.isEmpty(), "Should NOT delete subscription on 5xx")
    }
}
