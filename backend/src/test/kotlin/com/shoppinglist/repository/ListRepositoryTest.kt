package com.shoppinglist.repository

import com.shoppinglist.database.DatabaseFactory
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
import kotlin.test.assertFalse

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ListRepositoryTest {

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
    }

    @AfterEach
    fun cleanup() {
        transaction(database) {
            SchemaUtils.drop(ListItems, ShoppingLists)
        }
    }

    @Test
    fun `createList should create a new shopping list`() = runBlocking {
        val listId = UUID.randomUUID()
        
        val createdList = listRepository.createList(listId)
        
        assertEquals(listId.toString(), createdList.id)
        assertTrue(createdList.items.isEmpty())
        assertNotNull(createdList.createdAt)
        assertNotNull(createdList.lastModified)
    }

    @Test
    fun `getListById should return existing list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val retrievedList = listRepository.getListById(listId)
        
        assertNotNull(retrievedList)
        assertEquals(listId.toString(), retrievedList.id)
    }

    @Test
    fun `getListById should return null for non-existing list`() = runBlocking {
        val nonExistingId = UUID.randomUUID()
        
        val retrievedList = listRepository.getListById(nonExistingId)
        
        assertNull(retrievedList)
    }

    @Test
    fun `listExists should return true for existing list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val exists = listRepository.listExists(listId)
        
        assertTrue(exists)
    }

    @Test
    fun `listExists should return false for non-existing list`() = runBlocking {
        val nonExistingId = UUID.randomUUID()
        
        val exists = listRepository.listExists(nonExistingId)
        
        assertTrue(!exists)
    }

    @Test
    fun `updateListModified should update lastModified timestamp`() = runBlocking {
        val listId = UUID.randomUUID()
        val originalList = listRepository.createList(listId)
        
        // Wait a bit to ensure timestamp difference
        Thread.sleep(10)
        
        val updated = listRepository.updateListModified(listId)
        val updatedList = listRepository.getListById(listId)
        
        assertTrue(updated)
        assertNotNull(updatedList)
        assertTrue(updatedList.lastModified != originalList.lastModified)
    }

    @Test
    fun `deleteList should remove the list`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val deleted = listRepository.deleteList(listId)
        val retrievedList = listRepository.getListById(listId)
        
        assertTrue(deleted)
        assertNull(retrievedList)
    }

    @Test
    fun `getListByAlias should return list with matching alias`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        listRepository.updateAlias(listId, "test-alias")
        
        val retrievedList = listRepository.getListByAlias("test-alias")
        
        assertNotNull(retrievedList)
        assertEquals(listId.toString(), retrievedList.id)
        assertEquals("test-alias", retrievedList.alias)
    }

    @Test
    fun `getListByAlias should return null for non-existing alias`() = runBlocking {
        val retrievedList = listRepository.getListByAlias("nonexistent")
        
        assertNull(retrievedList)
    }

    @Test
    fun `updateAlias should set and clear alias`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        val setResult = listRepository.updateAlias(listId, "my-alias")
        assertTrue(setResult)
        
        val listWithAlias = listRepository.getListById(listId)
        assertNotNull(listWithAlias)
        assertEquals("my-alias", listWithAlias.alias)
        
        val clearResult = listRepository.updateAlias(listId, null)
        assertTrue(clearResult)
        
        val listWithoutAlias = listRepository.getListById(listId)
        assertNotNull(listWithoutAlias)
        assertNull(listWithoutAlias.alias)
    }

    @Test
    fun `aliasExists should return true for existing alias`() = runBlocking {
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        listRepository.updateAlias(listId, "existing-alias")
        
        assertTrue(listRepository.aliasExists("existing-alias"))
        assertFalse(listRepository.aliasExists("nonexistent-alias"))
    }
}