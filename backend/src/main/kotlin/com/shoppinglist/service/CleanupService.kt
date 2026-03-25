package com.shoppinglist.service

import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.database.ListItems
import kotlinx.coroutines.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*
import kotlin.time.Duration.Companion.hours

class CleanupService(private val retentionDays: Long? = null) {
    private val logger = LoggerFactory.getLogger(CleanupService::class.java)
    private var cleanupJob: Job? = null
    
    // Default to 30 days, configurable via environment variable or constructor parameter
    private val actualRetentionDays = retentionDays 
        ?: System.getenv("LIST_RETENTION_DAYS")?.toLongOrNull() 
        ?: System.getProperty("LIST_RETENTION_DAYS")?.toLongOrNull() 
        ?: 30L
    
    // Run cleanup every 24 hours
    private val cleanupInterval = 24.hours
    
    fun startCleanupScheduler() {
        logger.info("Starting cleanup scheduler with retention period of $actualRetentionDays days")
        
        cleanupJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                try {
                    performCleanup()
                } catch (e: Exception) {
                    logger.error("Error during cleanup", e)
                }
                
                delay(cleanupInterval)
            }
        }
    }
    
    fun stopCleanupScheduler() {
        cleanupJob?.cancel()
        logger.info("Cleanup scheduler stopped")
    }
    
    suspend fun performCleanup(): Int {
        val cutoffTime = Instant.now().minus(actualRetentionDays, ChronoUnit.DAYS)
        logger.info("Performing cleanup for lists older than $cutoffTime")
        
        return newSuspendedTransaction {
            // Find lists that haven't been modified for the retention period
            val expiredLists = ShoppingLists
                .select { ShoppingLists.lastModified less cutoffTime }
                .map { it[ShoppingLists.id] }
            
            if (expiredLists.isEmpty()) {
                logger.info("No expired lists found")
                return@newSuspendedTransaction 0
            }
            
            logger.info("Found ${expiredLists.size} expired lists to clean up")
            
            // Delete items first (due to foreign key constraints)
            for (listId in expiredLists) {
                ListItems.deleteWhere { ListItems.listId eq listId }
            }
            
            // Delete the lists
            var deletedCount = 0
            for (listId in expiredLists) {
                deletedCount += ShoppingLists.deleteWhere { ShoppingLists.id eq listId }
            }
            
            logger.info("Cleaned up $deletedCount expired lists")
            deletedCount
        }
    }
    
    suspend fun getListExpirationDate(listId: UUID): Instant? {
        return newSuspendedTransaction {
            ShoppingLists
                .select { ShoppingLists.id eq listId }
                .singleOrNull()
                ?.let { row ->
                    val lastModified = row[ShoppingLists.lastModified]
                    lastModified.plus(actualRetentionDays, ChronoUnit.DAYS)
                }
        }
    }
    
    fun getRetentionDays(): Long = actualRetentionDays
}