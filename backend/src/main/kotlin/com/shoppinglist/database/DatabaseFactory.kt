package com.shoppinglist.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import javax.sql.DataSource

object DatabaseFactory {

    fun init() {
        val dataSource = createHikariDataSource()
        migrate(dataSource)
        Database.connect(dataSource)
    }

    /**
     * Applies the SQL migrations from `src/main/resources/db/migration`.
     * Public so tests can build the schema the same way the application does.
     */
    fun migrate(dataSource: DataSource) {
        Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            // Databases created before Flyway was introduced have tables but no history table.
            // Baseline them at version 0 so that V1 (idempotent) still runs and brings them up to date.
            .baselineOnMigrate(true)
            .baselineVersion("0")
            .load()
            .migrate()
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
