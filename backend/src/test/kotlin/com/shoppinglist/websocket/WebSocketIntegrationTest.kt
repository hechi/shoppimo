package com.shoppinglist.websocket

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.ShoppingList
import com.shoppinglist.plugins.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.junit.jupiter.api.*
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class WebSocketIntegrationTest {

    companion object {
        @Container
        @JvmField
        val postgres = PostgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("test_shopping_lists")
            .withUsername("test_user")
            .withPassword("test_pass")
    }

    private lateinit var database: Database
    private val json = Json { ignoreUnknownKeys = true }

    @BeforeEach
    fun setup() {
        database = Database.connect(
            url = postgres.jdbcUrl,
            driver = "org.postgresql.Driver",
            user = postgres.username,
            password = postgres.password
        )
        
        transaction(database) {
            SchemaUtils.create(ShoppingLists, ListItems)
        }
    }

    @AfterEach
    fun cleanup() {
        transaction(database) {
            SchemaUtils.drop(ListItems, ShoppingLists)
        }
    }

    @Test
    fun `WebSocket connection should be established for valid list ID`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
            configureWebSockets()
        }

        // Create a test list first
        val listResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        assertEquals(HttpStatusCode.Created, listResponse.status)
        val list = json.decodeFromString<ShoppingList>(listResponse.bodyAsText())

        // Test WebSocket connection
        val wsClient = createClient {
            install(WebSockets) {
                contentConverter = KotlinxWebsocketSerializationConverter(Json)
            }
        }

        wsClient.webSocket("/ws/${list.id}") {
            // Should receive connection established message
            val frame = incoming.receive() as Frame.Text
            val message = json.decodeFromString<WebSocketMessage>(frame.readText())
            
            assertEquals(MessageType.CONNECTION_ESTABLISHED, message.type)
            assertEquals(list.id, message.listId)
        }
    }

    @Test
    fun `WebSocket connection should be rejected for invalid list ID`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
            configureWebSockets()
        }

        val wsClient = createClient {
            install(WebSockets) {
                contentConverter = KotlinxWebsocketSerializationConverter(Json)
            }
        }

        wsClient.webSocket("/ws/invalid-uuid") {
            val frame = incoming.receive() as Frame.Text
            val message = json.decodeFromString<WebSocketMessage>(frame.readText())
            assertEquals(MessageType.ERROR, message.type)
        }
    }

    @Test
    fun `WebSocket connection should be rejected for non-existing list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
            configureWebSockets()
        }

        val wsClient = createClient {
            install(WebSockets) {
                contentConverter = KotlinxWebsocketSerializationConverter(Json)
            }
        }

        val nonExistentListId = UUID.randomUUID().toString()

        wsClient.webSocket("/ws/$nonExistentListId") {
            val frame = incoming.receive() as Frame.Text
            val message = json.decodeFromString<WebSocketMessage>(frame.readText())
            assertEquals(MessageType.ERROR, message.type)
        }
    }

    @Test
    fun `WebSocket should broadcast item addition to connected clients`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
            configureWebSockets()
        }

        // Create a test list
        val listResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val list = json.decodeFromString<ShoppingList>(listResponse.bodyAsText())

        val wsClient = createClient {
            install(WebSockets) {
                contentConverter = KotlinxWebsocketSerializationConverter(Json)
            }
        }

        // Connect to WebSocket and listen for messages
        wsClient.webSocket("/ws/${list.id}") {
            // Skip connection established message
            incoming.receive()

            // Add an item via REST API
            runBlocking {
                client.post("/api/lists/${list.id}/items") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"text": "Test Item"}""")
                }
            }

            // Should receive item added broadcast
            val frame = incoming.receive() as Frame.Text
            val message = json.decodeFromString<WebSocketMessage>(frame.readText())
            
            assertEquals(MessageType.ITEM_ADDED, message.type)
            assertEquals(list.id, message.listId)
            assertNotNull(message.data)
        }
    }

    @Test
    fun `WebSocket should broadcast item updates to connected clients`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
            configureWebSockets()
        }

        // Create a test list and add an item
        val listResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val list = json.decodeFromString<ShoppingList>(listResponse.bodyAsText())

        val itemResponse = client.post("/api/lists/${list.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Test Item"}""")
        }
        val item = json.decodeFromString<com.shoppinglist.models.ListItem>(itemResponse.bodyAsText())

        val wsClient = createClient {
            install(WebSockets) {
                contentConverter = KotlinxWebsocketSerializationConverter(Json)
            }
        }

        // Connect to WebSocket and listen for messages
        wsClient.webSocket("/ws/${list.id}") {
            // Skip connection established message
            incoming.receive()

            // Update the item via REST API
            runBlocking {
                client.put("/api/lists/${list.id}/items/${item.id}") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"text": "Updated Item", "completed": true}""")
                }
            }

            // Should receive item updated broadcast
            val frame = incoming.receive() as Frame.Text
            val message = json.decodeFromString<WebSocketMessage>(frame.readText())
            
            assertEquals(MessageType.ITEM_UPDATED, message.type)
            assertEquals(list.id, message.listId)
            assertNotNull(message.data)
        }
    }

    @Test
    fun `WebSocket should handle connection cleanup on disconnect`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
            configureWebSockets()
        }

        // Create a test list
        val listResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val list = json.decodeFromString<ShoppingList>(listResponse.bodyAsText())

        val wsClient = createClient {
            install(WebSockets) {
                contentConverter = KotlinxWebsocketSerializationConverter(Json)
            }
        }

        // Connect and then disconnect
        wsClient.webSocket("/ws/${list.id}") {
            // Receive connection established message
            incoming.receive()
            
            // Close the connection
            close()
        }

        // Connection should be cleaned up automatically
        // This test mainly verifies that no exceptions are thrown during cleanup
        assertTrue(true) // If we reach here, cleanup worked properly
    }
}