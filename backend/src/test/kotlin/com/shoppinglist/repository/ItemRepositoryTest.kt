package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import kotlinx.coroutines.runBlocking
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
import kotlin.test.assertNull
import kotlin.test.assertTrue

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ItemRepositoryTest {

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
    private lateinit var itemRepository: ItemRepository

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
        
        listRepository = ListRepositoryImpl()
        itemRepository = ItemRepositoryImpl()
    }

    @AfterEach
    fun cleanup() {
        transaction(database) {
            SchemaUtils.drop(ListItems, ShoppingLists)
        }
    }

    @Test
    fun `createItem should add new item to list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val item = itemRepository.createItem(listId, "Test Item")
        
        assertNotNull(item.id)
        assertEquals("Test Item", item.text)
        assertEquals(false, item.completed)
        assertEquals(1, item.order)
        assertNotNull(item.createdAt)
    }

    @Test
    fun `getItemById should return existing item`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val createdItem = itemRepository.createItem(listId, "Test Item")
        
        val retrievedItem = itemRepository.getItemById(UUID.fromString(createdItem.id))
        
        assertNotNull(retrievedItem)
        assertEquals(createdItem.id, retrievedItem.id)
        assertEquals("Test Item", retrievedItem.text)
    }

    @Test
    fun `getItemById should return null for non-existing item`() = runBlocking {
        val nonExistingId = UUID.randomUUID()
        
        val retrievedItem = itemRepository.getItemById(nonExistingId)
        
        assertNull(retrievedItem)
    }

    @Test
    fun `getItemsByListId should return all items for list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        itemRepository.createItem(listId, "Item 1")
        itemRepository.createItem(listId, "Item 2")
        itemRepository.createItem(listId, "Item 3")
        
        val items = itemRepository.getItemsByListId(listId)
        
        assertEquals(3, items.size)
        assertEquals("Item 1", items[0].text)
        assertEquals("Item 2", items[1].text)
        assertEquals("Item 3", items[2].text)
    }

    @Test
    fun `updateItem should modify item text and completion status`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item = itemRepository.createItem(listId, "Original Text")
        
        val updatedItem = itemRepository.updateItem(
            UUID.fromString(item.id),
            "Updated Text",
            true
        )
        
        assertNotNull(updatedItem)
        assertEquals("Updated Text", updatedItem.text)
        assertEquals(true, updatedItem.completed)
    }

    @Test
    fun `updateItem should update only specified fields`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item = itemRepository.createItem(listId, "Original Text")
        
        val updatedItem = itemRepository.updateItem(
            UUID.fromString(item.id),
            null,
            true
        )
        
        assertNotNull(updatedItem)
        assertEquals("Original Text", updatedItem.text) // Should remain unchanged
        assertEquals(true, updatedItem.completed) // Should be updated
    }

    @Test
    fun `deleteItem should remove item from list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item = itemRepository.createItem(listId, "Test Item")
        
        val deleted = itemRepository.deleteItem(UUID.fromString(item.id))
        val retrievedItem = itemRepository.getItemById(UUID.fromString(item.id))
        
        assertTrue(deleted)
        assertNull(retrievedItem)
    }

    @Test
    fun `clearCompletedItems should remove only completed items`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val item1 = itemRepository.createItem(listId, "Item 1")
        val item2 = itemRepository.createItem(listId, "Item 2")
        val item3 = itemRepository.createItem(listId, "Item 3")
        
        // Mark some items as completed
        itemRepository.updateItem(UUID.fromString(item1.id), null, true)
        itemRepository.updateItem(UUID.fromString(item3.id), null, true)
        
        val clearedCount = itemRepository.clearCompletedItems(listId)
        val remainingItems = itemRepository.getItemsByListId(listId)
        
        assertEquals(2, clearedCount)
        assertEquals(1, remainingItems.size)
        assertEquals("Item 2", remainingItems[0].text)
    }

    @Test
    fun `getNextOrderForList should return correct order number`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val firstOrder = itemRepository.getNextOrderForList(listId)
        assertEquals(1, firstOrder)
        
        itemRepository.createItem(listId, "Item 1")
        val secondOrder = itemRepository.getNextOrderForList(listId)
        assertEquals(2, secondOrder)
        
        itemRepository.createItem(listId, "Item 2")
        val thirdOrder = itemRepository.getNextOrderForList(listId)
        assertEquals(3, thirdOrder)
    }
}