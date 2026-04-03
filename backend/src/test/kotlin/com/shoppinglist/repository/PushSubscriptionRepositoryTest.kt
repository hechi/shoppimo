package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.PushSubscriptions
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.PushSubscription
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PushSubscriptionRepositoryTest {

    companion object {
        @Container
        @JvmField
        val postgres = PostgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("test_shopping_lists")
            .withUsername("test_user")
            .withPassword("test_pass")
    }

    private lateinit var database: Database
    private lateinit var listRepository: ListRepository
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @BeforeEach
    fun setup() {
        database = Database.connect(
            url = postgres.jdbcUrl,
            driver = "org.postgresql.Driver",
            user = postgres.username,
            password = postgres.password
        )

        transaction(database) {
            SchemaUtils.create(ShoppingLists, ListItems, PushSubscriptions)
        }

        listRepository = ListRepositoryImpl()
        pushSubscriptionRepository = PushSubscriptionRepositoryImpl()
    }

    @AfterEach
    fun cleanup() {
        transaction(database) {
            SchemaUtils.drop(PushSubscriptions, ListItems, ShoppingLists)
        }
    }

    @Test
    fun `subscribe creates a new subscription`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)

        val endpoint = "https://push.example.com/endpoint1"
        val p256dh = "p256dh_key_value"
        val auth = "auth_key_value"
        val deviceId = "device-123"

        val subscription = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = endpoint,
            p256dh = p256dh,
            auth = auth,
            deviceId = deviceId
        )

        assertNotNull(subscription)
        assertEquals(endpoint, subscription.endpoint)
        assertEquals(p256dh, subscription.p256dhKey)
        assertEquals(auth, subscription.authKey)
        assertEquals(deviceId, subscription.deviceId)
        assertEquals(0, subscription.consecutiveFailures)
    }

    @Test
    fun `subscribe with duplicate endpoint+listId upserts instead of creating duplicate`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)
        val endpoint = "https://push.example.com/endpoint2"
        val deviceId = "device-456"

        val sub1 = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = endpoint,
            p256dh = "old_p256dh",
            auth = "old_auth",
            deviceId = deviceId
        )

        val sub2 = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = endpoint,
            p256dh = "new_p256dh",
            auth = "new_auth",
            deviceId = deviceId
        )

        // Should be the same ID (upsert, not insert)
        assertEquals(sub1.id, sub2.id)
        assertEquals("new_p256dh", sub2.p256dhKey)
        assertEquals("new_auth", sub2.authKey)

        val subs = pushSubscriptionRepository.getSubscriptionsForList(listId)
        assertEquals(1, subs.size)
    }

    @Test
    fun `unsubscribe deletes a subscription by endpoint and listId`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)
        val endpoint = "https://push.example.com/endpoint3"

        pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = endpoint,
            p256dh = "p256dh",
            auth = "auth",
            deviceId = "device-789"
        )

        var subs = pushSubscriptionRepository.getSubscriptionsForList(listId)
        assertEquals(1, subs.size)

        val deleted = pushSubscriptionRepository.unsubscribe(endpoint, listId)
        assertTrue(deleted)

        subs = pushSubscriptionRepository.getSubscriptionsForList(listId)
        assertEquals(0, subs.size)
    }

    @Test
    fun `getSubscriptionsForList returns all subscriptions for a list`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)

        for (i in 1..3) {
            pushSubscriptionRepository.subscribe(
                listId = listId,
                endpoint = "https://push.example.com/endpoint$i",
                p256dh = "p256dh_$i",
                auth = "auth_$i",
                deviceId = "device-$i"
            )
        }

        val subs = pushSubscriptionRepository.getSubscriptionsForList(listId)
        assertEquals(3, subs.size)
    }

    @Test
    fun `getSubscriptionsForListExcludingDevice filters out specific device`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)

        pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = "https://push.example.com/endpoint1",
            p256dh = "p256dh_1",
            auth = "auth_1",
            deviceId = "device-same"
        )

        pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = "https://push.example.com/endpoint2",
            p256dh = "p256dh_2",
            auth = "auth_2",
            deviceId = "device-other"
        )

        val subs = pushSubscriptionRepository.getSubscriptionsForListExcludingDevice(listId, "device-same")
        assertEquals(1, subs.size)
        assertEquals("device-other", subs[0].deviceId)
    }

    @Test
    fun `incrementFailure increments consecutiveFailures counter`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)

        val sub = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = "https://push.example.com/endpoint4",
            p256dh = "p256dh",
            auth = "auth",
            deviceId = "device-999"
        )

        val subId = UUID.fromString(sub.id)

        pushSubscriptionRepository.incrementFailure(subId)
        var updated = transaction {
            val result = PushSubscriptions.select {
                PushSubscriptions.id eq subId
            }.singleOrNull()
            result?.get(PushSubscriptions.consecutiveFailures) ?: 0
        }
        assertEquals(1, updated)

        pushSubscriptionRepository.incrementFailure(subId)
        updated = transaction {
            val result = PushSubscriptions.select {
                PushSubscriptions.id eq subId
            }.singleOrNull()
            result?.get(PushSubscriptions.consecutiveFailures) ?: 0
        }
        assertEquals(2, updated)
    }

    @Test
    fun `deleteSubscription hard deletes a subscription by ID`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)

        val sub = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = "https://push.example.com/endpoint5",
            p256dh = "p256dh",
            auth = "auth",
            deviceId = "device-111"
        )

        val subId = UUID.fromString(sub.id)

        val deleted = pushSubscriptionRepository.deleteSubscription(subId)
        assertTrue(deleted)

        val subs = pushSubscriptionRepository.getSubscriptionsForList(listId)
        assertEquals(0, subs.size)
    }

    @Test
    fun `deleteStaleSubscriptions removes subscriptions exceeding failure threshold`() = runBlocking {
        val listId = UUID.randomUUID()
        val list = listRepository.createList(listId)

        val sub1 = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = "https://push.example.com/endpoint6",
            p256dh = "p256dh_1",
            auth = "auth_1",
            deviceId = "device-1"
        )

        val sub2 = pushSubscriptionRepository.subscribe(
            listId = listId,
            endpoint = "https://push.example.com/endpoint7",
            p256dh = "p256dh_2",
            auth = "auth_2",
            deviceId = "device-2"
        )

        val subId1 = UUID.fromString(sub1.id)
        val subId2 = UUID.fromString(sub2.id)

        repeat(4) {
            pushSubscriptionRepository.incrementFailure(subId1)
        }
        repeat(2) {
            pushSubscriptionRepository.incrementFailure(subId2)
        }

        val deletedCount = pushSubscriptionRepository.deleteStaleSubscriptions(maxFailures = 3)
        assertEquals(1, deletedCount)

        val subs = pushSubscriptionRepository.getSubscriptionsForList(listId)
        assertEquals(1, subs.size)
        assertEquals("device-2", subs[0].deviceId)
    }
}
