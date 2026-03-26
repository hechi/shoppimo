package com.shoppinglist.routes

import com.shoppinglist.models.PushSubscription
import com.shoppinglist.plugins.configureCORS
import com.shoppinglist.plugins.configureSerialization
import com.shoppinglist.repository.PushSubscriptionRepository
import com.shoppinglist.services.PushNotificationService
import com.shoppinglist.services.PushSender
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

// Stub repository for testing
class StubPushSubscriptionRepository : PushSubscriptionRepository {
    val subscriptions = mutableListOf<PushSubscription>()

    override suspend fun subscribe(
        listId: UUID,
        endpoint: String,
        p256dh: String,
        auth: String,
        deviceId: String
    ): PushSubscription {
        val sub = PushSubscription(
            id = UUID.randomUUID().toString(),
            listId = listId.toString(),
            endpoint = endpoint,
            p256dhKey = p256dh,
            authKey = auth,
            deviceId = deviceId,
            createdAt = Instant.now().toString(),
            consecutiveFailures = 0
        )
        subscriptions.removeIf { it.endpoint == endpoint && it.listId == listId.toString() }
        subscriptions.add(sub)
        return sub
    }

    override suspend fun unsubscribe(endpoint: String, listId: UUID): Boolean {
        val sizeBefore = subscriptions.size
        subscriptions.removeIf { it.endpoint == endpoint && it.listId == listId.toString() }
        return subscriptions.size < sizeBefore
    }

    override suspend fun getSubscriptionsForList(listId: UUID): List<PushSubscription> =
        subscriptions.filter { it.listId == listId.toString() }

    override suspend fun getSubscriptionsForListExcludingDevice(
        listId: UUID,
        deviceId: String
    ): List<PushSubscription> =
        subscriptions.filter { it.listId == listId.toString() && it.deviceId != deviceId }

    override suspend fun incrementFailure(subscriptionId: UUID): Boolean {
        val sub = subscriptions.find { it.id == subscriptionId.toString() } ?: return false
        val idx = subscriptions.indexOf(sub)
        subscriptions[idx] = sub.copy(consecutiveFailures = sub.consecutiveFailures + 1)
        return true
    }

    override suspend fun deleteSubscription(subscriptionId: UUID): Boolean {
        val sizeBefore = subscriptions.size
        subscriptions.removeIf { it.id == subscriptionId.toString() }
        return subscriptions.size < sizeBefore
    }

    override suspend fun deleteStaleSubscriptions(maxFailures: Int): Int {
        val sizeBefore = subscriptions.size
        subscriptions.removeIf { it.consecutiveFailures >= maxFailures }
        return sizeBefore - subscriptions.size
    }
}

fun stubPushNotificationService(): PushNotificationService {
    val noOpSender: com.shoppinglist.services.PushSender = { _, _, _, _ -> null }
    return PushNotificationService(
        repository = StubPushSubscriptionRepository(),
        vapidSubject = "mailto:test@test.com",
        vapidPublicKey = "unused",
        vapidPrivateKey = "unused",
        pushSender = noOpSender
    )
}

class PushRoutesTest {
    private val json = Json { ignoreUnknownKeys = true }
    private val testListId = UUID.randomUUID()

    private fun ApplicationTestBuilder.setupApp(
        pushRepo: PushSubscriptionRepository = StubPushSubscriptionRepository()
    ) {
        application {
            configureSerialization()
            configureCORS()
            routing {
                route("/api") {
                    pushRoutes(pushRepo)
                    listRoutes()
                }
            }
        }
    }

    @Test
    fun `GET api push vapid-key returns 200 with publicKey field`() = testApplication {
        setupApp()

        val response = client.get("/api/push/vapid-key")

        assertEquals(HttpStatusCode.OK, response.status)
        val body = json.parseToJsonElement(response.bodyAsText()).jsonObject
        assertNotNull(body["publicKey"])
    }

