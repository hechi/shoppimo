package com.shoppinglist.routes

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.*
import com.shoppinglist.plugins.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
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
import kotlin.test.assertTrue

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ListRoutesTest {

    @Container
    private val postgres = PostgreSQLContainer("postgres:15-alpine")
        .withDatabaseName("test_shopping_lists")
        .withUsername("test_user")
        .withPassword("test_pass")

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
    fun `POST api lists should create new shopping list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val response = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }

        assertEquals(HttpStatusCode.Created, response.status)
        val responseBody = response.bodyAsText()
        val shoppingList = json.decodeFromString<ShoppingList>(responseBody)
        
        assertNotNull(shoppingList.id)
        assertTrue(shoppingList.items.isEmpty())
        assertNotNull(shoppingList.createdAt)
        assertNotNull(shoppingList.lastModified)
    }

    @Test
    fun `POST api lists should create list with specified ID`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val listId = UUID.randomUUID().toString()
        val response = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("""{"id": "$listId"}""")
        }

        assertEquals(HttpStatusCode.Created, response.status)
        val responseBody = response.bodyAsText()
        val shoppingList = json.decodeFromString<ShoppingList>(responseBody)
        
        assertEquals(listId, shoppingList.id)
    }

    @Test
    fun `POST api lists should return error for invalid UUID`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val response = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("""{"id": "invalid-uuid"}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("Invalid UUID format"))
    }

    @Test
    fun `GET api lists id should return existing list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // First create a list
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        // Then retrieve it
        val getResponse = client.get("/api/lists/${createdList.id}")

        assertEquals(HttpStatusCode.OK, getResponse.status)
        val responseBody = getResponse.bodyAsText()
        val retrievedList = json.decodeFromString<ShoppingList>(responseBody)
        
        assertEquals(createdList.id, retrievedList.id)
        assertEquals(createdList.createdAt, retrievedList.createdAt)
    }

    @Test
    fun `GET api lists id should return 404 for non-existing list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val nonExistingId = UUID.randomUUID()
        val response = client.get("/api/lists/$nonExistingId")

        assertEquals(HttpStatusCode.NotFound, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("Shopping list not found"))
    }

    @Test
    fun `GET api lists id should return error for invalid UUID`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val response = client.get("/api/lists/invalid-uuid")

        assertEquals(HttpStatusCode.BadRequest, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("Invalid UUID format"))
    }

    @Test
    fun `POST api lists id items should add new item to list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list first
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        // Add an item
        val addItemResponse = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Test Item"}""")
        }

        assertEquals(HttpStatusCode.Created, addItemResponse.status)
        val responseBody = addItemResponse.bodyAsText()
        val newItem = json.decodeFromString<ListItem>(responseBody)
        
        assertEquals("Test Item", newItem.text)
        assertEquals(false, newItem.completed)
        assertEquals(1, newItem.order)
        assertNotNull(newItem.id)
        assertNotNull(newItem.createdAt)
    }

    @Test
    fun `POST api lists id items should return error for empty text`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list first
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        // Try to add item with empty text
        val addItemResponse = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": ""}""")
        }

        assertEquals(HttpStatusCode.BadRequest, addItemResponse.status)
        val responseBody = addItemResponse.bodyAsText()
        assertTrue(responseBody.contains("Item text cannot be empty"))
    }

    @Test
    fun `POST api lists id items should return 404 for non-existing list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val nonExistingId = UUID.randomUUID()
        val response = client.post("/api/lists/$nonExistingId/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Test Item"}""")
        }

        assertEquals(HttpStatusCode.NotFound, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("Shopping list not found"))
    }

    @Test
    fun `PUT api lists id items itemId should update existing item`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list and add an item
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        val addItemResponse = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Original Text"}""")
        }
        val createdItem = json.decodeFromString<ListItem>(addItemResponse.bodyAsText())

        // Update the item
        val updateResponse = client.put("/api/lists/${createdList.id}/items/${createdItem.id}") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Updated Text", "completed": true}""")
        }

        assertEquals(HttpStatusCode.OK, updateResponse.status)
        val responseBody = updateResponse.bodyAsText()
        val updatedItem = json.decodeFromString<ListItem>(responseBody)
        
        assertEquals("Updated Text", updatedItem.text)
        assertEquals(true, updatedItem.completed)
        assertEquals(createdItem.id, updatedItem.id)
    }

    @Test
    fun `PUT api lists id items itemId should update only specified fields`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list and add an item
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        val addItemResponse = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Original Text"}""")
        }
        val createdItem = json.decodeFromString<ListItem>(addItemResponse.bodyAsText())

        // Update only completion status
        val updateResponse = client.put("/api/lists/${createdList.id}/items/${createdItem.id}") {
            contentType(ContentType.Application.Json)
            setBody("""{"completed": true}""")
        }

        assertEquals(HttpStatusCode.OK, updateResponse.status)
        val responseBody = updateResponse.bodyAsText()
        val updatedItem = json.decodeFromString<ListItem>(responseBody)
        
        assertEquals("Original Text", updatedItem.text) // Should remain unchanged
        assertEquals(true, updatedItem.completed) // Should be updated
    }

    @Test
    fun `PUT api lists id items itemId should return 404 for non-existing item`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        val nonExistingItemId = UUID.randomUUID()
        val updateResponse = client.put("/api/lists/${createdList.id}/items/$nonExistingItemId") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Updated Text"}""")
        }

        assertEquals(HttpStatusCode.NotFound, updateResponse.status)
        val responseBody = updateResponse.bodyAsText()
        assertTrue(responseBody.contains("Item not found"))
    }

    @Test
    fun `DELETE api lists id items itemId should delete existing item`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list and add an item
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        val addItemResponse = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Test Item"}""")
        }
        val createdItem = json.decodeFromString<ListItem>(addItemResponse.bodyAsText())

        // Delete the item
        val deleteResponse = client.delete("/api/lists/${createdList.id}/items/${createdItem.id}")

        assertEquals(HttpStatusCode.NoContent, deleteResponse.status)

        // Verify item is deleted by trying to get the list
        val getListResponse = client.get("/api/lists/${createdList.id}")
        val updatedList = json.decodeFromString<ShoppingList>(getListResponse.bodyAsText())
        assertTrue(updatedList.items.isEmpty())
    }

    @Test
    fun `DELETE api lists id items itemId should return 404 for non-existing item`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        val nonExistingItemId = UUID.randomUUID()
        val deleteResponse = client.delete("/api/lists/${createdList.id}/items/$nonExistingItemId")

        assertEquals(HttpStatusCode.NotFound, deleteResponse.status)
        val responseBody = deleteResponse.bodyAsText()
        assertTrue(responseBody.contains("Item not found"))
    }

    @Test
    fun `POST api lists id clear-completed should clear completed items`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list and add items
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        // Add multiple items
        val item1Response = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Item 1"}""")
        }
        val item1 = json.decodeFromString<ListItem>(item1Response.bodyAsText())

        val item2Response = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Item 2"}""")
        }

        val item3Response = client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Item 3"}""")
        }
        val item3 = json.decodeFromString<ListItem>(item3Response.bodyAsText())

        // Mark some items as completed
        client.put("/api/lists/${createdList.id}/items/${item1.id}") {
            contentType(ContentType.Application.Json)
            setBody("""{"completed": true}""")
        }
        client.put("/api/lists/${createdList.id}/items/${item3.id}") {
            contentType(ContentType.Application.Json)
            setBody("""{"completed": true}""")
        }

        // Clear completed items
        val clearResponse = client.post("/api/lists/${createdList.id}/clear-completed")

        assertEquals(HttpStatusCode.OK, clearResponse.status)
        val responseBody = clearResponse.bodyAsText()
        assertTrue(responseBody.replace(" ", "").contains("\"deletedCount\":2"))

        // Verify only uncompleted items remain
        val getListResponse = client.get("/api/lists/${createdList.id}")
        val updatedList = json.decodeFromString<ShoppingList>(getListResponse.bodyAsText())
        assertEquals(1, updatedList.items.size)
        assertEquals("Item 2", updatedList.items[0].text)
    }

    @Test
    fun `POST api lists id clear-completed should return 404 for non-existing list`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val nonExistingId = UUID.randomUUID()
        val response = client.post("/api/lists/$nonExistingId/clear-completed")

        assertEquals(HttpStatusCode.NotFound, response.status)
        val responseBody = response.bodyAsText()
        assertTrue(responseBody.contains("Shopping list not found"))
    }

    @Test
    fun `API should handle malformed JSON requests`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        val response = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("invalid json")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `GET api lists id should return list with items`() = testApplication {
        application {
            configureSerialization()
            configureCORS()
            configureRouting()
        }

        // Create a list and add items
        val createResponse = client.post("/api/lists") {
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        val createdList = json.decodeFromString<ShoppingList>(createResponse.bodyAsText())

        // Add items
        client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Item 1"}""")
        }
        client.post("/api/lists/${createdList.id}/items") {
            contentType(ContentType.Application.Json)
            setBody("""{"text": "Item 2"}""")
        }

        // Get the list
        val getResponse = client.get("/api/lists/${createdList.id}")

        assertEquals(HttpStatusCode.OK, getResponse.status)
        val responseBody = getResponse.bodyAsText()
        val retrievedList = json.decodeFromString<ShoppingList>(responseBody)
        
        assertEquals(2, retrievedList.items.size)
        assertEquals("Item 1", retrievedList.items[0].text)
        assertEquals("Item 2", retrievedList.items[1].text)
    }
}