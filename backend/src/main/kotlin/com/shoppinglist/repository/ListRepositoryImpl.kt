package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.PushSubscriptions
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.ListItem
import com.shoppinglist.models.ShoppingList
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.jetbrains.exposed.v1.core.eq
import com.shoppinglist.database.dbQuery
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

class ListRepositoryImpl : ListRepository {
    
    override suspend fun createList(id: UUID): ShoppingList = dbQuery {
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
    
    override suspend fun getListById(id: UUID): ShoppingList? = dbQuery {
        val listRow = ShoppingLists.selectAll().where { ShoppingLists.id eq id }.singleOrNull()
            ?: return@dbQuery null
        
        val items = (ShoppingLists innerJoin ListItems)
            .selectAll().where { ShoppingLists.id eq id }
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
            lastModified = listRow[ShoppingLists.lastModified].toString(),
            alias = listRow[ShoppingLists.alias]
        )
    }
    
    override suspend fun updateListModified(id: UUID): Boolean = dbQuery {
        val updatedRows = ShoppingLists.update({ ShoppingLists.id eq id }) {
            it[lastModified] = Instant.now()
        }
        updatedRows > 0
    }
    
    override suspend fun deleteList(id: UUID): Boolean = dbQuery {
        // The foreign keys have no ON DELETE CASCADE, so remove dependent rows first
        ListItems.deleteWhere { ListItems.listId eq id }
        PushSubscriptions.deleteWhere { PushSubscriptions.listId eq id }
        val deletedRows = ShoppingLists.deleteWhere { ShoppingLists.id eq id }
        deletedRows > 0
    }
    
    override suspend fun listExists(id: UUID): Boolean = dbQuery {
        ShoppingLists.selectAll().where { ShoppingLists.id eq id }.count() > 0
    }
    
    override suspend fun getListWithExpiration(id: UUID): ShoppingList? = dbQuery {
        val listRow = ShoppingLists.selectAll().where { ShoppingLists.id eq id }.singleOrNull()
            ?: return@dbQuery null
        
        val items = ListItems
            .selectAll().where { ListItems.listId eq id }
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
            expiresAt = expiresAt.toString(),
            alias = listRow[ShoppingLists.alias]
        )
    }
    
    override suspend fun getListByAlias(alias: String): ShoppingList? = dbQuery {
        val normalizedAlias = alias.trim().lowercase()
        
        val listRow = ShoppingLists.selectAll().where { ShoppingLists.alias eq normalizedAlias }.singleOrNull()
            ?: return@dbQuery null
        
        val listId = listRow[ShoppingLists.id].value
        
        val items = ListItems
            .selectAll().where { ListItems.listId eq listId }
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
            expiresAt = expiresAt.toString(),
            alias = listRow[ShoppingLists.alias]
        )
    }
    
    override suspend fun updateAlias(id: UUID, alias: String?): Boolean = dbQuery {
        val normalizedAlias = alias?.trim()?.lowercase()
        
        val updatedRows = ShoppingLists.update({ ShoppingLists.id eq id }) {
            it[ShoppingLists.alias] = normalizedAlias
        }
        updatedRows > 0
    }
    
    override suspend fun aliasExists(alias: String): Boolean = dbQuery {
        val normalizedAlias = alias.trim().lowercase()
        ShoppingLists.selectAll().where { ShoppingLists.alias eq normalizedAlias }.count() > 0
    }
}