    @Test
    fun `GET api push vapid-key returns publicKey from VAPID_PUBLIC_KEY env or empty string`() = testApplication {
        setupApp()

        val response = client.get("/api/push/vapid-key")

        assertEquals(HttpStatusCode.OK, response.status)
        val body = json.parseToJsonElement(response.bodyAsText()).jsonObject
        // Must have a "publicKey" field (string — may be empty if env not set)
        val pk = body["publicKey"]?.jsonPrimitive?.content
        assertNotNull(pk)
    }

    @Test
    fun `POST api push subscribe with valid body returns 201`() = testApplication {
        val repo = StubPushSubscriptionRepository()
        setupApp(pushRepo = repo)

        val response = client.post("/api/push/subscribe") {
            contentType(ContentType.Application.Json)
            setBody(
                """{"listId":"${testListId}","endpoint":"https://push.example.com/sub","p256dh":"keydata","auth":"authdata","deviceId":"device-abc"}"""
            )
        }

        assertEquals(HttpStatusCode.Created, response.status)
        assertEquals(1, repo.subscriptions.size)
        assertEquals("https://push.example.com/sub", repo.subscriptions[0].endpoint)
    }

    @Test
    fun `POST api push subscribe persists correct fields`() = testApplication {
        val repo = StubPushSubscriptionRepository()
        setupApp(pushRepo = repo)

        client.post("/api/push/subscribe") {
            contentType(ContentType.Application.Json)
            setBody(
                """{"listId":"${testListId}","endpoint":"https://example.com/push","p256dh":"p256key","auth":"authkey","deviceId":"my-device-id"}"""
            )
        }

        assertEquals(1, repo.subscriptions.size)
        with(repo.subscriptions[0]) {
            assertEquals(testListId.toString(), listId)
            assertEquals("https://example.com/push", endpoint)
            assertEquals("p256key", p256dhKey)
            assertEquals("authkey", authKey)
            assertEquals("my-device-id", deviceId)
        }
    }

    @Test
    fun `POST api push subscribe with missing listId returns 400`() = testApplication {
        setupApp()

        val response = client.post("/api/push/subscribe") {
            contentType(ContentType.Application.Json)
            setBody("""{"endpoint":"https://example.com/push","p256dh":"key","auth":"auth","deviceId":"dev"}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST api push subscribe with invalid listId UUID returns 400`() = testApplication {
        setupApp()

        val response = client.post("/api/push/subscribe") {
            contentType(ContentType.Application.Json)
            setBody("""{"listId":"not-a-uuid","endpoint":"https://example.com/push","p256dh":"key","auth":"auth","deviceId":"dev"}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST api push unsubscribe with valid body returns 200`() = testApplication {
        val repo = StubPushSubscriptionRepository()
        // Pre-add a subscription
        repo.subscriptions.add(
            PushSubscription(
                id = UUID.randomUUID().toString(),
                listId = testListId.toString(),
                endpoint = "https://push.example.com/sub",
                p256dhKey = "key",
                authKey = "auth",
                deviceId = "dev",
                createdAt = Instant.now().toString()
            )
        )
        setupApp(pushRepo = repo)

        val response = client.post("/api/push/unsubscribe") {
            contentType(ContentType.Application.Json)
            setBody("""{"listId":"${testListId}","endpoint":"https://push.example.com/sub"}""")
        }

        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(repo.subscriptions.isEmpty())
    }

    @Test
    fun `POST api push unsubscribe with non-existent subscription still returns 200`() = testApplication {
        setupApp()

        val response = client.post("/api/push/unsubscribe") {
            contentType(ContentType.Application.Json)
            setBody("""{"listId":"${testListId}","endpoint":"https://nonexistent.com/push"}""")
        }

        // Unsubscribe is idempotent - always 200
        assertEquals(HttpStatusCode.OK, response.status)
    }

    @Test
    fun `POST api push unsubscribe with missing endpoint returns 400`() = testApplication {
        setupApp()

        val response = client.post("/api/push/unsubscribe") {
            contentType(ContentType.Application.Json)
            setBody("""{"listId":"${testListId}"}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST api push unsubscribe with invalid listId returns 400`() = testApplication {
        setupApp()

        val response = client.post("/api/push/unsubscribe") {
            contentType(ContentType.Application.Json)
            setBody("""{"listId":"not-a-uuid","endpoint":"https://example.com/push"}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
    }
}
