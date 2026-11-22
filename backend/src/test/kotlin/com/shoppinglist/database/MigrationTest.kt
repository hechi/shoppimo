package com.shoppinglist.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MigrationTest {

    companion object {
        @Container
        @JvmField
        val postgres = PostgreSQLContainer("postgres:15-alpine")
            .withDatabaseName("test_migration")
            .withUsername("test_user")
            .withPassword("test_pass")
    }

    private lateinit var dataSource: HikariDataSource
    private lateinit var database: Database

    @BeforeEach
    fun setup() {
        dataSource = HikariDataSource(HikariConfig().apply {
            jdbcUrl = postgres.jdbcUrl
            username = postgres.username
            password = postgres.password
            maximumPoolSize = 2
        })
        database = Database.connect(dataSource)
        dropEverything()
    }

    @AfterEach
    fun cleanup() {
        dropEverything()
        dataSource.close()
    }

    private fun dropEverything() {
        transaction(database) {
            exec("DROP SCHEMA public CASCADE")
            exec("CREATE SCHEMA public")
        }
    }

    private fun tableNames(): Set<String> = transaction(database) {
        exec("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'") { rs ->
            buildSet { while (rs.next()) add(rs.getString(1)) }
        } ?: emptySet()
    }

    /** Statements that would be needed to create missing tables or columns. */
    @Suppress("DEPRECATION")
    private fun missingStructure(): List<String> = transaction(database) {
        SchemaUtils.statementsRequiredToActualizeScheme(ShoppingLists, ListItems, PushSubscriptions)
            .filter { it.startsWith("CREATE TABLE", ignoreCase = true) || it.contains("ADD COLUMN", ignoreCase = true) }
    }

    @Test
    fun `migrations create the schema on an empty database`() {
        DatabaseFactory.migrate(dataSource)

        val tables = tableNames()
        assertTrue(tables.containsAll(setOf("shopping_lists", "list_items", "push_subscriptions")), "Tables: $tables")
        assertEquals(emptyList(), missingStructure())
    }

    @Test
    fun `migrations are safe on a database created by Exposed`() {
        transaction(database) {
            SchemaUtils.create(ShoppingLists, ListItems, PushSubscriptions)
        }

        DatabaseFactory.migrate(dataSource)

        assertEquals(emptyList(), missingStructure())
    }

    @Test
    fun `migrations add columns that an older schema lacked`() {
        transaction(database) {
            SchemaUtils.create(ShoppingLists, ListItems, PushSubscriptions)
            exec("ALTER TABLE shopping_lists DROP COLUMN alias")
            exec("ALTER TABLE push_subscriptions DROP COLUMN consecutive_failures")
        }

        DatabaseFactory.migrate(dataSource)

        assertEquals(emptyList(), missingStructure())
    }

    @Test
    fun `running migrations twice changes nothing`() {
        DatabaseFactory.migrate(dataSource)
        DatabaseFactory.migrate(dataSource)

        assertEquals(emptyList(), missingStructure())
    }
}
