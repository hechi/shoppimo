package com.shoppinglist.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

object DatabaseFactory {
    
    fun init() {
        val database = Database.connect(createHikariDataSource())
        
        transaction(database) {
            SchemaUtils.createMissingTablesAndColumns(ShoppingLists, ListItems, PushSubscriptions)
        }
    }
    
    fun testConnection(): Boolean {
        return try {
            transaction {
                exec("SELECT 1") { rs ->
                    rs.next()
                }
            }
            true
        } catch (e: Exception) {
            throw e
        }
    }
    
    private fun createHikariDataSource(): HikariDataSource {
        val config = HikariConfig().apply {
            driverClassName = "org.postgresql.Driver"
            jdbcUrl = System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/shopping_lists"
            username = System.getenv("DATABASE_USER") ?: "shopping_user"
            password = System.getenv("DATABASE_PASSWORD") ?: "shopping_pass"
            maximumPoolSize = 10
            minimumIdle = 2
            idleTimeout = 300000
            connectionTimeout = 20000
            leakDetectionThreshold = 60000
            
            // PostgreSQL specific optimizations
            addDataSourceProperty("cachePrepStmts", "true")
            addDataSourceProperty("prepStmtCacheSize", "250")
            addDataSourceProperty("prepStmtCacheSqlLimit", "2048")
        }
        
        return HikariDataSource(config)
    }
}