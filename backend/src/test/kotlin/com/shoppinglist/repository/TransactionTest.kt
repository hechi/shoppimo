package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.supervisorScope
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.time.Instant
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TransactionTest {

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
    fun `transaction rollback should not persist changes on exception`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)

        // Attempt to insert items directly in a transaction that will fail
        try {
            supervisorScope {
                newSuspendedTransaction(db = database) {
                    val now = Instant.now()
                    ListItems.insert {
                        it[id] = UUID.randomUUID()
                        it[ListItems.listId] = listId
                        it[text] = "Item 1"
                        it[completed] = false
                        it[createdAt] = now
                        it[itemOrder] = 1
                    }
                    ListItems.insert {
                        it[id] = UUID.randomUUID()
                        it[ListItems.listId] = listId
                        it[text] = "Item 2"
                        it[completed] = false
                        it[createdAt] = now
                        it[itemOrder] = 2
                    }
                    // Force an exception to trigger rollback
                    throw RuntimeException("Simulated failure")
                }
            }
        } catch (e: RuntimeException) {
            // Expected exception
        }

        // Verify that no items were persisted due to rollback
        val items = itemRepository.getItemsByListId(listId)
        assertTrue(items.isEmpty())
    }

    @Test
    fun `successful transaction should persist all changes`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        // Create items in a successful transaction
        newSuspendedTransaction {
            itemRepository.createItem(listId, "Item 1")
            itemRepository.createItem(listId, "Item 2")
            itemRepository.createItem(listId, "Item 3")
        }
        
        // Verify that all items were persisted
        val items = itemRepository.getItemsByListId(listId)
        assertEquals(3, items.size)
    }

    @Test
    fun `partial transaction failure should rollback all operations`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)

        // Create one item successfully first (outside our test transaction)
        val existingItem = itemRepository.createItem(listId, "Existing Item")

        // Attempt to insert new items in a transaction that will fail
        try {
            supervisorScope {
                newSuspendedTransaction(db = database) {
                    val now = Instant.now()
                    ListItems.insert {
                        it[id] = UUID.randomUUID()
                        it[ListItems.listId] = listId
                        it[text] = "New Item 1"
                        it[completed] = false
                        it[createdAt] = now
                        it[itemOrder] = 2
                    }
                    ListItems.insert {
                        it[id] = UUID.randomUUID()
                        it[ListItems.listId] = listId
                        it[text] = "New Item 2"
                        it[completed] = false
                        it[createdAt] = now
                        it[itemOrder] = 3
                    }
                    // Force an exception to trigger rollback
                    throw RuntimeException("Transaction failure")
                }
            }
        } catch (e: RuntimeException) {
            // Expected exception
        }

        // Verify that only the original item exists
        val items = itemRepository.getItemsByListId(listId)
        assertEquals(1, items.size)
        assertEquals("Existing Item", items[0].text)
    }

    @Test
    fun `concurrent operations should maintain data consistency`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        // Create an item
        val item = itemRepository.createItem(listId, "Test Item")
        
        // Simulate concurrent updates in separate transactions
        newSuspendedTransaction {
            itemRepository.updateItem(UUID.fromString(item.id), "Updated Text", null)
        }
        
        newSuspendedTransaction {
            itemRepository.updateItem(UUID.fromString(item.id), null, true)
        }
        
        // Verify final state
        val updatedItem = itemRepository.getItemById(UUID.fromString(item.id))
        assertEquals("Updated Text", updatedItem?.text)
        assertEquals(true, updatedItem?.completed)
    }
}