package com.shoppinglist.service

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.repository.ItemRepositoryImpl
import com.shoppinglist.repository.ListRepositoryImpl
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CleanupServiceTest {
    
    companion object {
        @Container
        @JvmField
        val postgres = PostgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("test_cleanup")
            .withUsername("test_user")
            .withPassword("test_pass")
    }

    private lateinit var database: Database
    private lateinit var cleanupService: CleanupService
    private lateinit var listRepository: ListRepositoryImpl
    private lateinit var itemRepository: ItemRepositoryImpl
    
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
        
        // Create cleanup service with 7 days retention for testing
        cleanupService = CleanupService(retentionDays = 7L)
        listRepository = ListRepositoryImpl()
        itemRepository = ItemRepositoryImpl()
    }
    
    @AfterEach
    fun cleanup() {
        transaction(database) {
            SchemaUtils.drop(ListItems, ShoppingLists)
        }
        // No cleanup needed for constructor parameter approach
    }
    
    @Test
    fun `performCleanup should delete expired lists`() = runBlocking {
        // Create a list
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        // Add an item to the list
        itemRepository.createItem(listId, "Test item")
        
        // Manually set the lastModified to 10 days ago (older than 7 days retention)
        val tenDaysAgo = Instant.now().minus(10, ChronoUnit.DAYS)
        transaction(database) {
            ShoppingLists.update({ ShoppingLists.id eq listId }) {
                it[lastModified] = tenDaysAgo
            }
        }
        
        // Verify list exists before cleanup
        assertNotNull(listRepository.getListById(listId))
        
        // Perform cleanup
        val deletedCount = cleanupService.performCleanup()
        
        // Verify list was deleted
        assertEquals(1, deletedCount)
        assertNull(listRepository.getListById(listId))
    }
    
    @Test
    fun `performCleanup should not delete recent lists`() = runBlocking {
        // Create a list
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        // Add an item to the list
        itemRepository.createItem(listId, "Test item")
        
        // Manually set the lastModified to 3 days ago (newer than 7 days retention)
        val threeDaysAgo = Instant.now().minus(3, ChronoUnit.DAYS)
        transaction(database) {
            ShoppingLists.update({ ShoppingLists.id eq listId }) {
                it[lastModified] = threeDaysAgo
            }
        }
        
        // Verify list exists before cleanup
        assertNotNull(listRepository.getListById(listId))
        
        // Perform cleanup
        val deletedCount = cleanupService.performCleanup()
        
        // Verify list was not deleted
        assertEquals(0, deletedCount)
        assertNotNull(listRepository.getListById(listId))
    }
    
    @Test
    fun `performCleanup should handle empty database`() = runBlocking {
        // Perform cleanup on empty database
        val deletedCount = cleanupService.performCleanup()
        
        // Should not crash and return 0
        assertEquals(0, deletedCount)
    }
    
    @Test
    fun `performCleanup should delete multiple expired lists`() = runBlocking {
        // Create multiple lists
        val listId1 = UUID.randomUUID()
        val listId2 = UUID.randomUUID()
        val listId3 = UUID.randomUUID()
        
        listRepository.createList(listId1)
        listRepository.createList(listId2)
        listRepository.createList(listId3)
        
        // Set two lists as expired (10 days ago)
        val tenDaysAgo = Instant.now().minus(10, ChronoUnit.DAYS)
        transaction(database) {
            ShoppingLists.update({ ShoppingLists.id eq listId1 }) {
                it[lastModified] = tenDaysAgo
            }
            ShoppingLists.update({ ShoppingLists.id eq listId2 }) {
                it[lastModified] = tenDaysAgo
            }
        }
        
        // Keep one list recent (3 days ago)
        val threeDaysAgo = Instant.now().minus(3, ChronoUnit.DAYS)
        transaction(database) {
            ShoppingLists.update({ ShoppingLists.id eq listId3 }) {
                it[lastModified] = threeDaysAgo
            }
        }
        
        // Perform cleanup
        val deletedCount = cleanupService.performCleanup()
        
        // Verify only expired lists were deleted
        assertEquals(2, deletedCount)
        assertNull(listRepository.getListById(listId1))
        assertNull(listRepository.getListById(listId2))
        assertNotNull(listRepository.getListById(listId3))
    }
    
    @Test
    fun `getRetentionDays should return configured value`() {
        // Should return the value we set in setup (7 days)
        assertEquals(7L, cleanupService.getRetentionDays())
    }
    
    @Test
    fun `getListExpirationDate should return correct expiration date`() = runBlocking {
        // Create a list
        val listId = UUID.randomUUID()
        listRepository.createList(listId)
        
        // Set lastModified to a specific time
        val specificTime = Instant.now().minus(2, ChronoUnit.DAYS)
        transaction(database) {
            ShoppingLists.update({ ShoppingLists.id eq listId }) {
                it[lastModified] = specificTime
            }
        }
        
        // Get expiration date
        val expirationDate = cleanupService.getListExpirationDate(listId)
        
        // Should be 7 days after lastModified (5 days from now)
        assertNotNull(expirationDate)
        val expectedExpiration = specificTime.plus(7, ChronoUnit.DAYS)
        // Compare timestamps with some tolerance for precision differences
        val timeDifference = kotlin.math.abs(expectedExpiration.epochSecond - expirationDate.epochSecond)
        assert(timeDifference <= 1) { "Expected $expectedExpiration but got $expirationDate" }
    }
    
    @Test
    fun `getListExpirationDate should return null for non-existing list`() = runBlocking {
        val nonExistingId = UUID.randomUUID()
        val expirationDate = cleanupService.getListExpirationDate(nonExistingId)
        assertNull(expirationDate)
    }
}