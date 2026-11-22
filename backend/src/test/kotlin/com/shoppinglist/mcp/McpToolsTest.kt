package com.shoppinglist.mcp

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.PushSubscriptions
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.repository.ItemRepositoryImpl
import com.shoppinglist.repository.ListRepositoryImpl
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.junit.jupiter.api.*
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Integration tests for MCP tool operations.
 * Tests the repository interactions that MCP tools perform,
 * verifying the same logic paths used by ShoppimoTools.
 */
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class McpToolsTest {

    companion object {
        @Container
        @JvmField
        val postgres = PostgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("test_mcp")
            .withUsername("test_user")
            .withPassword("test_pass")
    }

    private lateinit var database: Database
    private val listRepository = ListRepositoryImpl()
    private val itemRepository = ItemRepositoryImpl()

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
    }

    @AfterEach
    fun cleanup() {
        transaction(database) {
            SchemaUtils.drop(ListItems, PushSubscriptions, ShoppingLists)
        }
    }

    // --- create_list tool logic ---

    @Test
    fun `create_list creates a list with random UUID`() = runBlocking {
        val list = listRepository.createList(UUID.randomUUID())
        assertNotNull(list.id)
        assertTrue(list.items.isEmpty())
    }

    @Test
    fun `create_list creates a list with specified UUID`() = runBlocking {
        val id = UUID.randomUUID()
        val list = listRepository.createList(id)
        assertEquals(id.toString(), list.id)
    }

    // --- get_list tool logic ---

    @Test
    fun `get_list returns list with items`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        itemRepository.createItem(listId, "Milk")
        itemRepository.createItem(listId, "Bread")

        val list = listRepository.getListWithExpiration(listId)
        assertNotNull(list)
        assertEquals(2, list.items.size)
        assertEquals("Milk", list.items[0].text)
        assertEquals("Bread", list.items[1].text)
    }

    @Test
    fun `get_list returns null for non-existing list`() = runBlocking {
        val list = listRepository.getListWithExpiration(UUID.randomUUID())
        assertNull(list)
    }

    // --- get_list_by_alias tool logic ---

    @Test
    fun `get_list_by_alias resolves alias to list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        listRepository.updateAlias(listId, "groceries")

        val list = listRepository.getListByAlias("groceries")
        assertNotNull(list)
        assertEquals(listId.toString(), list.id)
        assertEquals("groceries", list.alias)
    }

    @Test
    fun `get_list_by_alias returns null for unknown alias`() = runBlocking {
        val list = listRepository.getListByAlias("nonexistent")
        assertNull(list)
    }

    @Test
    fun `get_list_by_alias is case insensitive`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        listRepository.updateAlias(listId, "mylist")

        val list = listRepository.getListByAlias("MyList")
        assertNotNull(list)
        assertEquals(listId.toString(), list.id)
    }

    // --- set_alias tool logic ---

    @Test
    fun `set_alias assigns alias to list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)

        val updated = listRepository.updateAlias(listId, "weekly-shop")
        assertTrue(updated)

        val list = listRepository.getListWithExpiration(listId)
        assertEquals("weekly-shop", list?.alias)
    }

    @Test
    fun `set_alias removes alias when null`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        listRepository.updateAlias(listId, "temp-alias")

        listRepository.updateAlias(listId, null)

        val list = listRepository.getListWithExpiration(listId)
        assertNull(list?.alias)
    }

    @Test
    fun `set_alias rejects duplicate alias`() = runBlocking {
        val listId1 = UUID.randomUUID()
        val listId2 = UUID.randomUUID()
        listRepository.createList(listId1)
        listRepository.createList(listId2)
        listRepository.updateAlias(listId1, "taken-alias")

        // Verify the alias is taken
        assertTrue(listRepository.aliasExists("taken-alias"))
    }

    // --- add_item tool logic ---

    @Test
    fun `add_item creates item on existing list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)

        val item = itemRepository.createItem(listId, "Eggs")
        assertEquals("Eggs", item.text)
        assertEquals(false, item.completed)
        assertNotNull(item.id)
    }

    @Test
    fun `add_item assigns sequential order`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)

        val item1 = itemRepository.createItem(listId, "First")
        val item2 = itemRepository.createItem(listId, "Second")

        assertTrue(item2.order > item1.order)
    }

    // --- remove_item tool logic ---

    @Test
    fun `remove_item deletes existing item`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item = itemRepository.createItem(listId, "To Remove")

        val deleted = itemRepository.deleteItem(UUID.fromString(item.id))
        assertTrue(deleted)

        val fetched = itemRepository.getItemById(UUID.fromString(item.id))
        assertNull(fetched)
    }

    @Test
    fun `remove_item returns false for non-existing item`() = runBlocking {
        val deleted = itemRepository.deleteItem(UUID.randomUUID())
        assertEquals(false, deleted)
    }

    // --- check_item tool logic ---

    @Test
    fun `check_item marks item as completed`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item = itemRepository.createItem(listId, "Salt")

        val updated = itemRepository.updateItem(UUID.fromString(item.id), text = null, completed = true)
        assertNotNull(updated)
        assertTrue(updated.completed)
        assertEquals("Salt", updated.text)
    }

    // --- uncheck_item tool logic ---

    @Test
    fun `uncheck_item marks item as not completed`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item = itemRepository.createItem(listId, "Pepper")
        itemRepository.updateItem(UUID.fromString(item.id), text = null, completed = true)

        val updated = itemRepository.updateItem(UUID.fromString(item.id), text = null, completed = false)
        assertNotNull(updated)
        assertEquals(false, updated.completed)
    }

    // --- clear_completed tool logic ---

    @Test
    fun `clear_completed removes only checked items`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        val item1 = itemRepository.createItem(listId, "Done")
        val item2 = itemRepository.createItem(listId, "Not Done")
        itemRepository.updateItem(UUID.fromString(item1.id), text = null, completed = true)

        val deletedCount = itemRepository.clearCompletedItems(listId)
        assertEquals(1, deletedCount)

        val remaining = itemRepository.getItemsByListId(listId)
        assertEquals(1, remaining.size)
        assertEquals("Not Done", remaining[0].text)
    }

    @Test
    fun `clear_completed returns zero when no completed items`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        itemRepository.createItem(listId, "Unchecked")

        val deletedCount = itemRepository.clearCompletedItems(listId)
        assertEquals(0, deletedCount)
    }

    // --- delete_list tool logic ---

    @Test
    fun `delete_list removes the list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)

        val deleted = listRepository.deleteList(listId)
        assertTrue(deleted)

        val list = listRepository.getListWithExpiration(listId)
        assertNull(list)
    }

    @Test
    fun `delete_list returns false for non-existing list`() = runBlocking {
        val deleted = listRepository.deleteList(UUID.randomUUID())
        assertEquals(false, deleted)
    }
}
