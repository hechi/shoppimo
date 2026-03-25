package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.ListItem
import com.shoppinglist.models.ShoppingList
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

class ListRepositoryImpl : ListRepository {
    
    override suspend fun createList(id: UUID): ShoppingList = newSuspendedTransaction {
        val now = Instant.now().truncatedTo(ChronoUnit.MICROS)
        
        ShoppingLists.insert {
            it[ShoppingLists.id] = id
            it[createdAt] = now
            it[lastModified] = now
        }
        
        ShoppingList(
            id = id.toString(),
            items = emptyList(),
            createdAt = now.toString(),
            lastModified = now.toString()
        )
    }
    
    override suspend fun getListById(id: UUID): ShoppingList? = newSuspendedTransaction {
        val listRow = ShoppingLists.select { ShoppingLists.id eq id }.singleOrNull()
            ?: return@newSuspendedTransaction null
        
        val items = (ShoppingLists innerJoin ListItems)
            .select { ShoppingLists.id eq id }
            .orderBy(ListItems.itemOrder)
            .map { row ->
                ListItem(
                    id = row[ListItems.id].toString(),
                    text = row[ListItems.text],
                    completed = row[ListItems.completed],
                    createdAt = row[ListItems.createdAt].toString(),
                    order = row[ListItems.itemOrder]
                )
            }
        
        ShoppingList(
            id = listRow[ShoppingLists.id].toString(),
            items = items,
            createdAt = listRow[ShoppingLists.createdAt].toString(),
            lastModified = listRow[ShoppingLists.lastModified].toString()
        )
    }
    
    override suspend fun updateListModified(id: UUID): Boolean = newSuspendedTransaction {
        val updatedRows = ShoppingLists.update({ ShoppingLists.id eq id }) {
            it[lastModified] = Instant.now()
        }
        updatedRows > 0
    }
    
    override suspend fun deleteList(id: UUID): Boolean = newSuspendedTransaction {
        // Items will be deleted automatically due to CASCADE constraint
        val deletedRows = ShoppingLists.deleteWhere { ShoppingLists.id eq id }
        deletedRows > 0
    }
    
    override suspend fun listExists(id: UUID): Boolean = newSuspendedTransaction {
        ShoppingLists.select { ShoppingLists.id eq id }.count() > 0
    }
    
    override suspend fun getListWithExpiration(id: UUID): ShoppingList? = newSuspendedTransaction {
        val listRow = ShoppingLists.select { ShoppingLists.id eq id }.singleOrNull()
            ?: return@newSuspendedTransaction null
        
        val items = ListItems
            .select { ListItems.listId eq id }
            .orderBy(ListItems.itemOrder)
            .map { row ->
                ListItem(
                    id = row[ListItems.id].toString(),
                    text = row[ListItems.text],
                    completed = row[ListItems.completed],
                    createdAt = row[ListItems.createdAt].toString(),
                    order = row[ListItems.itemOrder]
                )
            }
        
        val retentionDays = System.getenv("LIST_RETENTION_DAYS")?.toLongOrNull() 
            ?: System.getProperty("LIST_RETENTION_DAYS")?.toLongOrNull() 
            ?: 30L
        val lastModified = listRow[ShoppingLists.lastModified]
        val expiresAt = lastModified.plus(retentionDays, ChronoUnit.DAYS)
        
        ShoppingList(
            id = listRow[ShoppingLists.id].toString(),
            items = items,
            createdAt = listRow[ShoppingLists.createdAt].toString(),
            lastModified = lastModified.toString(),
            expiresAt = expiresAt.toString()
        )
    }
}